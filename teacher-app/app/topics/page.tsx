import { ClassFilter, EmptyState, PageHeading, ProgressBar } from "@/components/ui";
import { getClasses, getTopics } from "@/lib/data";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chủ đề" };

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ className?: string }> }) {
  const { className } = await searchParams;
  const [topics, classes] = await Promise.all([getTopics(className), getClasses()]);
  const weakTopics = topics.filter((topic) => topic.isWeak).length;
  return <section className="page-shell">
    <PageHeading eyebrow="Phân tích năng lực" title="Mastery theo chủ đề" text={`${weakTopics} chủ đề dưới ngưỡng 65% đang được đánh dấu để thầy cô ưu tiên.`} action={<ClassFilter classes={classes} selected={className}/>}/>
    {!topics.length ? <EmptyState title="Chưa có dữ liệu chủ đề" text="Mastery sẽ xuất hiện sau khi học sinh trả lời các câu hỏi."/> : <div className="topic-card-grid">{topics.map((topic, index) => <article className={`topic-card ${topic.isWeak ? "weak" : ""}`} key={topic.topic}>
      <div className="topic-card-heading"><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{topic.topic}</h2><small>{topic.studentCount} học sinh đã luyện</small></div>{topic.isWeak && <b>Cần củng cố</b>}</div>
      <ProgressBar value={topic.averageMastery} label={`Mastery chủ đề ${topic.topic}`}/>
      <div className="topic-stats"><span><b>{formatNumber(topic.totalQuestions)}</b>Câu hỏi</span><span><b>{formatNumber(topic.correct)}</b>Đúng</span><span><b>{formatNumber(topic.wrong)}</b>Sai</span><span><b>{formatNumber(topic.hints)}</b>Gợi ý</span></div>
    </article>)}</div>}
  </section>;
}
