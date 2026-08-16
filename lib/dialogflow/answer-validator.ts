import { dialogflowQuestionCatalog } from "../../data/dialogflow-question-catalog.ts";

export type QuestionDefinition = (typeof dialogflowQuestionCatalog)[number];

const catalogById = new Map<string, QuestionDefinition>(
  dialogflowQuestionCatalog.map((question) => [question.questionId, question]),
);

function normalizedText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function getQuestionDefinition(questionId: string): QuestionDefinition | undefined {
  return catalogById.get(questionId.toUpperCase());
}

export function validateQuestionAnswer(questionId: string, studentAnswer: string) {
  const question = getQuestionDefinition(questionId);
  if (!question) return { accepted: false, question: undefined, normalizedAnswer: normalizedText(studentAnswer) };
  const normalizedAnswer = normalizedText(studentAnswer);
  const comparableAnswer = question.caseSensitive ? normalizedAnswer : normalizedAnswer.toLocaleLowerCase("vi");
  const accepted = (question.normalizedAcceptedAnswers as readonly string[]).includes(comparableAnswer);
  return { accepted, question, normalizedAnswer };
}

export function questionCatalogStats() {
  return {
    questions: dialogflowQuestionCatalog.length,
    uniqueQuestionIds: catalogById.size,
    questionsWithAcceptedAnswers: dialogflowQuestionCatalog.filter((question) => question.acceptedAnswers.length > 0).length,
  };
}
