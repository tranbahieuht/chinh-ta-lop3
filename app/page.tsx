import Link from "next/link";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <main className="home-shell">
      <header className="site-header"><Brand /><span className="grade-pill">Dành cho lớp 4</span></header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Học từng chút · Hiểu thật lâu</span>
          <h1>Phân số sẽ<br/><em>thật dễ hiểu!</em></h1>
          <p>Chào em! Cùng trợ lý Mít học phân số qua những câu hỏi nhỏ, gợi ý vừa đủ và lời giải thật dễ hiểu nhé.</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/topics">Bắt đầu học <span>→</span></Link>
            <span className="micro-copy"><b>10</b> chủ đề · Học theo tốc độ của em</span>
          </div>
        </div>
        <div className="fraction-scene" aria-label="Minh họa những miếng bánh phân số">
          <div className="sun">✦</div>
          <div className="speech">Mình cùng chia bánh nhé!</div>
          <div className="mascot"><span className="eye left"/><span className="eye right"/><span className="smile">⌣</span></div>
          <div className="pie pie-one"><span>¾</span></div>
          <div className="pie pie-two"><span>½</span></div>
          <div className="spark s1">✦</div><div className="spark s2">✦</div>
        </div>
      </section>
      <section className="promise-row">
        <div><span>01</span><b>Gợi ý đúng lúc</b><p>Không cho đáp án quá sớm.</p></div>
        <div><span>02</span><b>Vừa sức với em</b><p>Bài học tự đổi độ khó.</p></div>
        <div><span>03</span><b>Tiến bộ mỗi ngày</b><p>Nhìn thấy hành trình của mình.</p></div>
      </section>
    </main>
  );
}
