import { Brand } from "@/components/brand";
import { TopicCard } from "@/components/topic-card";
import { topics } from "@/data/topics";

export const metadata = { title: "Chọn chủ đề" };

export default function TopicsPage() {
  return (
    <main className="page-shell">
      <header className="site-header"><Brand /><div className="header-note"><span>Hành trình của em</span><b>Chọn một bài để bắt đầu</b></div></header>
      <section className="topics-heading">
        <div><span className="eyebrow">Thư viện bài học</span><h1>Hôm nay em muốn<br/><em>học gì?</em></h1></div>
        <p>Mỗi chủ đề có các câu hỏi từ dễ đến khó. Em có thể xin gợi ý bất cứ lúc nào.</p>
      </section>
      <section className="topic-grid" aria-label="Danh sách chủ đề">
        {topics.map((topic, index) => <TopicCard key={topic.slug} topic={topic} index={index} />)}
      </section>
    </main>
  );
}
