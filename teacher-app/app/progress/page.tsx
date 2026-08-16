import { ClassFilter, EmptyState, PageHeading, ProgressBar } from "@/components/ui";
import { getClasses, getProgress, getStudents } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiến độ 35 tuần" };

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ className?: string }> }) {
  const { className } = await searchParams;
  const [weeks, students, classes] = await Promise.all([getProgress(className), getStudents(className), getClasses()]);
  return <section className="page-shell">
    <PageHeading eyebrow="Hành trình năm học" title="Tiến độ 35 tuần" text="Mỗi tuần cho biết số học sinh đã bắt đầu, đã hoàn thành, mastery và lượng gợi ý trung bình." action={<ClassFilter classes={classes} selected={className}/>}/>
    {!students.length ? <EmptyState title="Chưa có dữ liệu tiến độ" text="Thử chọn lớp khác hoặc chờ học sinh bắt đầu hành trình."/> : <>
      <div className="progress-overview"><b>{students.length} học sinh</b><span>35 tuần · {weeks.reduce((sum, week) => sum + week.completedStudents, 0)} lượt hoàn thành tuần</span></div>
      <div className="week-grid">{weeks.map((week) => <article className="week-card" key={week.week}>
        <div className="week-heading"><span>Tuần</span><strong>{week.week}</strong><small>{week.completedStudents}/{students.length} hoàn thành</small></div>
        <ProgressBar value={week.completionPercent} label={`Tuần ${week.week}: ${week.completionPercent}% hoàn thành`}/>
        <dl><div><dt>Đã bắt đầu</dt><dd>{week.startedStudents}</dd></div><div><dt>Mastery TB</dt><dd>{week.averageMastery}%</dd></div><div><dt>Gợi ý TB</dt><dd>{week.averageHints}</dd></div></dl>
      </article>)}</div>
    </>}
  </section>;
}
