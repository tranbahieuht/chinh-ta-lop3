import type { Question, Topic } from "@/types/lesson";

const q = (id: string, prompt: string, answer: string, h1: string, h2: string, h3: string, explanation: string): Question => ({ id, prompt, answer, hints: [h1, h2, h3], explanation });

export const topics: Topic[] = [
  { slug:"khai-niem", title:"Khái niệm phân số", shortTitle:"Khái niệm", description:"Tử số, mẫu số và cách đọc phân số", icon:"◒", color:"coral", questions:[
    q("kn1","Một chiếc bánh chia 4 phần bằng nhau, lấy 1 phần. Viết phân số chỉ phần đã lấy.","1/4","Mẫu số là tổng số phần bằng nhau.","Có 4 phần nên mẫu số là 4; lấy 1 phần nên tử số là 1.","Viết tử số 1 ở trên, mẫu số 4 ở dưới: 1/4.","1/4 đọc là một phần tư. Tử số 1 cho biết số phần lấy, mẫu số 4 cho biết bánh được chia thành 4 phần bằng nhau."),
    q("kn2","Trong phân số 3/5, số nào là mẫu số?","5","Mẫu số nằm bên dưới gạch phân số.","Trong 3/5, số dưới là 5.","Đáp án là 5.","Mẫu số 5 cho biết một đơn vị được chia thành 5 phần bằng nhau."),
    q("kn3","Hình có 8 ô bằng nhau, 3 ô được tô. Phần tô màu là phân số nào?","3/8","Đếm tất cả ô để tìm mẫu số.","Có 8 ô tất cả và 3 ô được tô.","Tử số là 3, mẫu số là 8, nên được 3/8.","Ta viết số ô tô màu ở trên và tổng số ô bằng nhau ở dưới: 3/8."),
  ]},
  { slug:"bang-nhau", title:"Phân số bằng nhau", shortTitle:"Bằng nhau", description:"Nhận ra những phân số cùng giá trị", icon:"=", color:"blue", questions:[
    q("bn1","Điền số: 1/2 = ?/4","2","Mẫu số 2 được nhân với mấy để thành 4?","2 × 2 = 4, nên tử số cũng nhân 2.","1 × 2 = 2. Vậy 1/2 = 2/4.","Khi nhân cả tử và mẫu với cùng một số khác 0, ta được phân số bằng phân số ban đầu."),
    q("bn2","2/3 có bằng 4/6 không?","Có","Thử nhân cả tử và mẫu của 2/3 với 2.","2 × 2 = 4 và 3 × 2 = 6.","Có, vì 2/3 = 4/6.","Cả tử và mẫu cùng được nhân 2 nên giá trị phân số không đổi."),
    q("bn3","Điền số: 6/8 = 3/?","4","Từ 6 xuống 3 là chia cho mấy?","6 : 2 = 3, hãy chia mẫu số cho 2.","8 : 2 = 4. Vậy số cần điền là 4.","Chia cả tử và mẫu cho 2 ta có 6/8 = 3/4."),
  ]},
  { slug:"rut-gon", title:"Rút gọn phân số", shortTitle:"Rút gọn", description:"Đưa phân số về dạng đơn giản nhất", icon:"↘", color:"mint", questions:[
    q("rg1","Rút gọn 4/8.","1/2","Tìm số lớn hơn 1 chia hết cả 4 và 8.","Cả hai số đều chia hết cho 4.","4 : 4 = 1; 8 : 4 = 2. Kết quả 1/2.","Chia cả tử và mẫu cho cùng số 4, giá trị không đổi và ta được phân số tối giản 1/2."),
    q("rg2","Rút gọn 6/9.","2/3","6 và 9 cùng chia hết cho số nào?","Cả 6 và 9 cùng chia hết cho 3.","6 : 3 = 2; 9 : 3 = 3. Kết quả 2/3.","2 và 3 không còn cùng chia hết cho số nào lớn hơn 1 nên 2/3 đã tối giản."),
    q("rg3","Rút gọn 10/15.","2/3","Hãy nghĩ đến bảng nhân 5.","10 và 15 cùng chia hết cho 5.","10 : 5 = 2; 15 : 5 = 3. Kết quả 2/3.","Chia tử và mẫu cho 5 giúp phân số ngắn gọn hơn mà vẫn giữ nguyên giá trị."),
  ]},
  { slug:"quy-dong", title:"Quy đồng mẫu số", shortTitle:"Quy đồng", description:"Đưa các phân số về cùng mẫu số", icon:"⇄", color:"yellow", questions:[
    q("qd1","Quy đồng 1/2 và 1/3 với mẫu số chung 6.","3/6 và 2/6","6 gấp 2 và 3 bao nhiêu lần?","Nhân 1/2 với 3/3; nhân 1/3 với 2/2.","1/2 = 3/6 và 1/3 = 2/6.","Ta nhân cả tử và mẫu của mỗi phân số để cùng có mẫu 6."),
    q("qd2","Quy đồng 1/4 và 2/3 với mẫu số chung 12.","3/12 và 8/12","12 gấp 4 là 3 lần, gấp 3 là 4 lần.","1/4 nhân 3/3; 2/3 nhân 4/4.","1/4 = 3/12; 2/3 = 8/12.","Mẫu chung 12 giúp ta dễ so sánh hoặc cộng hai phân số."),
    q("qd3","Quy đồng 2/5 và 3/10.","4/10 và 3/10","10 đã là bội của 5.","Chỉ cần đổi 2/5 sang mẫu 10 bằng cách nhân 2.","2/5 = 4/10; 3/10 giữ nguyên.","Khi một mẫu đã là bội của mẫu kia, ta có thể chọn ngay mẫu lớn hơn làm mẫu chung."),
  ]},
  { slug:"so-sanh", title:"So sánh phân số", shortTitle:"So sánh", description:"Tìm phân số lớn hơn, nhỏ hơn", icon:"<", color:"violet", questions:[
    q("ss1","So sánh 3/7 và 5/7.","3/7 < 5/7","Hai phân số có cùng mẫu số.","Cùng mẫu thì so sánh tử số: 3 và 5.","Vì 3 < 5 nên 3/7 < 5/7.","Khi các phần có cùng kích thước, lấy 5 phần sẽ nhiều hơn lấy 3 phần."),
    q("ss2","So sánh 2/3 và 2/5.","2/3 > 2/5","Hai phân số có cùng tử số.","Cùng lấy 2 phần; chia thành ít phần hơn thì mỗi phần lớn hơn.","Vì 3 < 5 nên 2/3 > 2/5.","Cùng tử số, phân số có mẫu số nhỏ hơn thì lớn hơn."),
    q("ss3","So sánh 1/2 và 3/4.","1/2 < 3/4","Đưa 1/2 về mẫu số 4.","1/2 = 2/4.","Vì 2/4 < 3/4 nên 1/2 < 3/4.","Quy đồng giúp hai phân số có cùng kích thước phần để so sánh tử số."),
  ]},
  { slug:"cong", title:"Cộng phân số", shortTitle:"Phép cộng", description:"Cộng các phần lại với nhau", icon:"+", color:"coral", questions:[
    q("c1","Tính 2/7 + 3/7.","5/7","Hai phân số đã cùng mẫu.","Giữ nguyên mẫu 7, cộng hai tử số.","2 + 3 = 5. Kết quả 5/7.","Với hai phân số cùng mẫu, ta cộng tử và giữ nguyên mẫu."),
    q("c2","Tính 1/2 + 1/4.","3/4","Hãy đổi 1/2 thành phân số có mẫu 4.","1/2 = 2/4, rồi cộng với 1/4.","2/4 + 1/4 = 3/4.","Ta cần quy đồng trước vì chỉ cộng được ngay khi các phần có cùng kích thước."),
    q("c3","Tính 1/3 + 1/6.","1/2","Đổi 1/3 về mẫu 6.","1/3 = 2/6; vậy tổng là 3/6.","3/6 rút gọn được 1/2.","Quy đồng, cộng tử, giữ mẫu rồi rút gọn kết quả nếu có thể."),
  ]},
  { slug:"tru", title:"Trừ phân số", shortTitle:"Phép trừ", description:"Tìm phần còn lại sau khi bớt đi", icon:"−", color:"blue", questions:[
    q("t1","Tính 6/9 − 2/9.","4/9","Hai phân số cùng mẫu nên giữ mẫu.","Lấy 6 trừ 2 ở tử số.","6 − 2 = 4. Kết quả 4/9.","Trừ hai phân số cùng mẫu: trừ các tử số và giữ nguyên mẫu số."),
    q("t2","Tính 3/4 − 1/2.","1/4","Đổi 1/2 thành phân số có mẫu 4.","1/2 = 2/4; tính 3/4 − 2/4.","3/4 − 2/4 = 1/4.","Sau khi quy đồng, ta trừ tử số như với các phân số cùng mẫu."),
    q("t3","Tính 5/6 − 1/3.","1/2","Đổi 1/3 về mẫu 6.","1/3 = 2/6; hiệu là 3/6.","3/6 rút gọn thành 1/2.","Quy đồng rồi trừ được 3/6; chia cả tử và mẫu cho 3 được 1/2."),
  ]},
  { slug:"nhan", title:"Nhân phân số", shortTitle:"Phép nhân", description:"Tìm một phần của một phần", icon:"×", color:"mint", questions:[
    q("n1","Tính 2/3 × 1/4.","1/6","Nhân tử với tử, mẫu với mẫu.","2 × 1 = 2; 3 × 4 = 12.","Được 2/12, rút gọn thành 1/6.","Nhân thẳng các tử và các mẫu, sau đó rút gọn kết quả."),
    q("n2","Tính 3/5 × 2.","6/5","Viết số 2 thành phân số 2/1.","3/5 × 2/1 = (3 × 2)/(5 × 1).","Kết quả là 6/5.","Số tự nhiên 2 có thể viết là 2/1 để thực hiện phép nhân phân số."),
    q("n3","Một nửa của 3/4 là bao nhiêu?","3/8","“Một nửa của” nghĩa là nhân với 1/2.","Tính 1/2 × 3/4.","1 × 3 = 3; 2 × 4 = 8. Kết quả 3/8.","Lấy một nửa của một lượng chính là nhân lượng đó với 1/2."),
  ]},
  { slug:"chia", title:"Chia phân số", shortTitle:"Phép chia", description:"Chia đều một lượng phân số", icon:"÷", color:"yellow", questions:[
    q("ch1","Tính 1/2 : 1/4.","2","Giữ phân số đầu, đảo phân số sau.","1/2 × 4/1 = 4/2.","4/2 = 2.","Chia cho một phân số bằng nhân với phân số đảo ngược của nó."),
    q("ch2","Tính 2/3 : 2.","1/3","Viết 2 là 2/1 rồi đảo thành 1/2.","2/3 × 1/2 = 2/6.","2/6 rút gọn thành 1/3.","Đổi phép chia thành phép nhân với số đảo rồi rút gọn."),
    q("ch3","Có 3/4 lít nước, rót đều vào cốc 1/4 lít. Được mấy cốc?","3 cốc","Bài toán là 3/4 : 1/4.","Đảo 1/4 thành 4/1 rồi nhân.","3/4 × 4/1 = 3. Được 3 cốc.","Trong 3 phần tư có đúng 3 nhóm, mỗi nhóm là 1 phần tư."),
  ]},
  { slug:"on-tap", title:"Ôn tập tổng hợp", shortTitle:"Ôn tập", description:"Kết hợp nhiều kỹ năng đã học", icon:"★", color:"violet", questions:[
    q("ot1","Tính và rút gọn: 2/8 + 3/8.","5/8","Hai phân số cùng mẫu.","Cộng tử: 2 + 3 = 5, giữ mẫu 8.","Kết quả 5/8 và không rút gọn thêm được.","Cùng mẫu nên cộng tử; 5 và 8 không có ước chung lớn hơn 1."),
    q("ot2","Điền dấu >, < hoặc = : 4/6 ... 2/3","=","Hãy rút gọn 4/6.","Chia cả tử và mẫu của 4/6 cho 2.","4/6 = 2/3 nên điền dấu =.","Hai phân số có cách viết khác nhau nhưng cùng biểu diễn một giá trị."),
    q("ot3","Lan ăn 1/4 chiếc bánh, Minh ăn 2/4. Cả hai ăn bao nhiêu chiếc bánh?","3/4 chiếc bánh","Các phần đều là phần tư.","Cộng 1/4 + 2/4, giữ mẫu 4.","1 + 2 = 3. Cả hai ăn 3/4 chiếc bánh.","Hai phân số cùng mẫu nên cộng số phần đã ăn và giữ nguyên kích thước mỗi phần."),
  ]},
];

export const getTopic = (slug: string) => topics.find((topic) => topic.slug === slug);
