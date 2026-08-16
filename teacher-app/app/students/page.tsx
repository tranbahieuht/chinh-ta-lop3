import { ClassFilter, EmptyState, PageHeading, ProgressBar, StatusPill, StudentLink } from "@/components/ui";
import { getClasses, getStudents } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Học sinh" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ className?: string }> }) {
  const { className } = await searchParams;
  const [students, classes] = await Promise.all([getStudents(className), getClasses()]);
  return <section className="page-shell">
    <PageHeading eyebrow="Danh sách" title="Học sinh" text="Thông tin học tập tổng hợp từ tiến độ tuần và mastery theo chủ đề." action={<ClassFilter classes={classes} selected={className}/>}/>
    {!students.length ? <EmptyState title="Không có học sinh" text="Thử chọn lớp khác hoặc chờ dữ liệu học tập được ghi nhận."/> : <article className="panel table-panel">
      <div className="table-summary"><b>{students.length} học sinh</b><span>Cập nhật theo hoạt động gần nhất</span></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Học sinh</th><th>Lớp</th><th>Tuần hiện tại</th><th>XP</th><th>Level</th><th>Mastery</th><th>Gợi ý</th><th>Trạng thái</th><th>Hoạt động</th></tr></thead>
        <tbody>{students.map((student) => <tr key={student.id}>
          <td data-label="Học sinh"><StudentLink id={student.id}>{student.name}</StudentLink><small className="student-code">{student.code}</small></td>
          <td data-label="Lớp">{student.className}</td>
          <td data-label="Tuần"><b>{student.currentWeek}</b><small>{student.completedWeeks}/35 hoàn thành</small></td>
          <td data-label="XP"><b>{formatNumber(student.xp)}</b></td>
          <td data-label="Level">{student.level}</td>
          <td data-label="Mastery"><ProgressBar value={student.mastery}/></td>
          <td data-label="Gợi ý">{student.hints}</td>
          <td data-label="Trạng thái"><StatusPill status={student.status}/></td>
          <td data-label="Hoạt động"><small>{formatDateTime(student.lastActivityAt)}</small></td>
        </tr>)}</tbody>
      </table></div>
    </article>}
  </section>;
}
