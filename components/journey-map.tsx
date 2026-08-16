"use client";

import { spellingWeeks } from "@/data/spelling-weeks";
import { useStudent } from "@/components/student-provider";
import { ErrorState, LoadingState, WeekCard } from "@/components/learning-ui";
import { weekProgressRow, weekStatus } from "@/lib/spelling-progress";

export function JourneyMap() {
  const { progress, loading, error, refreshProgress } = useStudent();
  if (loading) return <div className="page-container"><LoadingState rows={8}/></div>;
  if (error) return <div className="page-container"><ErrorState message={error} retry={() => void refreshProgress()}/></div>;
  return <div className="page-container journey-page">
    <header className="page-hero compact"><div><p className="eyebrow">Bản đồ học tập</p><h1>Hành trình 35 tuần</h1><p>Từ những âm đầu quen thuộc đến Final Boss cuối năm — mỗi tuần là một trạm mới.</p></div><div className="journey-counter"><strong>{progress?.completedWeeks.length ?? 0}</strong><span>/ 35 tuần</span></div></header>
    <div className="map-legend" aria-label="Chú giải trạng thái"><span><i className="dot completed"/>Đã xong</span><span><i className="dot current"/>Đang học</span><span><i className="dot review"/>Nên ôn lại</span><span><i className="dot locked"/>Chưa mở</span></div>
    {[1, 2].map((semester) => <section key={semester} className="semester-block">
      <div className="semester-title"><span>Học kì {semester === 1 ? "I" : "II"}</span><i/></div>
      <div className="journey-map">
        {spellingWeeks.filter((item) => item.semester === semester).map((item, index) => {
          const row = weekProgressRow(progress, item.week);
          return <div className={`map-stop ${index % 2 ? "offset" : ""}`} key={item.week}><WeekCard item={item} status={weekStatus(progress, item.week)} mastery={row?.mastery_score} xp={row?.xp_earned}/></div>;
        })}
      </div>
    </section>)}
  </div>;
}
