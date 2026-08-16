import json
import re
import sys
import zipfile
from pathlib import Path


REQUIRED_STATE = {"attempt", "hintLevel", "xpEarned", "correctCount",
                  "wrongCount", "score", "difficulty", "masterySignal"}


def main(zip_path: str):
    path = Path(zip_path)
    errors, checks, flow_results = [], [], {}
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        checks.extend([
            ("zip_integrity", zf.testzip() is None),
            ("root_agent_json", "agent.json" in names),
            ("root_package_json", "package.json" in names),
            ("no_wrapper_directory", all(n.split("/")[0] in {"agent.json","package.json","intents","entities"} for n in names)),
        ])
        parsed = {}
        for name in [n for n in names if n.endswith(".json")]:
            try:
                parsed[name] = json.loads(zf.read(name).decode("utf-8"))
            except Exception as exc:
                errors.append(f"invalid JSON {name}: {exc}")

        intent_defs = {n:o for n,o in parsed.items() if n.startswith("intents/") and not n.endswith("_usersays_vi.json")}
        entity_defs = {n:o for n,o in parsed.items() if n.startswith("entities/") and "_entries_vi.json" not in n}
        by_name = {o["name"]:o for o in intent_defs.values()}
        content_path = Path(__file__).resolve().parents[1] / "build" / "ChinhTaLop3_Gamified_DialogflowES" / "week_content.json"
        content = json.loads(content_path.read_text(encoding="utf-8"))
        content_weeks = {w["week"]:w for w in content["weeks"]}
        ids = [o.get("id") for o in intent_defs.values()]
        eids = [o.get("id") for o in entity_defs.values()]
        checks.extend([
            ("unique_intent_ids", len(ids) == len(set(ids))),
            ("unique_entity_ids", len(eids) == len(set(eids))),
            ("unique_all_uuids", len(ids+eids) == len(set(ids+eids))),
            ("all_intents_have_usersays", all(n[:-5]+"_usersays_vi.json" in parsed for n in intent_defs)),
            ("all_entities_have_entries", all(n[:-5]+"_entries_vi.json" in parsed for n in entity_defs)),
            ("all_35_week_starts", all(f"W{i:02d}_Start" in by_name for i in range(1,36))),
            ("all_35_week_completions", all(any(c.get("name")==f"week{i:02d}_complete" and c.get("lifespan",0)>0
                                               for r in by_name[f"W{i:02d}_Q09_Correct"]["responses"]
                                               for c in r.get("affectedContexts",[])) for i in range(1,36))),
            ("completion_bonus_payloads", all(any(m.get("payload",{}).get("rewards",{}).get("completionBonusXP")==30
                                                  for r in by_name[f"W{i:02d}_Q09_Correct"]["responses"]
                                                  for m in r.get("messages",[]) if m.get("type")==4) for i in range(1,36))),
            ("three_hint_levels_all_weeks", all(all(f"W{i:02d}_Hint_{h}" in by_name for h in (1,2,3)) for i in range(1,36))),
            ("adaptive_branches_all_weeks", all(all(f"W{i:02d}_Q{q:02d}_Correct_To_Support" in by_name for q in (1,3,6)) for i in range(1,36))),
            ("ai_ready_intents", all(n in by_name for n in ("AI_Explain","AI_Feedback","AI_CreateSimilarQuestion","AI_AnalyzeMistake"))),
            ("required_entities", len(entity_defs) == 9),
            ("intent_under_1500", len(intent_defs) < 1500),
            ("intent_preferred_under_1100", len(intent_defs) < 1100),
            ("no_manual_result_xp_complete_steps", not any(re.fullmatch(r"W\d\d_(Result|XP|Complete)", n) for n in by_name)),
        ])

        action_fields = []
        invalid_action_whitespace = []
        invalid_action_format = []
        for filename, obj in intent_defs.items():
            for response_index, response in enumerate(obj.get("responses", [])):
                action = response.get("action", "")
                action_fields.append({"intent": obj["name"], "response": response_index,
                                      "action": action})
                if not isinstance(action, str):
                    invalid_action_format.append({"intent": obj["name"], "action": action})
                    continue
                if action.strip() != action or (action and any(ch.isspace() for ch in action)):
                    invalid_action_whitespace.append({"intent": obj["name"], "action": action})
                if action and not re.fullmatch(r"[a-z0-9_]+", action):
                    invalid_action_format.append({"intent": obj["name"], "action": action})
        nonempty_actions = sorted({row["action"] for row in action_fields if row["action"]})
        expected_nonempty_actions = [
            "ai_analyze_mistake",
            "ai_create_similar_question",
            "ai_explain",
            "ai_feedback",
        ]
        checks.extend([
            ("all_intent_responses_have_action_field",
             len(action_fields) == sum(len(obj.get("responses", [])) for obj in intent_defs.values()) and
             all("action" in response for obj in intent_defs.values() for response in obj.get("responses", []))),
            ("invalid_actions_with_whitespace_zero", not invalid_action_whitespace),
            ("all_nonempty_actions_safe_format", not invalid_action_format),
            ("only_expected_webhook_ready_actions_nonempty", nonempty_actions == expected_nonempty_actions),
        ])

        webhook_globals = {"Global_Progress","Global_Score","Global_Leaderboard","Global_Badges",
                           "AI_Explain","AI_Feedback","AI_CreateSimilarQuestion","AI_AnalyzeMistake"}
        allowed_webhook_events = {"ANSWER_RESULT","WEEK_COMPLETE","HINT_USED","GET_PROGRESS","GET_SCORE",
                                  "GET_LEADERBOARD","GET_BADGES","AI_EXPLAIN","AI_FEEDBACK",
                                  "AI_ANALYZE_MISTAKE","AI_CREATE_SIMILAR_QUESTION"}
        webhook_enabled_names = sorted(name for name,obj in by_name.items() if obj.get("webhookUsed"))
        webhook_flag_errors = []
        webhook_payload_errors = []
        for intent_name,obj in by_name.items():
            expected = (intent_name in webhook_globals or
                        (re.match(r"^W\d\d_",intent_name) and
                         ("_Correct" in intent_name or "_Wrong" in intent_name or
                          re.search(r"_Hint_[123]$", intent_name))))
            if bool(obj.get("webhookUsed")) != bool(expected):
                webhook_flag_errors.append(intent_name)
            if obj.get("webhookUsed"):
                messages = [message for response in obj.get("responses",[]) for message in response.get("messages",[])]
                payload_rows = [message.get("payload",{}) for message in messages if message.get("type") == 4]
                static_fallback = any(message.get("type") == 0 and message.get("speech") for message in messages)
                if len(payload_rows) != 1 or not static_fallback:
                    webhook_payload_errors.append({"intent":intent_name,"reason":"missing payload or static fallback"})
                    continue
                custom = payload_rows[0]
                if (custom.get("schemaVersion") != "3.0" or
                    custom.get("action") not in allowed_webhook_events or
                    custom.get("eventType") != custom.get("action") or
                    "eventId" not in custom or
                    custom.get("webhook",{}).get("enabled") is not True):
                    webhook_payload_errors.append({"intent":intent_name,"reason":"invalid normalized payload"})
        checks.extend([
            ("selective_webhook_flags_valid",not webhook_flag_errors),
            ("webhook_payload_schema_v3_valid",not webhook_payload_errors),
            ("webhook_static_fallbacks_retained",not webhook_payload_errors),
        ])

        all_questions = [q for w in content_weeks.values() for q in w["questions"]]
        question_ids = [f"W{week_no:02d}_Q{q['n']:02d}"
                        for week_no,week in content_weeks.items() for q in week["questions"]]
        question_ids += [f"W{week_no:02d}_SUPPORT_Q{resume:02d}"
                         for week_no in content_weeks for resume in (2,4,7)]
        legacy_prompts = [q for q in all_questions if "Viết đúng cụm từ theo bài học" in q["prompt"] or
                          "Chọn cách viết đúng cho nội dung" in q["prompt"]]
        ambiguous_placeholders = [q for q in all_questions if re.search(r"\*+|_{2,}",q["prompt"])]
        revealed_rewrites = []
        for q in all_questions:
            match = re.search(r"Viết lại cho đúng:\s*[“\"](.+?)[”\"]",q["prompt"])
            if match and match.group(1).strip() == q["answer"].strip():
                revealed_rewrites.append(q)
        checks.extend([
            ("content_all_35_weeks", sorted(content_weeks) == list(range(1,36))),
            ("nine_questions_each_week", all(len(w["questions"]) == 9 for w in content_weeks.values())),
            ("no_legacy_answer_copy_prompts", not legacy_prompts),
            ("no_revealed_rewrite_answers", not revealed_rewrites),
            ("single_unambiguous_placeholders", not ambiguous_placeholders),
            ("unique_question_ids", len(question_ids) == len(set(question_ids))),
            ("every_question_has_accepted_answers", all(bool(parsed.get(
                f"intents/W{week_no:02d}_Q{q['n']:02d}_Correct_usersays_vi.json"))
                for week_no,week in content_weeks.items() for q in week["questions"])),
        ])

        def first_training_phrase(intent_name):
            rows = parsed[f"intents/{intent_name}_usersays_vi.json"]
            return "".join(part.get("text","") for part in rows[0].get("data",[])) if rows else ""

        support_differences = []
        for week_no in range(1,36):
            questions = {q["n"]:q for q in content_weeks[week_no]["questions"]}
            for failed_q,resume_q in ((1,2),(3,4),(6,7)):
                name = f"W{week_no:02d}_Q{failed_q:02d}_Correct_To_Support"
                obj = by_name[name]
                active_name = f"week{week_no:02d}_active"
                active_outputs = [c for r in obj["responses"] for c in r.get("affectedContexts",[])
                                  if c.get("name") == active_name and c.get("lifespan",0)>0]
                support_prompt = active_outputs[0].get("parameters",{}).get("prompt","") if active_outputs else ""
                main_prompt = questions[failed_q]["prompt"]
                main_answer = first_training_phrase(f"W{week_no:02d}_Q{failed_q:02d}_Correct")
                support_answer = first_training_phrase(f"W{week_no:02d}_Support_Q{resume_q:02d}_Correct")
                support_differences.append({"week":week_no,"failedQuestion":failed_q,
                                            "promptDifferent":support_prompt.removeprefix("Câu hỗ trợ: ") != main_prompt,
                                            "answerDifferent":support_answer != main_answer})
        distinct_support = all(x["promptDifferent"] and x["answerDifferent"] for x in support_differences)
        checks.extend([
            ("H_105_support_questions_checked", len(support_differences) == 105),
            ("H_support_questions_distinct", distinct_support),
        ])

        w17 = content_weeks[17]
        w17_text = " ".join(q["prompt"]+" "+q["answer"] for q in w17["questions"])
        checks.append(("F_week17_form_content", w17["topic"] == "Luyện viết phiếu mượn sách thư viện" and
                       all(field in w17_text for field in ("Họ tên","Địa chỉ","Tên sách","Tác giả")) and
                       "h / đ / t" not in w17_text))

        capitalization_ok = True
        capitalization_questions = []
        bad_lowercase_phrases = []
        bad_wrong_option_phrases = []
        capitalization_intents_scanned = 0

        def training_phrases(intent_name):
            rows = parsed[f"intents/{intent_name}_usersays_vi.json"]
            return ["".join(part.get("text","") for part in row.get("data",[])).strip()
                    for row in rows]

        def scan_capitalization_intent(intent_name,item):
            nonlocal capitalization_intents_scanned
            capitalization_intents_scanned += 1
            phrases = training_phrases(intent_name)
            lowercase_answer = item["answer"].lower()
            if lowercase_answer != item["answer"] and lowercase_answer in phrases:
                bad_lowercase_phrases.append({"intent":intent_name,"phrase":lowercase_answer})
            option_values = [m.group(1).strip() for m in re.finditer(r"^[ABC]\.\s*(.+)$",item["prompt"],re.M)]
            for wrong_option in [value for value in option_values if value != item["answer"]]:
                if wrong_option in phrases:
                    bad_wrong_option_phrases.append({"intent":intent_name,"phrase":wrong_option})

        for week_no,indices in ((21,range(1,6)),(29,range(1,10)),(32,range(1,10)),(34,range(1,10))):
            questions = {q["n"]:q for q in content_weeks[week_no]["questions"]}
            for idx in indices:
                item = questions[idx]
                capitalization_questions.append(item)
                prompt = item["prompt"]
                if not (prompt.startswith("Tên nào viết đúng?\n") and
                        all(f"{letter}. " in prompt for letter in "ABC") and
                        item.get("correctOption") in ("A","B","C")):
                    capitalization_ok = False
                scan_capitalization_intent(f"W{week_no:02d}_Q{idx:02d}_Correct",item)
            for failed_q,resume_q,support_idx in ((1,2,5),(3,4,2),(6,7,4)):
                support_item = questions[support_idx]
                if support_item.get("capitalization"):
                    scan_capitalization_intent(f"W{week_no:02d}_Support_Q{resume_q:02d}_Correct",support_item)
        checks.append(("G_capitalization_weeks_21_29_32_34",capitalization_ok))
        checks.extend([
            ("capitalization_32_questions_multiple_choice",len(capitalization_questions)==32),
            ("capitalization_no_lowercase_correct_phrase",not bad_lowercase_phrases),
            ("capitalization_no_wrong_option_in_correct_intent",not bad_wrong_option_phrases),
        ])

        correct_wildcards = []
        raw_response_placeholders = []
        for intent_name,obj in by_name.items():
            if "_Correct" in intent_name:
                for row in parsed.get(f"intents/{intent_name}_usersays_vi.json", []):
                    if any(part.get("meta") == "@sys.any" for part in row.get("data", [])):
                        correct_wildcards.append(intent_name)
            for response in obj.get("responses", []):
                for message in response.get("messages", []):
                    if message.get("type") != 0:
                        continue
                    speeches = message.get("speech", [])
                    if isinstance(speeches, str): speeches = [speeches]
                    for speech in speeches:
                        if isinstance(speech, str) and re.search(r"#[a-z0-9_]+\.[a-zA-Z0-9_]+", speech):
                            raw_response_placeholders.append({"intent":intent_name,"speech":speech})
        checks.extend([
            ("correct_intents_have_no_sys_any", not correct_wildcards),
            ("raw_context_placeholders_in_responses_zero", not raw_response_placeholders),
        ])
        auto_next_payload_errors = []
        for intent_name,obj in by_name.items():
            if "_Correct" not in intent_name or re.fullmatch(r"W\d{2}_Q09_Correct", intent_name):
                continue
            payload_rows = [message.get("payload", {}) for response in obj.get("responses", [])
                            for message in response.get("messages", []) if message.get("type") == 4]
            next_question = payload_rows[0].get("nextQuestion", {}) if payload_rows else {}
            if (not isinstance(next_question, dict) or not next_question.get("questionId") or
                    not next_question.get("prompt") or "#" in str(next_question.get("prompt"))):
                auto_next_payload_errors.append(intent_name)
        checks.append(("correct_auto_next_payloads_are_direct", not auto_next_payload_errors))

        produced = set()
        for name, obj in intent_defs.items():
            for response in obj.get("responses", []):
                for c in response.get("affectedContexts", []):
                    if not isinstance(c.get("lifespan"), int) or c["lifespan"] < 0:
                        errors.append(f"invalid lifespan in {name}")
                    if c.get("lifespan",0) > 0:
                        produced.add(c.get("name"))
        for name, obj in intent_defs.items():
            for c in obj.get("contexts", []):
                if not re.fullmatch(r"[a-z0-9_]+", c):
                    errors.append(f"invalid context {c} in {name}")
                if c not in produced:
                    errors.append(f"unproduced input context {c} in {name}")
            usersays_name = f"intents/{obj['name']}_usersays_vi.json"
            if not obj.get("fallbackIntent") and not obj.get("events") and not parsed.get(usersays_name):
                errors.append(f"empty training phrases in {name}")

            stateful = (re.search(r"_Q\d\d_", obj["name"]) or "_Hint_" in obj["name"] or "_Wrong_" in obj["name"] or "_Support_Q" in obj["name"])
            if stateful:
                payloads = [m.get("payload") for r in obj.get("responses",[]) for m in r.get("messages",[]) if m.get("type")==4]
                if not payloads:
                    errors.append(f"missing state payload in {name}")
                else:
                    state = payloads[0].get("sessionState",{})
                    missing = REQUIRED_STATE - set(state)
                    if missing:
                        errors.append(f"missing state fields {sorted(missing)} in {name}")
                    if "totalXP" in state:
                        errors.append(f"totalXP must not pretend to be local state in {name}")
                    if payloads[0].get("xpPolicy",{}).get("totalXP") != "WEBHOOK_DATABASE_REQUIRED":
                        errors.append(f"missing totalXP responsibility marker in {name}")

        agent = parsed.get("agent.json",{})
        checks.extend([
            ("language_vi", agent.get("language") == "vi"),
            ("timezone_hcm", agent.get("defaultTimezone") == "Asia/Ho_Chi_Minh"),
        ])

        v2_path = path.with_name("ChinhTaLop3_Gamified_DialogflowES_v6.zip")
        architecture_preserved = True
        pedagogical_content_preserved = True
        action_fields_changed_from_v5 = 0
        action_fields_added_in_v6 = 0
        if v2_path.exists():
            with zipfile.ZipFile(v2_path) as old_zip:
                old_defs = {}
                old_usersays = {}
                for old_name in old_zip.namelist():
                    if old_name.startswith("intents/") and old_name.endswith(".json") and not old_name.endswith("_usersays_vi.json"):
                        old_obj = json.loads(old_zip.read(old_name).decode("utf-8"))
                        old_defs[old_obj["name"]] = old_obj
                    elif old_name.startswith("intents/") and old_name.endswith("_usersays_vi.json"):
                        intent_name = Path(old_name).name.removesuffix("_usersays_vi.json")
                        old_usersays[intent_name] = json.loads(old_zip.read(old_name).decode("utf-8"))
            def signature(obj):
                return {"inputs":obj.get("contexts",[]),"fallback":obj.get("fallbackIntent"),
                        "events":obj.get("events",[]),
                        "outputs":[(c.get("name"),c.get("lifespan")) for r in obj.get("responses",[])
                                   for c in r.get("affectedContexts",[])]}
            architecture_preserved = (set(old_defs) <= set(by_name) and
                                      all(signature(old_defs[name]) == signature(by_name[name]) for name in old_defs))
            def speeches(obj):
                return [message.get("speech") for response in obj.get("responses",[])
                        for message in response.get("messages",[]) if message.get("type") == 0]
            old_week_names = {name for name in old_defs if re.match(r"^W\d\d_",name)}
            changed_for_v7 = {name for name in old_week_names
                              if re.search(r"_Hint_[123]$", name) or "_Correct" in name}
            pedagogical_content_preserved = (
                all(name in by_name and (name in changed_for_v7 or speeches(old_defs[name]) == speeches(by_name[name]))
                    for name in old_week_names) and
                all(parsed.get(f"intents/{name}_usersays_vi.json") == old_usersays.get(name)
                    for name in old_week_names)
            )
            for name in set(old_defs) & set(by_name):
                old_responses = old_defs[name].get("responses", [])
                new_responses = by_name[name].get("responses", [])
                for old_response, new_response in zip(old_responses, new_responses):
                    if old_response.get("action", "") != new_response.get("action", ""):
                        action_fields_changed_from_v5 += 1
            action_fields_added_in_v6 = sum(len(by_name[name].get("responses",[])) for name in set(by_name)-set(old_defs))
        checks.extend([
            ("v6_architecture_preserved", architecture_preserved),
            ("v6_pedagogical_content_preserved", pedagogical_content_preserved),
        ])

        def step(contexts, intent_name):
            obj = by_name[intent_name]
            required = set(obj.get("contexts",[]))
            if not required <= contexts:
                raise AssertionError(f"{intent_name} needs {sorted(required-contexts)}")
            response = obj["responses"][0]
            if response.get("resetContexts"):
                contexts.clear()
            for c in response.get("affectedContexts",[]):
                if c["lifespan"] == 0:
                    contexts.discard(c["name"])
                else:
                    contexts.add(c["name"])
            return contexts

        def run(label, sequence, expected, absent=()):
            contexts = set()
            try:
                for intent in sequence:
                    step(contexts,intent)
                ok = set(expected) <= contexts and not (set(absent) & contexts)
                flow_results[label] = {"passed":ok,"steps":sequence,"finalContexts":sorted(contexts)}
                checks.append((label,ok))
            except Exception as exc:
                flow_results[label] = {"passed":False,"steps":sequence,"error":str(exc),"finalContexts":sorted(contexts)}
                checks.append((label,False))

        run("A_week01_fast_auto_complete",[
            "W01_Start","W01_Understood_Yes","W01_Q01_Correct","W01_Q02_Correct",
            "W01_Q03_Correct","W01_Q06_Correct","W01_Q08_Correct","W01_Q09_Correct"],
            ["week01_complete"],["week01_active"])
        run("B_week01_hint_to_support_return",[
            "W01_Start","W01_Understood_Yes","W01_Wrong_First","W01_Hint_1",
            "W01_Wrong_Again","W01_Hint_2","W01_Q01_Correct_To_Support",
            "W01_Support_Q02_Correct"],
            ["week01_active","week01_question02"],["week01_support_needed","week01_basic_support_q02"])
        run("C_week05_multiple_mistakes_remedial",[
            "W05_Start","W05_Understood_Yes","W05_Q01_Correct","W05_Q02_Correct",
            "W05_Wrong_First","W05_Wrong_Again","W05_Q03_Correct_To_Support",
            "W05_Support_Q04_Correct"],
            ["week05_active","week05_question04"],["week05_support_needed","week05_basic_support_q04"])
        run("D_week18_boss_auto_complete",[
            "W18_Start","W18_Understood_Yes","W18_Q01_Correct","W18_Q02_Correct",
            "W18_Q03_Correct","W18_Q06_Correct","W18_Q08_Correct","W18_Q09_Correct"],
            ["week18_complete"],["week18_active"])
        run("E_week35_final_boss_auto_complete",[
            "W35_Start","W35_Understood_Yes","W35_Q01_Correct","W35_Q02_Correct",
            "W35_Q03_Correct","W35_Q06_Correct","W35_Q08_Correct","W35_Q09_Correct"],
            ["week35_complete"],["week35_active"])
        run("F_week17_form_auto_complete",[
            "W17_Start","W17_Understood_Yes","W17_Q01_Correct","W17_Q02_Correct",
            "W17_Q03_Correct","W17_Q06_Correct","W17_Q08_Correct","W17_Q09_Correct"],
            ["week17_complete"],["week17_active"])
        run("G_week21_capitalization_flow",[
            "W21_Start","W21_Understood_Yes","W21_Q01_Correct"],
            ["week21_active","week21_question02"],["week21_question01"])
        flow_results["H_all_remedial_questions_distinct"] = {
            "passed": distinct_support,
            "supportQuestionsChecked": len(support_differences),
            "rule": "support prompt and accepted answer differ from the failed main question"
        }

    for label, ok in checks:
        if not ok:
            errors.append("failed check: " + label)
    report = {"zip":str(path.resolve()),"zipBytes":path.stat().st_size,
              "intentCount":len(intent_defs),"entityCount":len(entity_defs),
              "webhookQA":{"webhookEnabledIntents":len(webhook_enabled_names),
                           "webhookFlagErrors":webhook_flag_errors,
                           "webhookPayloadErrors":webhook_payload_errors},
              "actionQA":{"actionFieldsScanned":len(action_fields),
                          "actionFieldsChangedFromV5":action_fields_changed_from_v5,
                          "actionFieldsAddedInV6":action_fields_added_in_v6,
                          "emptyActionFields":sum(1 for row in action_fields if row["action"] == ""),
                          "nonemptyActions":nonempty_actions,
                          "invalidActionsWithWhitespace":len(invalid_action_whitespace),
                          "invalidActionsWithUnsafeFormat":len(invalid_action_format)},
              "contentQA":{"weeksChecked":len(content_weeks),"questionsChecked":len(all_questions),
                           "supportQuestionsChanged":len(support_differences),
                           "capitalizationQuestionsConverted":len(capitalization_questions),
                           "capitalizationCorrectIntentsScanned":capitalization_intents_scanned,
                           "lowercaseIncorrectPhrasesInCorrectIntents":len(bad_lowercase_phrases),
                           "legacyAnswerCopyPrompts":len(legacy_prompts),
                           "ambiguousPlaceholders":len(ambiguous_placeholders)},
              "checks":{k:v for k,v in checks},"flows":flow_results,"errors":errors}
    report_path = path.with_name("validation_report_v7.json")
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main(sys.argv[1])
