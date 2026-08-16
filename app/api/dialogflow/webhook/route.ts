import { ALLOWED_DIFFICULTIES, MISTAKE_TYPES, type AIDifficulty, type MistakeType } from "@/lib/ai/config";
import { analyzeMistake, createSimilarQuestion, explainRule, feedbackAnswer } from "@/lib/ai/spelling-ai";
import { backendStateContext, buildDialogflowResponse } from "@/lib/dialogflow/response";
import { getQuestionDefinition } from "@/lib/dialogflow/answer-validator";
import { parseDialogflowRequest, normalizeDialogflowEvent, type NormalizedDialogflowEvent } from "@/lib/dialogflow/webhook";
import {
  completeWeekEvent, getLeaderboard, getStudentBadges, getStudentProgress, recordAnswerEvent, recordHintEvent,
} from "@/lib/gamification/service";
import { safeBoolean, safeInteger } from "@/lib/security/input";

export const runtime = "nodejs";

function respond(event: NormalizedDialogflowEvent | null, text: string, payload: Record<string, unknown>, contextUpdates: Parameters<typeof buildDialogflowResponse>[0]["contextUpdates"] = []) {
  return Response.json(buildDialogflowResponse({
    text,
    payload,
    existingContexts: event?.outputContexts,
    contextUpdates,
  }));
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20);
  return typeof value === "string" ? value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 20) : [];
}

function aiDifficulty(value: unknown): AIDifficulty {
  return ALLOWED_DIFFICULTIES.includes(value as AIDifficulty) ? value as AIDifficulty : "basic";
}

function mistakeType(value: unknown): MistakeType | undefined {
  return MISTAKE_TYPES.includes(value as MistakeType) ? value as MistakeType : undefined;
}

function verifyWebhookSecret(request: Request): boolean {
  const expected = process.env.DIALOGFLOW_WEBHOOK_SECRET?.trim();
  return !expected || request.headers.get("x-dialogflow-webhook-secret") === expected;
}

function diagnosticId(value: string) {
  return value.length > 10 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;
}

function answerText(event: NormalizedDialogflowEvent, xpEarned: number, totalXP: number, level: number, duplicate: boolean) {
  if (duplicate) return "Kết quả này đã được ghi nhận trước đó nên XP không bị cộng lại.";
  if (!event.correct) return "Chưa đúng rồi 🌱 Em nhìn lại quy tắc hoặc xin gợi ý rồi thử lại nhé.";
  const opening = event.attempt > 1 ? "✨ Em sửa đúng rồi!" : "🎯 Chính xác!";
  return `${opening} +${xpEarned} XP\nEm đang có ${totalXP} XP, Level ${level}.`;
}

function supportRecommended(event: NormalizedDialogflowEvent, mastery: number) {
  return !event.correct || event.hintLevel >= 2 || event.attempt >= 3 || mastery < 65;
}

function activeQuestionPrompt(event: NormalizedDialogflowEvent): string {
  const technicalPayload = event.metadata.payload && typeof event.metadata.payload === "object"
    ? event.metadata.payload as Record<string, unknown> : {};
  const nextQuestion = technicalPayload.nextQuestion && typeof technicalPayload.nextQuestion === "object"
    ? technicalPayload.nextQuestion as Record<string, unknown> : {};
  if (typeof nextQuestion.prompt === "string" && nextQuestion.prompt.trim()) return nextQuestion.prompt.trim();
  for (const context of event.outputContexts) {
    if (typeof context.name !== "string" || !context.name.endsWith(`/contexts/week${String(event.week).padStart(2, "0")}_active`)) continue;
    const questionId = typeof context.parameters?.questionId === "string" ? context.parameters.questionId : "";
    const prompt = typeof context.parameters?.prompt === "string" ? context.parameters.prompt : "";
    if (questionId && questionId !== event.questionId && prompt && !prompt.startsWith("#")) return prompt;
  }
  return "";
}

function gamePayload(event: NormalizedDialogflowEvent, game: Awaited<ReturnType<typeof recordAnswerEvent>>) {
  return {
    studentCode: event.studentId,
    week: game.week ?? event.week,
    questionId: event.questionId,
    topic: event.topic,
    xpEarned: game.xpEarned,
    weekXP: game.weekXP,
    totalXP: game.totalXP,
    level: game.level,
    mastery: game.mastery,
    streak: game.streak,
    correctCount: game.correctCount,
    wrongCount: game.wrongCount,
    hintsUsed: game.hintsUsed,
    score: game.score,
    newBadges: game.newBadges,
    duplicate: game.duplicate,
  };
}

function rejectedCorrectContexts(event: NormalizedDialogflowEvent) {
  if (event.metadata.intentResult !== "correct") return [];
  const question = getQuestionDefinition(event.questionId);
  if (!question) return [];
  const prefix = `${event.sessionPath}/contexts/`;
  const weekPrefix = `week${String(event.week).padStart(2, "0")}`;
  const currentSuffix = event.questionId.includes("_SUPPORT_")
    ? `${weekPrefix}_basic_support_q${event.questionId.slice(-2).toLowerCase()}`
    : `${weekPrefix}_question${event.questionId.slice(-2).toLowerCase()}`;
  const removals = event.outputContexts
    .filter((context) => typeof context.name === "string"
      && (/\/contexts\/week\d{2}_question\d{2}$/i.test(context.name)
        || /\/contexts\/week\d{2}_basic_support_q\d{2}$/i.test(context.name)
        || /\/contexts\/week\d{2}_complete$/i.test(context.name)))
    .map((context) => ({ name: context.name as string, lifespanCount: 0 }));
  return [...removals, {
    name: `${prefix}${weekPrefix}_active`, lifespanCount: 99,
    parameters: {
      questionId: question.questionId, prompt: question.prompt, correctAnswer: question.correctAnswer,
      hint1Text: question.hint1, hint2Text: question.hint2, hint3Text: question.hint3,
      attempt: Math.min(20, event.attempt + 1), hintLevel: event.hintLevel,
      wrongCount: safeInteger(event.values.wrongCount, 0, 0, 20) + 1,
      xpEarned: event.hintLevel >= 3 ? 3 : event.hintLevel === 2 ? 5 : event.hintLevel === 1 ? 7 : 8,
      correctCount: safeInteger(event.values.correctCount, 0, 0, 20), score: 0,
      difficulty: event.difficulty, questionLevel: question.questionLevel, masterySignal: "retry",
    },
  }, { name: `${prefix}${currentSuffix}`, lifespanCount: 12 },
  { name: `${prefix}${weekPrefix}_wrong_once`, lifespanCount: 20 },
  { name: `${prefix}${weekPrefix}_streak_broken`, lifespanCount: 99 }];
}

function summarizeProgress(progress: Awaited<ReturnType<typeof getStudentProgress>>) {
  if (!progress) return { text: "Em chưa có tiến độ được lưu. Hãy bắt đầu một tuần học nhé!", data: null };
  const topics = progress.topicMastery as Array<{ topic: string; mastery_score: number }>;
  const sorted = [...topics].sort((a, b) => Number(b.mastery_score) - Number(a.mastery_score));
  const strongestTopic = sorted[0]?.topic ?? null;
  const topicNeedingSupport = [...sorted].reverse()[0]?.topic ?? null;
  const text = `Em đang ở Tuần ${progress.currentWeek}, Level ${progress.level}, có ${progress.totalXP} XP và streak ${progress.streak} ngày. Em đã hoàn thành ${progress.completedWeeks.length}/35 tuần.${strongestTopic ? ` Chủ đề mạnh nhất: ${strongestTopic}.` : ""}${topicNeedingSupport && topicNeedingSupport !== strongestTopic ? ` Nên luyện thêm: ${topicNeedingSupport}.` : ""}`;
  return { text, data: { currentWeek: progress.currentWeek, completedWeeks: progress.completedWeeks,
    totalXP: progress.totalXP, level: progress.level, streak: progress.streak, strongestTopic, topicNeedingSupport } };
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) return Response.json({ fulfillmentText: "Webhook chưa được xác thực." }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 256_000) return Response.json({ fulfillmentText: "Yêu cầu quá lớn." }, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond(null, "Mít chưa đọc được yêu cầu. Em thử lại nhé.", { success: false, degraded: true });
  }

  let event: NormalizedDialogflowEvent | null = null;
  try {
    event = normalizeDialogflowEvent(parseDialogflowRequest(body));
    if (process.env.NODE_ENV !== "production") {
      console.info("[chinh-ta/identity]", { webhookStudentId: diagnosticId(event.studentId), sessionId: diagnosticId(event.sessionId) });
    }
    if (event.eventType === "HINT_USED") {
      if (!event.hintEvent) throw new Error("Thiếu dữ liệu gợi ý.");
      const question = getQuestionDefinition(event.questionId);
      if (!question) throw new Error(`Không tìm thấy câu hỏi ${event.questionId}.`);
      const game = await recordHintEvent(event.hintEvent);
      const hint = event.hintLevel === 1 ? question.hint1 : event.hintLevel === 2 ? question.hint2 : question.hint3;
      return respond(event, `Gợi ý ${event.hintLevel}: ${hint} Em thử lại nhé.`, {
        success: true, eventType: event.eventType, hint: { questionId: event.questionId, level: event.hintLevel },
        game: gamePayload(event, game),
      }, [backendStateContext(event.sessionPath, { totalXP: game.totalXP, level: game.level,
        streak: game.streak, hintsUsed: game.hintsUsed })]);
    }

    if (event.eventType === "ANSWER_RESULT") {
      if (!event.answerEvent) throw new Error("Thiếu dữ liệu kết quả câu hỏi.");
      const game = await recordAnswerEvent(event.answerEvent);
      const correctAnswer = getQuestionDefinition(event.questionId)?.correctAnswer
        ?? (typeof event.values.correctAnswer === "string" ? event.values.correctAnswer : "");
      let feedback = answerText(event, game.xpEarned, game.totalXP, game.level, game.duplicate);
      let ai: Awaited<ReturnType<typeof feedbackAnswer>> | undefined;
      if (!game.duplicate && (!event.correct || event.attempt > 1 || event.hintLevel > 0)) {
        ai = await feedbackAnswer({ week: event.week, topic: event.topic,
          question: typeof event.values.prompt === "string" ? event.values.prompt : "",
          studentAnswer: event.answer, correctAnswer, isCorrect: event.correct, attempt: event.attempt,
          hintLevel: event.hintLevel, difficulty: aiDifficulty(event.difficulty) });
        feedback = ai.feedback;
        if (event.correct) feedback += ` +${game.xpEarned} XP. Tổng XP: ${game.totalXP}, Level ${game.level}.`;
      }
      const nextPrompt = event.correct ? activeQuestionPrompt(event) : "";
      if (nextPrompt) feedback += `\n${nextPrompt}`;
      const backendSupportRecommended = supportRecommended(event, game.mastery);
      const resultPayload = gamePayload(event, game);
      return respond(event, feedback, { success: true, eventType: event.eventType, game: resultPayload,
        adaptive: { backendMastery: game.mastery, backendSupportRecommended }, ...(ai ? { ai } : {}) }, [
        backendStateContext(event.sessionPath, { backendMastery: game.mastery, backendSupportRecommended,
          totalXP: game.totalXP, level: game.level, streak: game.streak }),
        ...(!event.correct ? rejectedCorrectContexts(event) : []),
      ]);
    }

    if (event.eventType === "WEEK_COMPLETE") {
      if (!event.weekCompleteEvent) throw new Error("Thiếu dữ liệu hoàn thành tuần.");
      let answerXP = 0;
      let answerBadges: string[] = [];
      if (event.answerEvent && event.questionId !== "unknown-question") {
        const answer = await recordAnswerEvent({ ...event.answerEvent, eventId: `${event.eventId}-answer` });
        answerXP = answer.xpEarned;
        answerBadges = answer.newBadges;
      }
      const completion = await completeWeekEvent({ ...event.weekCompleteEvent, eventId: `${event.eventId}-complete` });
      const noHintBonus = completion.xpEarned >= 50;
      const newBadges = [...new Set([...answerBadges, ...completion.newBadges])];
      const awarded = answerXP + completion.xpEarned;
      const text = completion.duplicate
        ? `Tuần ${event.week} đã được hoàn thành trước đó nên XP không bị cộng lại.`
        : `🏆 Hoàn thành Tuần ${event.week}!\n+30 XP hoàn thành tuần${noHintBonus ? "\n+20 XP bonus không dùng gợi ý" : ""}${answerXP ? `\n+${answerXP} XP câu cuối` : ""}\nTổng XP: ${completion.totalXP}\nLevel: ${completion.level}`;
      const game = { ...gamePayload(event, completion), xpEarned: awarded, completionXP: completion.xpEarned, answerXP, noHintBonus,
        totalXP: completion.totalXP, level: completion.level, mastery: completion.mastery,
        streak: completion.streak, newBadges, duplicate: completion.duplicate };
      return respond(event, text, { success: true, eventType: event.eventType, game }, [
        backendStateContext(event.sessionPath, { backendMastery: completion.mastery,
          backendSupportRecommended: false, totalXP: completion.totalXP, level: completion.level,
          streak: completion.streak, weekCompleted: event.week }),
      ]);
    }

    if (event.eventType === "GET_PROGRESS") {
      const summary = summarizeProgress(await getStudentProgress(event.studentId));
      return respond(event, summary.text, { success: true, eventType: event.eventType, progress: summary.data });
    }

    if (event.eventType === "GET_SCORE") {
      const progress = await getStudentProgress(event.studentId);
      const badgeCount = progress?.badges.length ?? 0;
      const text = progress ? `Em có ${progress.totalXP} XP, Level ${progress.level}, streak ${progress.streak} ngày và ${badgeCount} huy hiệu.` : "Em chưa có điểm được lưu. Hãy bắt đầu học nhé!";
      return respond(event, text, { success: true, eventType: event.eventType,
        score: progress ? { totalXP: progress.totalXP, level: progress.level, streak: progress.streak, badgeCount } : null });
    }

    if (event.eventType === "GET_BADGES") {
      const badges = await getStudentBadges(event.studentId);
      const rows = badges ?? [];
      const names = rows.flatMap((row) => {
        const badge = (row as { badges?: unknown }).badges;
        if (Array.isArray(badge)) return badge.map((item) => typeof item?.name === "string" ? item.name : "").filter(Boolean);
        const badgeObject = badge && typeof badge === "object" ? badge as Record<string, unknown> : null;
        return badgeObject && typeof badgeObject.name === "string" ? [badgeObject.name] : [];
      });
      const text = names.length ? `Em đã đạt ${names.length} huy hiệu: ${names.slice(0, 5).join(", ")}.` : "Em chưa có huy hiệu nào. Cố gắng hoàn thành tuần đầu tiên nhé!";
      return respond(event, text, { success: true, eventType: event.eventType, badges: names });
    }

    if (event.eventType === "GET_LEADERBOARD") {
      const className = typeof event.values.className === "string" ? event.values.className : event.className;
      const period = event.values.period === "weekly" ? "weekly" : "all_time";
      const top = (await getLeaderboard(className === "Chưa xếp lớp" ? "" : className, period)).slice(0, 5)
        .map(({ rank, name, xp, level }) => ({ rank, name: name.slice(0, 40), xp, level }));
      const text = top.length ? `Top ${top.length}: ${top.map((row) => `${row.rank}. ${row.name} – ${row.xp} XP`).join("; ")}.` : "Chưa có dữ liệu bảng xếp hạng.";
      return respond(event, text, { success: true, eventType: event.eventType, leaderboard: top, period });
    }

    const week = event.week;
    const topic = event.topic;
    const rule = typeof event.values.rule === "string" ? event.values.rule : topic;
    const question = typeof event.values.prompt === "string" ? event.values.prompt : typeof event.values.question === "string" ? event.values.question : "";
    const correctAnswer = typeof event.values.correctAnswer === "string" ? event.values.correctAnswer : "";
    if (event.eventType === "AI_EXPLAIN") {
      const ai = await explainRule({ week, topic, rule,
        studentQuestion: typeof event.values.studentQuestion === "string" ? event.values.studentQuestion : question,
        previousMistakes: stringArray(event.values.previousMistakes), hintLevel: safeInteger(event.values.hintLevel, 0, 0, 3) });
      return respond(event, [ai.explanation, ai.example, ai.followUpQuestion].filter(Boolean).join(" "), { success: true, aiSuccess: ai.success, ai });
    }
    if (event.eventType === "AI_FEEDBACK") {
      const ai = await feedbackAnswer({ week, topic, question, studentAnswer: event.answer, correctAnswer,
        isCorrect: event.correct || safeBoolean(event.values.isCorrect), attempt: event.attempt,
        hintLevel: event.hintLevel, difficulty: aiDifficulty(event.difficulty) });
      return respond(event, ai.feedback, { success: true, aiSuccess: ai.success, ai });
    }
    if (event.eventType === "AI_ANALYZE_MISTAKE") {
      const ai = await analyzeMistake({ week, topic, question, studentAnswer: event.answer, correctAnswer,
        recentMistakes: stringArray(event.values.recentMistakes) });
      return respond(event, `${ai.shortReason} ${ai.recommendation}`, { success: true, aiSuccess: ai.success, ai });
    }
    if (event.eventType === "AI_CREATE_SIMILAR_QUESTION") {
      const ai = await createSimilarQuestion({ week, topic, rule, sourceExamples: stringArray(event.values.sourceExamples),
        sourceQuestion: typeof event.values.sourceQuestion === "string" ? event.values.sourceQuestion : question,
        difficulty: aiDifficulty(event.difficulty), avoidWords: stringArray(event.values.avoidWords),
        mistakeType: mistakeType(event.values.mistakeType) });
      return respond(event, ai.question, { success: true, aiSuccess: ai.success, ai }, [{
        name: `${event.sessionPath}/contexts/ai_generated_question`, lifespanCount: 2,
        parameters: { generatedQuestion: ai.question, generatedAnswer: ai.answer,
          hint1: ai.hint1, hint2: ai.hint2, hint3: ai.hint3, difficulty: ai.difficulty },
      }]);
    }
    return respond(event, "Mít chưa nhận ra yêu cầu này. Em có thể nói “menu” hoặc “xem tiến độ”.", { success: true, eventType: "UNKNOWN" });
  } catch (reason) {
    console.error("[api/dialogflow/webhook] degraded response", {
      eventType: event?.eventType ?? "PARSE_ERROR",
      intent: event?.intentDisplayName ?? "unknown",
      error: reason instanceof Error ? reason.message : "unknown_error",
    });
    const fallback = event?.correct
      ? "🎯 Mít đã nhận câu trả lời. Có một chút trục trặc khi lưu thành tích, nhưng chúng mình vẫn có thể tiếp tục bài học."
      : "Có một chút trục trặc khi lưu thành tích, nhưng chúng mình vẫn có thể tiếp tục bài học. Em thử lại hoặc dùng gợi ý nhé.";
    return respond(event, fallback, { success: false, degraded: true, eventType: event?.eventType ?? "UNKNOWN" });
  }
}
