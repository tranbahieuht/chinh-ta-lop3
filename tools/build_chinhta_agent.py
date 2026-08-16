from __future__ import annotations

import json
import re
import shutil
import unicodedata
import uuid
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / "fraction-ai-tutor" if (ROOT / "fraction-ai-tutor").is_dir() else ROOT
OUT = ROOT / "build" / "ChinhTaLop3_Gamified_DialogflowES"
DIST = ROOT / "dist" / "ChinhTaLop3_Gamified_DialogflowES_v7.zip"
QUESTION_CATALOG = APP_ROOT / "data" / "dialogflow-question-catalog.ts"


def w(n, title, topic, focus, words, theory=None, boss=False, overrides=None,
      question_prompts=None):
    return {"week": n, "title": title, "topic": topic, "focus": focus,
            "words": words, "theory": theory, "boss": boss,
            "overrides": overrides or {}, "question_prompts": question_prompts or []}


WEEKS = [
    w(1,"Ngày gặp lại","c / k",["c","k"],["cây","kính mắt","cái cân","cái kéo","kẹo","lá cờ","cá","kiến","kể chuyện"],"Trước e, ê, i, âm /k/ thường viết bằng k; các trường hợp khác thường viết bằng c."),
    w(2,"Cánh rừng trong nắng","g / gh",["gh","g"],["con gấu","cái ghế","gà lôi","gõ kiến","ghi chép","ghé chơi","gieo hạt","gánh nước","gồ ghề"],"Trước e, ê, i, âm /g/ thường viết bằng gh; các trường hợp khác thường viết bằng g."),
    w(3,"Nhật kí tập bơi","ng / ngh",["ngh","ng"],["nghé con","ngơ ngác","người gieo","ngoéo tay","nghe nhạc","suy nghĩ","ngắm nhìn","ngước nhìn","lắng nghe"],"Trước e, ê, i, âm /ng/ thường viết bằng ngh; các trường hợp khác thường viết bằng ng."),
    w(4,"Mùa hè lấp lánh","ch / tr; v / d",["ch","tr","v","d"],["thuỷ chung","trung thành","trung thực","chờ đợi","chói mắt","trổ bông","vừa chạy","vẫy gọi","dài"],"Chú ý nghĩa của từ và âm đầu ch/tr, v/d trong từng tiếng."),
    w(5,"Đi học vui sao","s / x; dấu hỏi / dấu ngã",["s","x"],["dòng suối","xe máy","sườn núi","xóm bản","ngôi sao","xôn xao","cối giã gạo","ngõ nhỏ","cái mũ"],"Nghe rõ âm đầu s/x và xem dấu thanh của từng tiếng; dấu hỏi và dấu ngã không dùng thay nhau.",overrides={"cối giã gạo":"cối giả gạo","ngõ nhỏ":"ngỏ nhỏ","cái mũ":"cái mủ"}),
    w(6,"Lời giải toán đặc biệt","r / d / gi; an / ang",["gi","r","d","ang","an"],["giao hàng","con dao","rao bán","reo hò","dạy học","giặt giũ","màu vàng","buổi sáng","quả nhãn"],"Phân biệt r/d/gi theo tiếng và nghĩa; chú ý vần an kết thúc bằng n, vần ang kết thúc bằng ng."),
    w(7,"Bàn tay cô giáo","l / n; ăn / ăng",["l","n","ăng","ăn"],["xe lu","lù lù","làm đều","lạnh","lặng vẻ","mặt trăng","vằng vặc","lăn tăn","lóng lanh"],"Phân biệt âm đầu l/n; vần ăn kết thúc bằng n, vần ăng kết thúc bằng ng."),
    w(8,"Thư viện","ch / tr; ân / âng; dân / dâng",["ch","tr","dâng","dân","âng","ân"],["chân thành","trân trọng","chân lí","trân quý","dân cư","dân tộc","dâng trào","dâng hiến","chạy vội"],"Dựa vào nghĩa để chọn ch/tr và các tiếng chân/trân, dân/dâng."),
    w(9,"Ôn tập giữa học kì I","Checkpoint tuần 1–8",["ngh","gh","k","tr","ch","gi","ăng","x","dâng"],["kính mắt","cái ghế","nghe nhạc","trung thực","giặt giũ","mặt trăng","xôn xao","dâng hiến","chân thành"],"Checkpoint ôn các nhóm c/k, g/gh, ng/ngh, ch/tr, s/x, r/d/gi, l/n và các vần đã học.",True),
    w(10,"Ngưỡng cửa","iêu / ươu; en / eng",["ươu","iêu","eng","en"],["hươu cao cổ","cánh diều","đà điểu","uống rượu","hoa loa kèn","tiếng kẻng","giấy khen","dế mèn","ven sông"],"Phân biệt iêu/ươu và en/eng bằng cách nghe trọn vần trong tiếng."),
    w(11,"Khi cả nhà bé tí","iu / ưu; iên / iêng",["ưu","iu","iêng","iên"],["cây lựu","sai trĩu quả","mẹ địu bé","hót líu lo","lưu luyến","biến đổi","lười biếng","tiếng kêu","cùng tiến"],"Phân biệt iu/ưu và iên/iêng; chú ý âm cuối n hay ng."),
    w(12,"Tia nắng bé nhỏ","s / x; uôn / uông",["s","x","uông","uôn"],["siêu nhân","xiêu vẹo","nước sôi","đĩa xôi","học sinh","xinh đẹp","lịch sử","đối xử","rau muống"],"Phân biệt s/x theo từ; vần uôn kết thúc bằng n, uông kết thúc bằng ng."),
    w(13,"Tôi yêu em tôi","r / d / gi; ươn / ương",["gi","r","d","ương","ươn"],["hàng rào","giàn mướp","rổ rau","cây dừa","mướp hương","vườn rau","hướng dương","con đường","giọt sương"],"Phân biệt r/d/gi và vần ươn/ương; nghe âm cuối n hay ng."),
    w(14,"Những bậc đá chạm mây","ch / tr; ăn / ăng",["ch","tr","ăng","ăn"],["gà trống","mây trắng","buổi chiều","trở về","rặng tre","ánh nắng","con rắn","vầng trăng","chăn trâu"],"Phân biệt ch/tr; vần ăn kết thúc bằng n, vần ăng kết thúc bằng ng."),
    w(15,"Những chiếc áo ấm","l / n; dấu hỏi / dấu ngã",["l","n"],["nằm lặng","công cha cũng nặng","lặng lẽ","hoa sen nở","ai nỡ","trồng đỗ","mồ hôi đổ","nghĩa thầy","nặng lời"],"Dựa vào nghĩa để chọn l/n và dấu hỏi/dấu ngã trong các cặp tiếng dễ lẫn.",overrides={"trồng đỗ":"trồng đổ","mồ hôi đổ":"mồ hôi đỗ"}),
    w(16,"Ngôi nhà trong cỏ","s / x; ao / au",["s","x","ao","au"],["hạt sau","xô đẩy","xếp hàng","trắng xoá","tàu dừa","trên cao","ngôi sao","xao xuyến","rau xào"],"Phân biệt s/x và hai vần ao/au bằng cách nghe rõ âm chính của tiếng."),
    w(17,"Người làm đồ chơi","Luyện viết phiếu mượn sách thư viện",[],["Họ tên","Địa chỉ","Tên sách","Tác giả","Tên sách","Địa chỉ","Tên sách","Họ tên","Họ tên, Địa chỉ, Tên sách, Tác giả"],"Phiếu mượn sách thư viện gồm bốn mục: Họ tên, Địa chỉ, Tên sách và Tác giả. Điền thông tin đúng vào từng mục.",question_prompts=["Trong phiếu mượn sách, mục nào ghi tên người mượn? (Họ tên/Tên sách)","Mục nào ghi nơi người mượn đang ở? (Địa chỉ/Tác giả)","Mục nào ghi cuốn sách muốn mượn? (Tên sách/Họ tên)","Mục nào ghi người viết cuốn sách? (Tác giả/Địa chỉ)","Phiếu còn thiếu mục nào: Họ tên – Địa chỉ – _ – Tác giả? (Tên sách/Thư viện)","Phiếu còn thiếu mục nào: Họ tên – _ – Tên sách – Tác giả? (Địa chỉ/Thư viện)","Thông tin “Người làm đồ chơi” phù hợp điền vào mục nào? (Tên sách/Tác giả)","Khi ghi tên người mượn, em điền vào mục nào?","Viết bốn mục của phiếu theo đúng thứ tự, ngăn cách bằng dấu phẩy."]),
    w(18,"Ôn tập và đánh giá cuối học kì I","Boss cuối học kì I",["ngh","gh","tr","x","gi","ương","ươn","ăng","iêu","ưu"],["nghe nhạc","ghi chép","trung thực","xinh đẹp","giọt sương","vườn rau","vầng trăng","cánh diều","lưu luyến"],"Boss học kì I tổng hợp các âm đầu, vần và dấu thanh của tuần 1–17.",True),
    w(19,"Bầu trời","ch / tr; chuyền / truyền",["ch","tr"],["truyền tin","chuyền cành","truyền hình","chơi chuyền","dây chuyền","truyền thống","bóng chuyền","lan truyền","chân cầu vồng"],"Dựa vào nghĩa để chọn chuyền/truyền và phân biệt ch/tr."),
    w(20,"Cóc kiện Trời","s / x; ăt / ăc",["s","x","ăt","ăc"],["sinh sôi","xôi đỗ","san sẻ","xẻ gỗ","xào xạc","sáng sủa","mắc cạn","gặt lúa","giặt giũ"],"Phân biệt s/x và vần ăt/ăc; chú ý âm cuối t hay c."),
    w(21,"Ngày hội rừng xanh","Viết hoa địa lí; iêu / ươu; ât / âc",["ươu","iêu","ât","âc"],["Cúc Phương","Ninh Bình","Hoà Bình","Thanh Hoá","Việt Nam","bầy hươu","buổi chiều","quả gấc","mặt đất"],"Viết hoa mỗi bộ phận của tên riêng địa lí Việt Nam; phân biệt iêu/ươu và ât/âc.",overrides={"Cúc Phương":"cúc phương","Ninh Bình":"ninh bình","Hoà Bình":"hoà bình","Thanh Hoá":"thanh hoá","Việt Nam":"việt nam"}),
    w(22,"Mặt trời xanh của tôi","r / d / gi; in / inh",["gi","r","d","inh","in"],["dong biển","rong chơi","dứt khoát","rút bút","day dứt","rừng già","mịn màng","lung linh","xinh xắn"],"Dựa vào nghĩa để chọn r/d/gi; phân biệt in và inh bằng âm cuối n/ng."),
    w(23,"Lời kêu gọi toàn dân tập thể dục","l / n; dấu hỏi / dấu ngã",["l","n"],["hoa lưu li","hoa lựu","lá là bông hoa","nỗ lực","lo lắng","bụ bẫm","khoẻ khoắn","chập chững","nghỉ ngơi"],"Nghe rõ l/n và ghi đúng dấu hỏi, dấu ngã trong từng tiếng.",overrides={"bụ bẫm":"bụ bẩm","khoẻ khoắn":"khoẽ khoắn","chập chững":"chập chửng","nghỉ ngơi":"nghĩ ngơi"}),
    w(24,"Chuyện bên cửa sổ","iu / ưu; iêm / im",["ưu","iu","iêm","im"],["gió hiu hiu","lưu luyến","liu riu","sưu tập","tiêm phòng","dừa xiêm","lưỡi liềm","bàn phím","lim dim"],"Phân biệt iu/ưu và các vần iêm/im theo âm cuối của tiếng."),
    w(25,"Mèo đi câu cá","s / x; v / d",["s","x","v","d"],["cá sấu","chim sẻ","con sóc","dòng suối","xương rồng","xơ mướp","con voi","cây dừa","quả dâu tây"],"Phân biệt âm đầu s/x và v/d theo tiếng và nghĩa của từ."),
    w(26,"Ngày như thế nào là đẹp?","r / d / gi; dấu hỏi / dấu ngã",["gi","r","d"],["rán thức ăn","dán giấy","con gián","rừng già","che rợp","vóc dáng","con thỏ","con khỉ","nhảy nhót"],"Dựa vào nghĩa để chọn r/d/gi; chú ý dấu hỏi và dấu ngã.",overrides={"con thỏ":"con thõ","con khỉ":"con khĩ","nhảy nhót":"nhãy nhót"}),
    w(27,"Ôn tập giữa học kì II","Checkpoint tuần 19–26",["tr","ch","x","gi","inh","ưu","d"],["truyền tin","chơi chuyền","xào xạc","giặt giũ","lung linh","lưu luyến","cây dừa","nghỉ ngơi","Cúc Phương"],"Checkpoint ôn nội dung tuần 19–26: âm đầu, vần, dấu thanh và viết hoa địa danh.",True,overrides={"nghỉ ngơi":"nghĩ ngơi","Cúc Phương":"cúc phương"}),
    w(28,"Đất nước là gì?","ch / tr; ươc / ươt",["ch","tr","ươc","ươt"],["nắng chiều","thuỷ triều","che chở","trở thành","chở hàng","trở ngại","đi ngược","đi trước","vượt núi"],"Dựa vào nghĩa để chọn ch/tr; phân biệt ươc/ươt theo âm cuối c/t."),
    w(29,"Sông Hương","Viết hoa tên riêng địa lí Việt Nam",[],["Hà Giang","Thanh Hoá","Kiên Giang","Hà Nội","Khánh Hoà","Cà Mau","Phú Thọ","Nghệ An","Nha Trang"],"Tên riêng địa lí Việt Nam được viết hoa chữ cái đầu của mỗi tiếng tạo thành tên.",overrides={"Hà Giang":"hà Giang","Thanh Hoá":"Thanh hoá","Kiên Giang":"Kiên giang","Hà Nội":"hà nội","Khánh Hoà":"khánh hoà","Cà Mau":"cà mau","Phú Thọ":"phú thọ","Nghệ An":"nghệ an","Nha Trang":"nha trang"}),
    w(30,"Nhà rông","s / x; dấu hỏi / dấu ngã",["s","x"],["sơ lược","xơ xác","sơ sài","xơ cứng","sơ suất","sơ đồ","cảng Mới","rẽ màn","giãy đành đạch"],"Phân biệt s/x và ghi đúng dấu hỏi, dấu ngã theo nghĩa của tiếng.",overrides={"cảng Mới":"cãng Mới","rẽ màn":"rẻ màn","giãy đành đạch":"giảy đành đạch"}),
    w(31,"Hai Bà Trưng","ch / tr và các nhóm tiếng",["ch","tr"],["trú ẩn","chú trọng","chú ý","chăm chú","trợ giúp","hỗ trợ","hội chợ","viện trợ","chợ nổi"],"Dựa vào nghĩa để chọn ch/tr trong các nhóm trú/chú và trợ/chợ."),
    w(32,"Ngọn lửa Ô-lim-pích","Viết hoa tên người Việt Nam và nước ngoài",[],["Vích-to Huy-gô","Liu-xi-a","Oan-tơ","Pu-skin","Va-li-a","Đác-uyn","Va-li-a","Đác-uyn","Vích-to Huy-gô"],"Viết hoa tên người; với tên nước ngoài phiên âm, viết hoa bộ phận tên và dùng dấu gạch nối đúng chỗ.",question_prompts=["Viết lại cho đúng: “vích-to huy-gô”.","Viết lại cho đúng: “liu-xi-a”.","Viết lại cho đúng: “oan-tơ”.","Viết lại cho đúng: “pu-skin”.","Viết lại cho đúng: “Va-Li-a”.","Viết lại cho đúng: “Đác-Uyn”.","Chọn tên viết đúng: “Va-li-a” hay “Va-Li-a”?","Chọn tên viết đúng: “Đác-uyn” hay “Đác-Uyn”?","Thử thách: sửa các chữ viết hoa trong “vích-to huy-gô”."]),
    w(33,"Thư của ông Trái Đất gửi các bạn nhỏ","r / d / gi; dấu hỏi / dấu ngã",["gi","r","d"],["dành phần","rành việc","giành chiến thắng","rừng dừa","Dải Ngân Hà","suối chảy róc rách","sương giăng","thảo nguyên","dã ngoại"],"Dựa vào nghĩa để chọn r/d/gi và ghi đúng dấu hỏi, dấu ngã.",overrides={"thảo nguyên":"thão nguyên"}),
    w(34,"Bác sĩ Y-éc-xanh","Viết tên người và địa lí nước ngoài",[],["Ê-li-át","An-đéc-xen","Si-skin","Oan Đi-xni","Y-éc-xanh","Cô-li-a","Ô-lim-pi-a","Hy Lạp","Xơ-un"],"Tên riêng nước ngoài phiên âm thường viết hoa bộ phận tên và nối các tiếng trong một bộ phận bằng gạch nối.",overrides={"Ê-li-át":"ê-li-át","An-đéc-xen":"an-đéc-xen","Si-skin":"si-skin","Oan Đi-xni":"oan đi-xni","Y-éc-xanh":"Y-éc-Xanh","Cô-li-a":"Cô-li-A","Ô-lim-pi-a":"ô-lim-pi-a","Hy Lạp":"Hy lạp","Xơ-un":"Xơ-Un"}),
    w(35,"Ôn tập và đánh giá cuối năm","Final Boss",["ngh","gh","tr","x","gi","ươu"],["nghe nhạc","ghi chép","truyền thống","xào xạc","giành chiến thắng","bầy hươu","Hà Giang","Vích-to Huy-gô","Y-éc-xanh"],"Final Boss ôn toàn bộ âm đầu, vần, dấu thanh và cách viết hoa đã học trong 35 tuần.",True,overrides={"Hà Giang":"hà giang","Vích-to Huy-gô":"vích-to huy-gô","Y-éc-xanh":"Y-éc-Xanh"}),
]

CAPITALIZATION_QUESTIONS = {
    21: set(range(1,6)),
    29: set(range(1,10)),
    32: set(range(1,10)),
    34: set(range(1,10)),
}


def uid(seed: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "chinhta-lop3:" + seed))


def dump(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def user_says(seed: str, phrases, annotation=None):
    result = []
    for i, phrase in enumerate(dict.fromkeys(phrases)):
        data = [{"text": phrase, "userDefined": False}]
        if annotation:
            data = [{"text": phrase, "alias": annotation, "meta": "@sys.any", "userDefined": True}]
        result.append({"id": uid(seed + f":phrase:{i}"), "data": data,
                       "isTemplate": False, "count": 0, "updated": 0})
    return result


def ctx(name, lifespan=5, parameters=None):
    c = {"name": name, "lifespan": lifespan}
    if parameters:
        c["parameters"] = parameters
    return c


EVENT_TYPES = {
    "answer_correct": "ANSWER_RESULT",
    "answer_wrong": "ANSWER_RESULT",
    "hint_used": "HINT_USED",
    "week_complete": "WEEK_COMPLETE",
    "progress_requested": "GET_PROGRESS",
    "score_requested": "GET_SCORE",
    "leaderboard_requested": "GET_LEADERBOARD",
    "badges_requested": "GET_BADGES",
    "ai_explain": "AI_EXPLAIN",
    "ai_feedback": "AI_FEEDBACK",
    "ai_analyze_mistake": "AI_ANALYZE_MISTAKE",
    "ai_create_similar_question": "AI_CREATE_SIMILAR_QUESTION",
}


def payload(week=0, topic="", event="session_state", *, webhook_enabled=False,
            event_type=None, **updates):
    state = {"studentId": "$studentId", "week": week, "currentWeek": week, "topic": topic,
             "questionId": "", "correct": False, "attempt": 0, "hintLevel": 0,
             "difficulty": "basic", "questionLevel": "basic", "xpEarned": 0,
             "correctCount": 0, "wrongCount": 0, "score": 0,
             "masterySignal": "collecting"}
    state.update(updates)
    technical_event = event_type or EVENT_TYPES.get(event, "")
    return {"type": 4, "lang": "vi", "payload": {
        "schemaVersion": "3.0", "action": technical_event,
        "eventType": technical_event, "eventId": "",
        "eventIdPolicy": "WEB_OR_BACKEND_DERIVED",
        "event": event, "week": state["week"], "topic": state["topic"],
        "questionId": state["questionId"], "correctAnswer": state.get("correctAnswer", ""),
        "correct": state["correct"],
        "attempt": state["attempt"], "hintLevel": state["hintLevel"],
        "difficulty": state["difficulty"], "sessionState": state,
        "xpPolicy": {"scope": "current_question_only", "totalXP": "WEBHOOK_DATABASE_REQUIRED"},
        "webhook": {"action": technical_event, "enabled": webhook_enabled,
                    "responsibility": "Persist totalXP, weeklyXP, progress and streaks"}}}


def add_intent(name, speech, phrases=None, inputs=None, outputs=None, *, fallback=False,
               events=None, priority=500000, state_payload=None, webhook=False,
               reset_contexts=False, action_name=""):
    iid = uid("intent:" + name)
    messages = [{"type": 0, "lang": "vi", "speech": speech if isinstance(speech, list) else [speech]}]
    if state_payload is not None:
        messages.append(state_payload)
    obj = {"id": iid, "name": name, "auto": True, "contexts": inputs or [],
           "responses": [{"resetContexts": reset_contexts, "action": action_name,
                          "affectedContexts": outputs or [], "parameters": [],
                          "messages": messages, "defaultResponsePlatforms": {}, "speech": []}],
           "priority": priority, "webhookUsed": webhook, "webhookForSlotFilling": False,
           "fallbackIntent": fallback, "events": [{"name": e} for e in (events or [])]}
    dump(OUT / "intents" / f"{name}.json", obj)
    dump(OUT / "intents" / f"{name}_usersays_vi.json", user_says(name, phrases or []))


def blank_word(word, focuses):
    tone_map = str.maketrans(
        "áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ",
        "aaaaaăăăăăâââââeeeeeêêêêêiiiiioooooôôôôôơơơơơuuuuuưưưưưyyyyy")
    normalized_word = word.lower().translate(tone_map)
    for f in sorted(focuses, key=len, reverse=True):
        normalized_focus = f.lower().translate(tone_map)
        m = re.search(r"(?<!\w)" + re.escape(normalized_focus), normalized_word)
        if m:
            return word[:m.start()] + "_" + word[m.end():], f
        m = re.search(re.escape(normalized_focus), normalized_word)
        if m:
            return word[:m.start()] + "_" + word[m.end():], f
    return word, ""


def capitalization_prompt(answer, supplied_wrong, week_no, question_no):
    lowered = answer.lower()
    first_only = lowered[:1].upper() + lowered[1:]
    candidates = [supplied_wrong, lowered, first_only, answer.upper()]
    wrong_options = []
    for candidate in candidates:
        if candidate and candidate != answer and candidate not in wrong_options:
            wrong_options.append(candidate)
        if len(wrong_options) == 2:
            break
    if len(wrong_options) != 2:
        raise ValueError(f"Không tạo đủ phương án sai cho {answer}")
    correct_index = (week_no + question_no) % 3
    options = wrong_options[:]
    options.insert(correct_index, answer)
    letters = ("A","B","C")
    prompt = "Tên nào viết đúng?\n" + "\n".join(
        f"{letter}. {option}" for letter,option in zip(letters,options))
    return prompt,letters[correct_index]


def make_questions(week):
    labels = ["example", "example", "basic", "basic", "basic", "medium", "medium", "hard", "challenge"]
    questions = []
    for i, (answer, level) in enumerate(zip(week["words"], labels), 1):
        custom_prompt = week["question_prompts"][i-1] if len(week["question_prompts"]) >= i else None
        wrong = week["overrides"].get(answer)
        is_capitalization = i in CAPITALIZATION_QUESTIONS.get(week["week"],set())
        correct_option = None
        if is_capitalization:
            prompt,correct_option = capitalization_prompt(answer,wrong,week["week"],i)
            focus = "viết hoa tên riêng"
        elif custom_prompt:
            prompt = custom_prompt
            focus = week["topic"]
        elif wrong:
            prompt = f'Viết lại cho đúng: “{wrong}”.'
            focus = "viết hoa và dấu gạch nối"
        else:
            cloze, focus = blank_word(answer, week["focus"])
            if focus:
                choices = "/".join(week["focus"])
                prompt = f'Điền {choices} để hoàn thành từ hoặc cụm từ: “{cloze}”.'
            else:
                prompt = f'Chọn cách viết đúng cho nội dung thuộc chủ điểm “{week["topic"]}”.'
                focus = week["topic"]
        questions.append({"n": i, "answer": answer, "prompt": prompt, "focus": focus,
                          "level": level, "capitalization": is_capitalization,
                          "correctOption": correct_option})
    return questions


def accepted_answers(item):
    """Exact phrases accepted by both Dialogflow training and the backend authority."""
    answer = item["answer"]
    if item.get("capitalization"):
        option = item["correctOption"]
        return [option, option.lower(), f"phương án {option}",
                f"phương án {option.lower()}", answer]
    phrases = [answer, answer.lower(), f"em chọn {answer}", f"đáp án là {answer}"]
    if item["focus"] and item["focus"] != "viết hoa và dấu gạch nối":
        phrases.append(item["focus"])
    return list(dict.fromkeys(phrases))


def question_definition(week, item, question_id):
    near = item["answer"][0] + "…" if item["answer"] else "…"
    accepted = accepted_answers(item)
    case_sensitive = bool(item.get("capitalization"))
    normalized = [" ".join(unicodedata.normalize("NFC", value).strip().split())
                  for value in accepted]
    if not case_sensitive:
        normalized = [value.lower() for value in normalized]
    return {
        "questionId": question_id,
        "week": week["week"],
        "topic": week["topic"],
        "prompt": item["prompt"],
        "correctAnswer": item["answer"],
        "acceptedAnswers": accepted,
        "normalizedAcceptedAnswers": normalized,
        "answerType": "multiple_choice" if item.get("capitalization") else "cloze",
        "questionLevel": item["level"],
        "caseSensitive": case_sensitive,
        "accentSensitive": True,
        "hyphenSensitive": True,
        "hint1": week["theory"],
        "hint2": f"Tập trung vào {item['focus']} và đọc trọn từ.",
        "hint3": f"Đáp án bắt đầu gần như {near}; em hãy tự viết đầy đủ.",
    }


def write_question_catalog():
    rows = []
    support_map = {1: (2, 4), 3: (4, 1), 6: (7, 3)}
    for week in WEEKS:
        questions = make_questions(week)
        for item in questions:
            rows.append(question_definition(
                week, item, f"W{week['week']:02d}_Q{item['n']:02d}"))
        for _, (resume_idx, support_index) in support_map.items():
            rows.append(question_definition(
                week, questions[support_index],
                f"W{week['week']:02d}_SUPPORT_Q{resume_idx:02d}"))
    content = (
        "// Generated by tools/build_chinhta_agent.py. Do not edit by hand.\n"
        "export const dialogflowQuestionCatalog = "
        + json.dumps(rows, ensure_ascii=False, indent=2)
        + " as const;\n"
    )
    QUESTION_CATALOG.parent.mkdir(parents=True, exist_ok=True)
    QUESTION_CATALOG.write_text(content, encoding="utf-8")


def build_globals():
    add_intent("Default Welcome Intent", "Xin chào! 👋\nMình là trợ lý Chính tả lớp 3. Chúng ta sẽ cùng chinh phục hành trình 35 tuần. Em có thể nói: Bắt đầu, Học tuần 1, Menu, hoặc Xem tiến độ.",
               events=["WELCOME"], state_payload=payload())
    add_intent("Default Fallback Intent", "Mình chưa hiểu ý em lắm 😄 Nếu đang làm bài, em có thể nhập đáp án, nói ‘gợi ý’ hoặc ‘thử lại’. Nếu muốn chọn bài, hãy nói ‘Học tuần 1’.", fallback=True)
    add_intent("Global_Start", "Sẵn sàng rồi! Em hãy nói ‘Học tuần 1’ hoặc chọn một tuần từ 1 đến 35.", ["bắt đầu","học thôi","vào bài","bắt đầu học","em muốn học","chơi thôi"])
    add_intent("Global_Hint", "Mình chỉ đưa gợi ý khi em đang ở một câu hỏi. Hãy chọn tuần và bắt đầu câu hỏi nhé!", ["gợi ý","cho em gợi ý","em chưa biết","khó quá","gợi ý cho em"], priority=100000)
    add_intent("Global_Retry", "Được rồi, em hãy nhập lại đáp án của câu hiện tại nhé.", ["làm lại","thử lại","cho em làm lại","em thử lại"])
    add_intent("Global_Menu", "Menu hành trình: tuần 9 và 27 là Checkpoint; tuần 18 và 35 là Boss. Em hãy nói ‘Học tuần 1’ hoặc một tuần từ 1 đến 35.", ["menu","về menu","chọn tuần","danh sách tuần"], reset_contexts=True)
    add_intent("Global_Progress", "Mít đang kiểm tra tiến độ đã lưu. Nếu kết nối tạm gián đoạn, em vẫn có thể chọn tuần và học tiếp nhé.", ["xem tiến độ","xem thành tích","tiến độ","em học đến đâu","thành tích của em"],
               webhook=True,state_payload=payload(event="progress_requested",webhook_enabled=True,masterySignal="webhook_required"))
    add_intent("Global_Score", "Mít đang kiểm tra XP, level, streak và huy hiệu của em.",
               ["xem điểm","điểm của em","xem xp","level của em","xem streak"],
               webhook=True,state_payload=payload(event="score_requested",webhook_enabled=True,masterySignal="webhook_required"))
    add_intent("Global_Leaderboard", "Mít đang tải bảng xếp hạng. Nếu chưa có lớp, hệ thống sẽ dùng bảng toàn thời gian.",
               ["bảng xếp hạng","xem bảng xếp hạng","top lớp","ai nhiều xp nhất"],
               webhook=True,state_payload=payload(event="leaderboard_requested",webhook_enabled=True,masterySignal="webhook_required"))
    add_intent("Global_Badges", "Mít đang kiểm tra các huy hiệu em đã đạt.",
               ["xem huy hiệu","huy hiệu của em","em có huy hiệu gì"],
               webhook=True,state_payload=payload(event="badges_requested",webhook_enabled=True,masterySignal="webhook_required"))
    add_intent("Global_Exit", "Đã dừng phiên học. Hẹn gặp lại em!", ["thoát","dừng học","kết thúc"], reset_contexts=True)
    for name, phrase, response, ai_event in [
        ("AI_Explain","giải thích bằng ai","Mít chưa kết nối được phần giải thích AI. Em có thể dùng ba tầng gợi ý trong câu hỏi.","ai_explain"),
        ("AI_Feedback","ai nhận xét bài em","Mít chưa kết nối được phần nhận xét AI. Kết quả đúng/sai và XP vẫn do hệ thống lưu.","ai_feedback"),
        ("AI_CreateSimilarQuestion","tạo câu tương tự","Mít chưa tạo được câu mới. Em hãy tiếp tục câu luyện trong tuần nhé.","ai_create_similar_question"),
        ("AI_AnalyzeMistake","phân tích lỗi của em","Mít chưa phân tích sâu được lúc này. Em hãy đọc lại quy tắc và dùng gợi ý nhé.","ai_analyze_mistake")]:
        add_intent(name,response,[phrase],webhook=True,
                   state_payload=payload(event=ai_event,webhook_enabled=True,masterySignal="ai_pending"),
                   action_name={"AI_Explain":"ai_explain","AI_Feedback":"ai_feedback",
                                "AI_CreateSimilarQuestion":"ai_create_similar_question",
                                "AI_AnalyzeMistake":"ai_analyze_mistake"}[name])


def build_week(week):
    n, topic = week["week"], week["topic"]
    p = f"W{n:02d}"
    active = f"week{n:02d}_active"
    theory_ctx = f"week{n:02d}_theory"
    wrong_once = f"week{n:02d}_wrong_once"
    streak_broken = f"week{n:02d}_streak_broken"
    support_needed = f"week{n:02d}_support_needed"
    hint1_ctx = f"week{n:02d}_hint1"
    hint2_ctx = f"week{n:02d}_hint2"
    hint3_ctx = f"week{n:02d}_hint3"
    mode = "BOSS" if week["boss"] else "LEVEL"
    q = make_questions(week)

    def label(item):
        labels = {"example":"Ví dụ", "basic":"Cơ bản", "medium":"Trung bình",
                  "hard":"Câu khó", "challenge":"Thử thách"}
        return labels[item["level"]]

    def qparams(item, *, attempt=1, hint_level=0, xp=10, wrong_count=0,
                difficulty=None, mastery="collecting"):
        near = item["answer"][0] + "…" if item["answer"] else "…"
        return {"questionId": f"W{n:02d}_Q{item['n']:02d}", "prompt": item["prompt"],
                "correctAnswer": item["answer"],
                "hint1Text": week["theory"],
                "hint2Text": f"Tập trung vào {item['focus']} và đọc trọn từ.",
                "hint3Text": f"Đáp án bắt đầu gần như {near}; em hãy tự viết đầy đủ.",
                "attempt": attempt, "hintLevel": hint_level, "xpEarned": xp,
                "correctCount": 0, "wrongCount": wrong_count, "score": 0,
                "difficulty": difficulty or item["level"], "questionLevel": item["level"],
                "masterySignal": mastery}

    def copied_state(**changes):
        base = {key: f"#{active}.{key}" for key in
                ("questionId","prompt","correctAnswer","hint1Text","hint2Text","hint3Text",
                 "attempt","hintLevel","xpEarned","correctCount","wrongCount",
                 "score","difficulty","questionLevel","masterySignal")}
        base.update(changes)
        return base

    def clear_turn_markers(clear_support=False):
        values = [ctx(wrong_once,0),ctx(hint1_ctx,0),ctx(hint2_ctx,0),ctx(hint3_ctx,0)]
        if clear_support:
            values.extend([ctx(streak_broken,0),ctx(support_needed,0)])
        return values

    def ask_outputs(item, clear_old=None, clear_support=False):
        outputs = []
        if clear_old:
            outputs.append(ctx(clear_old,0))
        outputs.extend(clear_turn_markers(clear_support))
        outputs.extend([ctx(active,99,qparams(item)),ctx(f"week{n:02d}_question{item['n']:02d}",12)])
        return outputs

    def answer_payload(signal="advance", event="answer_correct", correct_answer=""):
        return payload(n,topic,event=event,webhook_enabled=True,
                       questionId=f"#{active}.questionId",correctAnswer=correct_answer,
                       correct=True,attempt=f"#{active}.attempt",hintLevel=f"#{active}.hintLevel",
                       xpEarned=f"#{active}.xpEarned",correctCount=1,
                       wrongCount=f"#{active}.wrongCount",score=f"#{active}.xpEarned",
                       difficulty=f"#{active}.difficulty",questionLevel=f"#{active}.questionLevel",
                       masterySignal=signal)

    first = f"week{n:02d}_question01"
    add_intent(f"{p}_Start", f"🎮 {mode} {n}: {week['title']}. Trọng tâm: {topic}.\n📘 {week['theory']}\nEm hiểu rồi chứ?",
               [f"học tuần {n}",f"tuần {n}",f"bắt đầu tuần {n}",f"level {n}",f"mở tuần {n}"],
               outputs=[ctx(theory_ctx,8)], reset_contexts=True,
               state_payload=payload(n,topic,event="week_started",difficulty="basic",questionLevel="theory"))
    add_intent(f"{p}_Understood_Yes", f"Tốt lắm! Ví dụ 1/2: {q[0]['prompt']}", ["có","rồi","em hiểu rồi","hiểu","ok","sẵn sàng"],
               inputs=[theory_ctx], outputs=[ctx(theory_ctx,0),ctx(active,99,qparams(q[0])),ctx(first,12)],
               state_payload=payload(n,topic,event="question_started",questionId=f"W{n:02d}_Q01",difficulty="example",questionLevel="example"))
    add_intent(f"{p}_Understood_No", f"Không sao 🌱 {week['theory']} Hãy nhìn phần cần điền, đọc cả từ rồi thử chọn. Khi sẵn sàng, nói ‘em hiểu rồi’.",
               ["chưa","em chưa hiểu","không hiểu","chưa hiểu"], inputs=[theory_ctx], outputs=[ctx(theory_ctx,8)], state_payload=payload(n,topic,event="theory_support",masterySignal="support"))

    for idx, item in enumerate(q, 1):
        qctx = f"week{n:02d}_question{idx:02d}"
        answer = item["answer"]
        if idx == 3:
            nxt = q[5]  # fast track: basic -> medium
        elif idx == 6:
            nxt = q[7]  # fast track: medium -> hard
        elif idx < len(q):
            nxt = q[idx]
        else:
            nxt = None
        phrases = accepted_answers(item)
        if nxt is None:
            speech = ("🎯 Chính xác! XP câu này sẽ được webhook cập nhật.\n"
                      f"🏆 Hoàn thành {mode} {n}! Thưởng hoàn thành: +30 XP. "
                      "Các delta XP đã được gửi trong payload; tổng XP tuần và bonus không dùng gợi ý cần webhook/database cộng và lưu.")
            outputs = [ctx(qctx,0),ctx(active,0),ctx(f"week{n:02d}_complete",99)] + clear_turn_markers(True)
            signal = "week_complete"
            event = "week_complete"
        else:
            speech = f"🎯 Chính xác! XP câu này sẽ được webhook cập nhật.\n{label(nxt)}: {nxt['prompt']}"
            outputs = ask_outputs(nxt, clear_old=qctx)
            signal = "fast_track" if idx in (3,6) else "advance"
            event = "answer_correct"
        correct_payload = answer_payload(signal,event,answer)
        if nxt is not None:
            correct_payload["payload"]["nextQuestion"] = {
                "questionId": f"W{n:02d}_Q{nxt['n']:02d}", "prompt": nxt["prompt"]}
        if event == "week_complete":
            correct_payload["payload"]["rewards"] = {
                "completionBonusXP": 30,
                "noHintBonusXP": 20,
                "noHintBonusEligibility": "WEBHOOK_EVALUATED"
            }
        add_intent(f"{p}_Q{idx:02d}_Correct", speech, phrases, inputs=[active,qctx], outputs=outputs,
                   priority=700000, state_payload=correct_payload,webhook=True)

        # A real adaptive detour is available at Q1, Q3 and Q6.
        if idx in (1,3,6):
            resume_idx = {1:2,3:4,6:7}[idx]
            support_ctx = f"week{n:02d}_basic_support_q{resume_idx:02d}"
            # Use a different, source-derived item so remediation tests the rule,
            # not the answer the learner has just seen.
            support_item = q[{1:4,3:1,6:3}[idx]]
            support_params = qparams(support_item,difficulty="basic_support",mastery="remedial")
            support_params["questionId"] = f"W{n:02d}_SUPPORT_Q{resume_idx:02d}"
            support_params["prompt"] = f"Câu hỗ trợ: {support_item['prompt']}"
            support_payload = answer_payload("basic_support",correct_answer=answer)
            support_payload["payload"]["nextQuestion"] = {
                "questionId": support_params["questionId"], "prompt": support_params["prompt"]}
            add_intent(f"{p}_Q{idx:02d}_Correct_To_Support",
                       f"✨ Em sửa đúng rồi! XP sẽ được webhook cập nhật. Mình luyện một câu hỗ trợ trước nhé. {support_params['prompt']}",
                       phrases, inputs=[active,qctx,support_needed],
                       outputs=[ctx(qctx,0),ctx(active,99,support_params),ctx(support_ctx,12)] + clear_turn_markers(False),
                       priority=1000000, state_payload=support_payload,webhook=True)
            return_payload = answer_payload("return_to_main",correct_answer=support_item["answer"])
            return_payload["payload"]["nextQuestion"] = {
                "questionId": f"W{n:02d}_Q{resume_idx:02d}", "prompt": q[resume_idx-1]["prompt"]}
            add_intent(f"{p}_Support_Q{resume_idx:02d}_Correct",
                       f"🌱 Đúng rồi! XP câu hỗ trợ sẽ được webhook cập nhật. Quay lại luồng chính. {label(q[resume_idx-1])}: {q[resume_idx-1]['prompt']}",
                       accepted_answers(support_item),
                       inputs=[active,support_ctx],
                       outputs=ask_outputs(q[resume_idx-1],clear_old=support_ctx,clear_support=True),
                       priority=900000,state_payload=return_payload,webhook=True)

        # One mistake breaks the fast streak but does not yet force remediation.
        if idx in (3,6):
            normal_next = q[3] if idx == 3 else q[6]
            steady_payload = answer_payload("steady_path",correct_answer=answer)
            steady_payload["payload"]["nextQuestion"] = {
                "questionId": f"W{n:02d}_Q{normal_next['n']:02d}", "prompt": normal_next["prompt"]}
            add_intent(f"{p}_Q{idx:02d}_Correct_Steady_Path",
                       f"🎯 Đúng rồi! XP câu này sẽ được webhook cập nhật. Mình củng cố thêm nhé. {label(normal_next)}: {normal_next['prompt']}",
                       phrases,inputs=[active,qctx,streak_broken],
                       outputs=ask_outputs(normal_next,clear_old=qctx,clear_support=True),
                       priority=950000,state_payload=steady_payload,webhook=True)

    # Shared wrong-answer handling for every question in this week.
    add_intent(f"{p}_Wrong_First", "Gần đúng rồi 🌱 Em thử lại nhé, hoặc nói ‘gợi ý’.", [],
               inputs=[active], outputs=[ctx(active,99,copied_state(attempt=2,wrongCount=1,xpEarned=8,score=0,masterySignal="retry")),ctx(wrong_once,20),ctx(streak_broken,99)],
               fallback=True,priority=700000,webhook=True,state_payload=payload(n,topic,event="answer_wrong",webhook_enabled=True,questionId=f"#{active}.questionId",correctAnswer=f"#{active}.correctAnswer",attempt=2,hintLevel=f"#{active}.hintLevel",xpEarned=8,correctCount=0,wrongCount=1,score=0,difficulty=f"#{active}.difficulty",questionLevel=f"#{active}.questionLevel",masterySignal="retry"))
    add_intent(f"{p}_Wrong_Again", "Mình thấy câu này còn khó. Em sẽ được chuyển qua bài hỗ trợ sau khi sửa đúng. Hãy thử lại hoặc xin gợi ý.", [],
               inputs=[active,wrong_once], outputs=[ctx(active,99,copied_state(attempt=3,wrongCount=2,xpEarned=5,score=0,difficulty="basic_support",masterySignal="remediate")),ctx(wrong_once,20),ctx(streak_broken,99),ctx(support_needed,99)],
               fallback=True,priority=980000,webhook=True,state_payload=payload(n,topic,event="answer_wrong",webhook_enabled=True,questionId=f"#{active}.questionId",correctAnswer=f"#{active}.correctAnswer",attempt=3,hintLevel=f"#{active}.hintLevel",xpEarned=5,correctCount=0,wrongCount=2,score=0,difficulty="basic_support",questionLevel=f"#{active}.questionLevel",masterySignal="remediate"))
    add_intent(f"{p}_Wrong_After_Hint1", "Em đã dùng gợi ý 1 và vẫn chưa đúng. Mình đánh dấu cần hỗ trợ; em thử lại nhé.", [],
               inputs=[active,hint1_ctx], outputs=[ctx(active,99,copied_state(attempt=3,wrongCount=1,xpEarned=5,score=0,difficulty="basic_support",masterySignal="remediate")),ctx(streak_broken,99),ctx(support_needed,99),ctx(hint1_ctx,20)],
               fallback=True,priority=970000,webhook=True,state_payload=payload(n,topic,event="answer_wrong",webhook_enabled=True,questionId=f"#{active}.questionId",correctAnswer=f"#{active}.correctAnswer",attempt=3,hintLevel=1,xpEarned=5,correctCount=0,wrongCount=1,score=0,difficulty="basic_support",questionLevel=f"#{active}.questionLevel",masterySignal="remediate"))
    add_intent(f"{p}_Wrong_After_Support_Signal", "Không sao, mình vẫn ở câu này. Em đọc lại gợi ý rồi thử thêm một lần nhé.", [],
               inputs=[active,support_needed], outputs=[ctx(active,99,copied_state(attempt=4,wrongCount=2,xpEarned=3,score=0,difficulty="basic_support",masterySignal="remediate")),ctx(streak_broken,99),ctx(support_needed,99)],
               fallback=True,priority=990000,webhook=True,state_payload=payload(n,topic,event="answer_wrong",webhook_enabled=True,questionId=f"#{active}.questionId",correctAnswer=f"#{active}.correctAnswer",attempt=4,hintLevel=f"#{active}.hintLevel",xpEarned=3,correctCount=0,wrongCount=2,score=0,difficulty="basic_support",questionLevel=f"#{active}.questionLevel",masterySignal="remediate"))

    # Three reusable hint intents per week. The webhook resolves direct text from
    # the generated question catalog and persists one idempotent HINT_USED event.
    add_intent(f"{p}_Hint_1", "💡 Mít đang mở gợi ý 1 cho câu hiện tại. Em thử lại nhé.",
               ["gợi ý","cho em gợi ý","em chưa biết","khó quá"],inputs=[active],
               outputs=[ctx(active,99,copied_state(hintLevel=1,xpEarned=7,masterySignal="support")),ctx(hint1_ctx,20),ctx(streak_broken,99)],priority=800000,
               webhook=True,state_payload=payload(n,topic,event="hint_used",webhook_enabled=True,questionId=f"#{active}.questionId",attempt=f"#{active}.attempt",hintLevel=1,xpEarned=7,correctCount=0,wrongCount=f"#{active}.wrongCount",score=0,difficulty=f"#{active}.difficulty",questionLevel=f"#{active}.questionLevel",masterySignal="support"))
    add_intent(f"{p}_Hint_2", "💡 Mít đang mở gợi ý 2 cho câu hiện tại. Em thử lại nhé.",
               ["gợi ý","gợi ý tiếp","cho em thêm gợi ý"],inputs=[active,hint1_ctx],
               outputs=[ctx(active,99,copied_state(hintLevel=2,xpEarned=5,difficulty="basic_support",masterySignal="remediate")),ctx(hint1_ctx,0),ctx(hint2_ctx,20),ctx(streak_broken,99),ctx(support_needed,99)],priority=900000,
               webhook=True,state_payload=payload(n,topic,event="hint_used",webhook_enabled=True,questionId=f"#{active}.questionId",attempt=f"#{active}.attempt",hintLevel=2,xpEarned=5,correctCount=0,wrongCount=f"#{active}.wrongCount",score=0,difficulty="basic_support",questionLevel=f"#{active}.questionLevel",masterySignal="remediate"))
    add_intent(f"{p}_Hint_3", "💡 Mít đang mở gợi ý 3 cho câu hiện tại.",
               ["gợi ý","gợi ý cuối","em vẫn chưa biết"],inputs=[active,hint2_ctx],
               outputs=[ctx(active,99,copied_state(hintLevel=3,xpEarned=3,difficulty="basic_support",masterySignal="remediate")),ctx(hint2_ctx,0),ctx(hint3_ctx,20),ctx(streak_broken,99),ctx(support_needed,99)],priority=1000000,
               webhook=True,state_payload=payload(n,topic,event="hint_used",webhook_enabled=True,questionId=f"#{active}.questionId",attempt=f"#{active}.attempt",hintLevel=3,xpEarned=3,correctCount=0,wrongCount=f"#{active}.wrongCount",score=0,difficulty="basic_support",questionLevel=f"#{active}.questionLevel",masterySignal="remediate"))
    add_intent(f"{p}_Hint_Max", "Em đã dùng đủ 3 gợi ý. Hãy tự viết đáp án đầy đủ nhé; mình tin em làm được!", ["gợi ý","gợi ý nữa","cho em đáp án"],
               inputs=[active,hint3_ctx],outputs=[ctx(hint3_ctx,20),ctx(support_needed,99)],priority=1100000,
               state_payload=payload(n,topic,event="hint_limit",questionId=f"#{active}.questionId",attempt=f"#{active}.attempt",hintLevel=3,xpEarned=3,correctCount=0,wrongCount=f"#{active}.wrongCount",score=0,difficulty="basic_support",questionLevel=f"#{active}.questionLevel",masterySignal="remediate"))


def build_entities():
    entities = {
        "ck_choice":["c","k"], "ggh_choice":["g","gh"], "ngngh_choice":["ng","ngh"],
        "chtr_choice":["ch","tr"], "sx_choice":["s","x"], "rdgi_choice":["r","d","gi"],
        "ln_choice":["l","n"], "tone_choice":["hỏi","ngã"],
        "spelling_choice":["c","k","g","gh","ng","ngh","ch","tr","s","x","r","d","gi","l","n"]}
    for name, values in entities.items():
        dump(OUT / "entities" / f"{name}.json", {"id":uid("entity:"+name),"name":name,"isOverridable":True,"isEnum":False,"automatedExpansion":False,"allowFuzzyExtraction":False})
        dump(OUT / "entities" / f"{name}_entries_vi.json", [{"value":v,"synonyms":[v,f"chữ {v}"]} for v in values])


def validate():
    errors = []
    webhook_count = 0
    webhook_globals = {"Global_Progress","Global_Score","Global_Leaderboard","Global_Badges",
                       "AI_Explain","AI_Feedback","AI_CreateSimilarQuestion","AI_AnalyzeMistake"}
    allowed_event_types = {"ANSWER_RESULT","WEEK_COMPLETE","HINT_USED","GET_PROGRESS","GET_SCORE",
                           "GET_LEADERBOARD","GET_BADGES","AI_EXPLAIN","AI_FEEDBACK",
                           "AI_ANALYZE_MISTAKE","AI_CREATE_SIMILAR_QUESTION"}
    intents = list((OUT / "intents").glob("*.json"))
    defs = [p for p in intents if not p.name.endswith("_usersays_vi.json")]
    ids, names = set(), set()
    for p in defs:
        try: obj = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e: errors.append(f"JSON {p.name}: {e}"); continue
        if obj["id"] in ids: errors.append("duplicate intent id " + obj["id"])
        if obj["name"] in names: errors.append("duplicate intent name " + obj["name"])
        ids.add(obj["id"]); names.add(obj["name"])
        usp = p.with_name(p.stem + "_usersays_vi.json")
        if not usp.exists(): errors.append("missing usersays " + p.name)
        elif "_Correct" in obj["name"]:
            rows = json.loads(usp.read_text(encoding="utf-8"))
            if any(part.get("meta") == "@sys.any" for row in rows for part in row.get("data", [])):
                errors.append(f"correct intent contains @sys.any wildcard {obj['name']}")
        should_use_webhook = (obj["name"] in webhook_globals or
                              (re.match(r"^W\d\d_",obj["name"]) and
                               ("_Correct" in obj["name"] or "_Wrong" in obj["name"] or
                                re.search(r"_Hint_[123]$", obj["name"]))))
        if obj.get("webhookUsed") != bool(should_use_webhook):
            errors.append(f"bad selective webhook flag {obj['name']}")
        if obj.get("webhookUsed"):
            webhook_count += 1
            messages = [m for r in obj.get("responses",[]) for m in r.get("messages",[])]
            if not any(m.get("type") == 0 and m.get("speech") for m in messages):
                errors.append(f"missing static fallback response {obj['name']}")
            payloads = [m.get("payload",{}) for m in messages if m.get("type") == 4]
            if len(payloads) != 1:
                errors.append(f"missing normalized webhook payload {obj['name']}")
            else:
                custom = payloads[0]
                if custom.get("schemaVersion") != "3.0": errors.append(f"bad payload schema {obj['name']}")
                if custom.get("action") not in allowed_event_types: errors.append(f"bad payload action {obj['name']}")
                if custom.get("eventType") != custom.get("action"): errors.append(f"payload action mismatch {obj['name']}")
                if "eventId" not in custom: errors.append(f"missing eventId {obj['name']}")
                if custom.get("webhook",{}).get("enabled") is not True: errors.append(f"payload webhook disabled {obj['name']}")
        for c in obj.get("contexts",[]):
            if not re.fullmatch(r"[a-z0-9_]+", c): errors.append(f"bad input context {c}")
        for response in obj.get("responses",[]):
            action = response.get("action", "")
            if not isinstance(action, str):
                errors.append(f"non-string action in {p.name}")
            elif action.strip() != action or (action and any(ch.isspace() for ch in action)):
                errors.append(f"action contains whitespace in {p.name}: {action!r}")
            elif action and not re.fullmatch(r"[a-z0-9_]+", action):
                errors.append(f"unsafe action format in {p.name}: {action!r}")
            for message in response.get("messages", []):
                if message.get("type") == 0:
                    speeches = message.get("speech", [])
                    if isinstance(speeches, str): speeches = [speeches]
                    if any(re.search(r"#[a-z0-9_]+\.[a-zA-Z0-9_]+", speech)
                           for speech in speeches if isinstance(speech, str)):
                        errors.append(f"raw context placeholder in response {obj['name']}")
            for c in response.get("affectedContexts",[]):
                if c.get("lifespan",-1) < 0: errors.append(f"bad lifespan {p.name}")
    entity_defs = [p for p in (OUT / "entities").glob("*.json") if "_entries_" not in p.name]
    entity_ids=set()
    for p in entity_defs:
        obj=json.loads(p.read_text(encoding="utf-8"))
        if obj["id"] in entity_ids: errors.append("duplicate entity id " + obj["id"])
        entity_ids.add(obj["id"])
        if not p.with_name(p.stem+"_entries_vi.json").exists(): errors.append("missing entries " + p.name)
    if len(WEEKS)!=35 or [x["week"] for x in WEEKS] != list(range(1,36)): errors.append("weeks are incomplete")
    catalog_ids = []
    for week in WEEKS:
        questions = make_questions(week)
        catalog_ids.extend(f"W{week['week']:02d}_Q{item['n']:02d}" for item in questions)
        catalog_ids.extend(f"W{week['week']:02d}_SUPPORT_Q{resume:02d}" for resume in (2,4,7))
        for item in questions:
            if not accepted_answers(item): errors.append(f"question lacks accepted answers W{week['week']:02d}_Q{item['n']:02d}")
    if len(catalog_ids) != len(set(catalog_ids)): errors.append("duplicate question ids")
    if errors: raise SystemExit("VALIDATION FAILED\n"+"\n".join(errors))
    return len(defs), len(entity_defs), webhook_count


def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    dump(OUT/"agent.json", {"description":"Chatbot học Chính tả lớp 3 theo chương trình Tiếng Việt 3 Kết nối tri thức, gồm 35 tuần, tích hợp gamification và hỗ trợ adaptive learning.","language":"vi","shortDescription":"Hành trình Chính tả lớp 3 gồm 35 level","examples":"Học tuần 1; gợi ý; xem thành tích","linkToDocs":"","displayName":"ChinhTaLop3_Gamified","disableInteractionLogs":False,"disableStackdriverLogs":True,"defaultTimezone":"Asia/Ho_Chi_Minh","isPrivate":True,"mlMinConfidence":0.35,"supportedLanguages":[],"onePlatformApiVersion":"v2","analyzeQueryTextSentiment":False,"enabledKnowledgeBaseNames":[],"knowledgeServiceConfidenceAdjustment":-0.4,"dialogBuilderMode":False,"baseActionPackagesUrl":""})
    dump(OUT/"package.json", {"version":"1.0.0"})
    dump(OUT/"week_content.json", {"source":["chinh-ta-tieng-viet-3-tap-1.docx","chinh-ta-tieng-viet-3-tap-2.docx"],"weeks":[{**x,"questions":make_questions(x)} for x in WEEKS]})
    write_question_catalog()
    build_globals(); build_entities()
    for week in WEEKS: build_week(week)
    ni, ne, nw = validate()
    DIST.parent.mkdir(parents=True, exist_ok=True)
    if DIST.exists(): DIST.unlink()
    with zipfile.ZipFile(DIST,"w",zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(OUT.rglob("*")):
            if p.is_file() and p.name != "week_content.json": zf.write(p,p.relative_to(OUT).as_posix())
    with zipfile.ZipFile(DIST) as zf:
        bad=zf.testzip()
        roots=set(x.split('/')[0] for x in zf.namelist())
        if bad or "agent.json" not in zf.namelist() or "package.json" not in zf.namelist():
            raise SystemExit(f"ZIP validation failed: {bad}, roots={roots}")
    report={"zip":str(DIST),"intents":ni,"entities":ne,"webhookEnabledIntents":nw,
            "weeks":[{"week":x["week"],"title":x["title"],"topic":x["topic"]} for x in WEEKS],"zipBytes":DIST.stat().st_size}
    dump(ROOT/"dist"/"build_report_v7.json",report)
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__ == "__main__": main()
