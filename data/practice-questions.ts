import type { PracticeDifficulty, PracticeQuestion } from "@/types/lesson";

export const conceptPracticeQuestions: Record<PracticeDifficulty, PracticeQuestion[]> = {
  advanced: [
    { id: "concept-advanced-1", difficulty: "advanced", prompt: "Mai tô 5 phần trong một hình chia 8 phần bằng nhau. Viết phân số và cho biết tử số nói lên điều gì.", answer: "5/8; tử số 5 cho biết có 5 phần được tô", hint: "Viết số phần được tô ở trên gạch phân số.", explanation: "Có 5 phần được tô trong tổng 8 phần bằng nhau nên phân số là 5/8; tử số 5 biểu thị số phần đã tô." },
    { id: "concept-advanced-2", difficulty: "advanced", prompt: "Tìm phân số có mẫu số 9, tử số bé hơn mẫu số 2 đơn vị.", answer: "7/9", hint: "Lấy 9 trừ 2 để tìm tử số.", explanation: "Tử số là 9 − 2 = 7, nên phân số cần tìm là 7/9." },
    { id: "concept-advanced-3", difficulty: "advanced", prompt: "Một đoạn dây chia 10 phần bằng nhau, dùng 3 phần. Phần chưa dùng là phân số nào?", answer: "7/10", hint: "Tìm số phần còn lại trước.", explanation: "Còn 10 − 3 = 7 phần trong tổng 10 phần, nên phần chưa dùng là 7/10." },
  ],
  standard: [
    { id: "concept-standard-1", difficulty: "standard", prompt: "Một hình chia 6 phần bằng nhau và tô 4 phần. Viết phân số chỉ phần tô màu.", answer: "4/6", hint: "Tử số là số phần tô, mẫu số là tổng số phần.", explanation: "Có 4 phần tô trong tổng 6 phần bằng nhau nên viết 4/6." },
    { id: "concept-standard-2", difficulty: "standard", prompt: "Trong phân số 3/7, tử số là số nào?", answer: "3", hint: "Tử số nằm phía trên gạch phân số.", explanation: "Số 3 nằm trên gạch phân số nên là tử số." },
    { id: "concept-standard-3", difficulty: "standard", prompt: "Viết phân số có tử số 2 và mẫu số 5.", answer: "2/5", hint: "Đặt tử số trên mẫu số.", explanation: "Đặt 2 ở trên và 5 ở dưới gạch phân số, ta được 2/5." },
  ],
  basic: [
    { id: "concept-basic-1", difficulty: "basic", prompt: "Chiếc bánh chia 4 phần bằng nhau. Bé ăn 1 phần. Bé đã ăn mấy phần tư chiếc bánh?", answer: "1/4", hint: "Bé ăn 1 trong 4 phần bằng nhau.", explanation: "Một phần trong bốn phần bằng nhau được viết là 1/4." },
    { id: "concept-basic-2", difficulty: "basic", prompt: "Trong phân số 2/3, mẫu số là 2 hay 3?", answer: "3", hint: "Mẫu số là số ở dưới.", explanation: "Số 3 ở dưới gạch phân số nên là mẫu số." },
    { id: "concept-basic-3", difficulty: "basic", prompt: "Có 5 ô bằng nhau và tô 2 ô. Điền vào chỗ trống: phần tô màu là 2/…", answer: "5", hint: "Đếm tất cả các ô.", explanation: "Có tất cả 5 ô nên mẫu số cần điền là 5." },
  ],
  very_basic: [
    { id: "concept-very-basic-1", difficulty: "very_basic", prompt: "Có 2 nửa chiếc bánh. Tô 1 nửa. Chọn đáp án: 1/2 hay 2/1?", answer: "1/2", hint: "Số phần tô là 1; tổng số phần là 2.", explanation: "Viết 1 ở trên và 2 ở dưới, ta có 1/2." },
    { id: "concept-very-basic-2", difficulty: "very_basic", prompt: "Phân số 1/3 có số nào ở trên: 1 hay 3?", answer: "1", hint: "Nhìn số trước dấu /.", explanation: "Trong cách viết 1/3, số 1 là số ở trên và là tử số." },
    { id: "concept-very-basic-3", difficulty: "very_basic", prompt: "Hình được chia thành 4 phần bằng nhau. Mẫu số sẽ là số mấy?", answer: "4", hint: "Mẫu số cho biết tổng số phần bằng nhau.", explanation: "Hình có tổng cộng 4 phần bằng nhau nên mẫu số là 4." },
  ],
};

export function getPracticeQuestion(difficulty: PracticeDifficulty, index = 0) {
  const questions = conceptPracticeQuestions[difficulty];
  return questions[index % questions.length];
}

export function getAdaptivePracticeQuestion(preferredDifficulty: PracticeDifficulty, usedQuestionIds: string[]) {
  const order: PracticeDifficulty[] = ["very_basic", "basic", "standard", "advanced"];
  const preferredIndex = order.indexOf(preferredDifficulty);
  const nearbyDifficulties = [...order].sort((a, b) => Math.abs(order.indexOf(a) - preferredIndex) - Math.abs(order.indexOf(b) - preferredIndex));

  for (const difficulty of nearbyDifficulties) {
    const question = conceptPracticeQuestions[difficulty].find((item) => !usedQuestionIds.includes(item.id));
    if (question) return question;
  }
  return undefined;
}
