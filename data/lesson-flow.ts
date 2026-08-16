import type { Topic } from "@/types/lesson";

export type LessonFlowContent = {
  theory: string;
  simplerTheory: string;
  checkQuestion: string;
  checkAnswers: string[];
  checkChoices: string[];
  checkRetry: string;
  examplePrompt: string;
  exampleAnswer: string;
  exampleHints: [string, string, string];
  exampleSuccess: string;
};

const conceptFlow: LessonFlowContent = {
  theory: "Phân số dùng để biểu diễn một hoặc nhiều phần bằng nhau của một đơn vị. Trong phân số 3/5: số 3 ở trên gọi là tử số, cho biết ta lấy 3 phần; số 5 ở dưới gọi là mẫu số, cho biết đơn vị được chia thành 5 phần bằng nhau. Ta đọc 3/5 là “ba phần năm”.",
  simplerTheory: "Em hãy tưởng tượng một chiếc bánh được chia đều. Số ở dưới cho biết chiếc bánh có tất cả bao nhiêu phần bằng nhau. Số ở trên cho biết ta đang nói đến bao nhiêu phần. Ví dụ 2/4 đọc là “hai phần tư”.",
  checkQuestion: "Kiểm tra nhanh nhé: Trong phân số 3/5, số 5 được gọi là gì?",
  checkAnswers: ["mẫu số", "mau so", "mẫu"],
  checkChoices: ["Tử số", "Mẫu số"],
  checkRetry: "Số ở dưới gạch phân số cho biết tổng số phần bằng nhau và được gọi là mẫu số. Em thử lại nhé!",
  examplePrompt: "Ví dụ áp dụng: Một chiếc bánh chia thành 4 phần bằng nhau, em lấy 1 phần. Hãy viết phân số chỉ phần bánh đã lấy.",
  exampleAnswer: "1/4",
  exampleHints: [
    "Gợi ý nhẹ: Mẫu số cho biết chiếc bánh được chia thành bao nhiêu phần bằng nhau.",
    "Từng bước: Bước 1, đếm tổng số phần để tìm mẫu số. Bước 2, đếm số phần đã lấy để tìm tử số.",
    "Hướng dẫn gần đầy đủ: Đặt số phần đã lấy ở trên gạch phân số và tổng số phần bằng nhau ở dưới. Em hãy tự ghép hai số đó thành phân số cuối cùng nhé.",
  ],
  exampleSuccess: "Đúng rồi! Em đã biết dùng tử số và mẫu số để viết phân số.",
};

export function getLessonFlowContent(topic: Topic): LessonFlowContent {
  if (topic.slug === "khai-niem") return conceptFlow;
  const firstQuestion = topic.questions[0];
  return {
    theory: `${topic.title}: ${topic.description}. Em hãy đọc chậm, chú ý quy tắc chính rồi mới chuyển sang câu kiểm tra nhanh.`,
    simplerTheory: `Mình nói ngắn hơn nhé: ${topic.description}. Ta sẽ làm từng bước và em có thể thử lại nếu chưa chắc.`,
    checkQuestion: `Câu kiểm tra nhanh: ${firstQuestion.prompt}`,
    checkAnswers: [firstQuestion.answer],
    checkChoices: [],
    checkRetry: `Em xem lại ý chính nhé: ${firstQuestion.explanation} Sau đó thử lại một lần nữa.`,
    examplePrompt: `Ví dụ áp dụng: ${firstQuestion.prompt}`,
    exampleAnswer: firstQuestion.answer,
    exampleHints: firstQuestion.hints,
    exampleSuccess: `Chính xác! ${firstQuestion.explanation}`,
  };
}
