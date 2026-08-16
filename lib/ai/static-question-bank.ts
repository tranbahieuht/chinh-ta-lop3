import type { CreateSimilarQuestionInput } from "./spelling-ai.ts";
import type { GeneratedQuestionResponse } from "./schemas.ts";
import { validateGeneratedQuestion } from "./question-validator.ts";

type BankEntry = Omit<GeneratedQuestionResponse, "difficulty">;

const BANK: Array<{ matches: RegExp; entries: BankEntry[] }> = [
  {
    matches: /c\s*[/_-]\s*k|c\s+hoặc\s+k/i,
    entries: [
      { question: "Điền c hoặc k để hoàn thành từ: _ẹo ngọt", answer: "kẹo", hint1: "Nhìn chữ đứng sau âm đầu.", hint2: "Trước e, ê, i, âm /cờ/ thường viết bằng k.", hint3: "Điền k để được từ kẹo." },
      { question: "Điền c hoặc k để hoàn thành từ: _ua đồng", answer: "cua", hint1: "Nhìn chữ u đứng sau âm đầu.", hint2: "Với nhiều nguyên âm khác e, ê, i, ta thường viết c.", hint3: "Điền c để được từ cua." },
      { question: "Tên đồ vật nào viết đúng? A. cái kéo B. cái céo", answer: "A", hint1: "Từ này có tiếng kéo.", hint2: "Âm /cờ/ đứng trước e thường viết k.", hint3: "Chọn A: cái kéo." },
    ],
  },
  {
    matches: /g\s*[/_-]\s*gh/i,
    entries: [
      { question: "Điền g hoặc gh để hoàn thành từ: _ế đá", answer: "ghế", hint1: "Nhìn chữ ê đứng sau âm đầu.", hint2: "Trước e, ê, i, âm /gờ/ thường viết gh.", hint3: "Điền gh để được từ ghế." },
      { question: "Điền g hoặc gh để hoàn thành từ: _à trống", answer: "gà", hint1: "Nhìn chữ a đứng sau âm đầu.", hint2: "Trước a, âm /gờ/ thường viết g.", hint3: "Điền g để được từ gà." },
    ],
  },
  {
    matches: /ng\s*[/_-]\s*ngh/i,
    entries: [
      { question: "Điền ng hoặc ngh để hoàn thành từ: _ỉ hè", answer: "nghỉ", hint1: "Nhìn chữ i đứng sau âm đầu.", hint2: "Trước e, ê, i, âm /ngờ/ thường viết ngh.", hint3: "Điền ngh để được từ nghỉ." },
      { question: "Điền ng hoặc ngh để hoàn thành từ: _ôi nhà", answer: "ngôi", hint1: "Nhìn chữ ô đứng sau âm đầu.", hint2: "Trước ô, ta viết ng.", hint3: "Điền ng để được từ ngôi." },
    ],
  },
  {
    matches: /r\s*[/_-]\s*d\s*[/_-]\s*gi/i,
    entries: [
      { question: "Điền r, d hoặc gi để hoàn thành từ: _a đình", answer: "gia đình", hint1: "Đọc chậm tiếng gia.", hint2: "Tiếng này bắt đầu bằng gi.", hint3: "Điền gi để được gia đình." },
      { question: "Điền r, d hoặc gi để hoàn thành từ: _òng sông", answer: "dòng sông", hint1: "Đọc chậm tiếng dòng.", hint2: "Tiếng này bắt đầu bằng d.", hint3: "Điền d để được dòng sông." },
    ],
  },
  {
    matches: /l\s*[/_-]\s*n/i,
    entries: [
      { question: "Điền l hoặc n để hoàn thành từ: _ắng nghe", answer: "lắng nghe", hint1: "Đọc chậm tiếng lắng.", hint2: "Tiếng lắng bắt đầu bằng l.", hint3: "Điền l để được lắng nghe." },
      { question: "Điền l hoặc n để hoàn thành từ: _ụ cười", answer: "nụ cười", hint1: "Đọc chậm tiếng nụ.", hint2: "Tiếng nụ bắt đầu bằng n.", hint3: "Điền n để được nụ cười." },
    ],
  },
  {
    matches: /dấu hỏi|dấu ngã/i,
    entries: [
      { question: "Chọn từ viết đúng: A. chăm chỉ B. chăm chĩ", answer: "A", hint1: "Đọc chậm tiếng chỉ.", hint2: "Tiếng chỉ mang dấu hỏi.", hint3: "Chọn A: chăm chỉ." },
      { question: "Chọn từ viết đúng: A. dũng cảm B. dủng cảm", answer: "A", hint1: "Đọc chậm tiếng dũng.", hint2: "Tiếng dũng mang dấu ngã.", hint3: "Chọn A: dũng cảm." },
    ],
  },
  {
    matches: /iêu\s*[/_-]\s*ươu/i,
    entries: [
      { question: "Chọn cách viết đúng: A. con hươu B. con hiêu", answer: "A", hint1: "Đọc chậm tiếng chỉ con vật.", hint2: "Tiếng hươu có vần ươu.", hint3: "Chọn A: con hươu." },
    ],
  },
  {
    matches: /iu\s*[/_-]\s*ưu/i,
    entries: [
      { question: "Chọn cách viết đúng: A. mưu trí B. miu trí", answer: "A", hint1: "Đọc chậm tiếng mưu.", hint2: "Tiếng mưu có vần ưu.", hint3: "Chọn A: mưu trí." },
    ],
  },
  {
    matches: /iên\s*[/_-]\s*iêng/i,
    entries: [
      { question: "Chọn cách viết đúng: A. siêng năng B. siên năng", answer: "A", hint1: "Đọc chậm tiếng siêng.", hint2: "Tiếng siêng có vần iêng.", hint3: "Chọn A: siêng năng." },
    ],
  },
  {
    matches: /uôn\s*[/_-]\s*uông/i,
    entries: [
      { question: "Chọn cách viết đúng: A. luống rau B. luốn rau", answer: "A", hint1: "Đọc chậm tiếng luống.", hint2: "Tiếng luống có vần uông.", hint3: "Chọn A: luống rau." },
    ],
  },
  {
    matches: /ươn\s*[/_-]\s*ương/i,
    entries: [
      { question: "Chọn cách viết đúng: A. con đường B. con đườn", answer: "A", hint1: "Đọc chậm tiếng đường.", hint2: "Tiếng đường có vần ương.", hint3: "Chọn A: con đường." },
    ],
  },
  {
    matches: /ăn\s*[/_-]\s*ăng/i,
    entries: [
      { question: "Chọn cách viết đúng: A. mặt trăng B. mặt trăn", answer: "A", hint1: "Đọc chậm tiếng trăng.", hint2: "Tiếng trăng có vần ăng.", hint3: "Chọn A: mặt trăng." },
    ],
  },
  {
    matches: /ân\s*[/_-]\s*âng/i,
    entries: [
      { question: "Chọn cách viết đúng: A. vâng lời B. vân lời", answer: "A", hint1: "Đọc chậm tiếng vâng.", hint2: "Tiếng vâng có vần âng.", hint3: "Chọn A: vâng lời." },
    ],
  },
  {
    matches: /ao\s*[/_-]\s*au/i,
    entries: [
      { question: "Chọn từ thích hợp: Trên trời có nhiều ngôi __. A. sao B. sau", answer: "A", hint1: "Câu nói về vật sáng trên trời.", hint2: "Tiếng cần điền có vần ao.", hint3: "Chọn A: sao." },
    ],
  },
  {
    matches: /ăt\s*[/_-]\s*ăc/i,
    entries: [
      { question: "Chọn cách viết đúng: A. mặc áo B. mặt áo", answer: "A", hint1: "Câu nói về việc khoác áo lên người.", hint2: "Tiếng mặc có vần ăc.", hint3: "Chọn A: mặc áo." },
    ],
  },
  {
    matches: /in\s*[/_-]\s*inh/i,
    entries: [
      { question: "Chọn cách viết đúng: A. xinh đẹp B. xin đẹp", answer: "A", hint1: "Đọc chậm tiếng xinh.", hint2: "Tiếng xinh có vần inh.", hint3: "Chọn A: xinh đẹp." },
    ],
  },
  {
    matches: /ươc\s*[/_-]\s*ươt/i,
    entries: [
      { question: "Chọn cách viết đúng: A. mơ ước B. mơ ướt", answer: "A", hint1: "Cụm từ nói về điều em mong muốn.", hint2: "Tiếng ước có vần ươc.", hint3: "Chọn A: mơ ước." },
    ],
  },
  {
    matches: /phiếu mượn sách|người làm đồ chơi/i,
    entries: [
      { question: "Trường nào cần có trong phiếu mượn sách? A. Tên sách B. Món ăn", answer: "A", hint1: "Phiếu dùng để mượn một cuốn sách.", hint2: "Cần ghi thông tin giúp nhận biết cuốn sách.", hint3: "Chọn A: Tên sách." },
    ],
  },
  {
    matches: /viết hoa|tên riêng|địa lí/i,
    entries: [
      { question: "Tên nào viết đúng? A. hà nội B. Hà Nội", answer: "B", hint1: "Đây là tên riêng địa lí.", hint2: "Mỗi tiếng tạo nên tên riêng cần bắt đầu bằng chữ hoa.", hint3: "Chọn B: Hà Nội." },
      { question: "Tên nào viết đúng? A. Việt Nam B. việt nam", answer: "A", hint1: "Đây là tên một đất nước.", hint2: "Các tiếng trong tên riêng cần bắt đầu bằng chữ hoa.", hint3: "Chọn A: Việt Nam." },
    ],
  },
  {
    matches: /ch\s*[/_-]\s*tr/i,
    entries: [
      { question: "Điền ch hoặc tr để hoàn thành từ: _ăm chỉ", answer: "chăm chỉ", hint1: "Đọc chậm tiếng đầu.", hint2: "Tiếng chăm bắt đầu bằng ch.", hint3: "Điền ch để được chăm chỉ." },
    ],
  },
  {
    matches: /s\s*[/_-]\s*x/i,
    entries: [
      { question: "Điền s hoặc x để hoàn thành từ: _ạch sẽ", answer: "sạch sẽ", hint1: "Đọc chậm tiếng sạch.", hint2: "Tiếng sạch bắt đầu bằng s.", hint3: "Điền s để được sạch sẽ." },
    ],
  },
  {
    matches: /tên người.*nước ngoài|tên riêng nước ngoài|y-éc-xanh|ô-lim-p/i,
    entries: [
      { question: "Tên nào viết đúng? A. Y-éc-xanh B. y-éc-xanh", answer: "A", hint1: "Đây là tên riêng nước ngoài.", hint2: "Chữ đầu của tên riêng cần viết hoa.", hint3: "Chọn A: Y-éc-xanh." },
    ],
  },
];

const GENERIC: BankEntry[] = [
  { question: "Chọn từ viết đúng theo quy tắc của tuần trong hai phương án giáo viên đã cho.", answer: "Phương án đúng", hint1: "Đọc chậm từng tiếng.", hint2: "Tìm dấu hiệu của quy tắc đang học.", hint3: "Đối chiếu từng tiếng với quy tắc của tuần." },
];

export function getStaticSimilarQuestion(input: CreateSimilarQuestionInput): GeneratedQuestionResponse {
  const group = BANK.find((item) => item.matches.test(`${input.topic} ${input.rule}`));
  for (const entry of [...(group?.entries ?? []), ...GENERIC]) {
    const candidate = { ...entry, difficulty: input.difficulty };
    if (validateGeneratedQuestion({ question: candidate, avoidWords: input.avoidWords, sourceExamples: input.sourceExamples, sourceQuestion: input.sourceQuestion }).valid) return candidate;
  }
  return {
    question: "Em hãy chọn một từ khác trong bài và kiểm tra theo đúng quy tắc của tuần.",
    answer: "Theo đáp án của bài",
    hint1: "Đọc chậm từ em chọn.",
    hint2: "Nhìn dấu hiệu chính của quy tắc.",
    hint3: "Đối chiếu lại với ví dụ trong bài.",
    difficulty: input.difficulty,
  };
}
