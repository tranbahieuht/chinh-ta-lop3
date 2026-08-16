import { notFound } from "next/navigation";
import { WeekDetail } from "@/components/week-detail";
import { getSpellingWeek, spellingWeeks } from "@/data/spelling-weeks";

export function generateStaticParams() {
  return spellingWeeks.map((item) => ({ week: String(item.week) }));
}

export default async function WeekDetailPage({ params }: PageProps<"/journey/[week]">) {
  const { week } = await params;
  const item = getSpellingWeek(week);
  if (!item) notFound();
  return <WeekDetail item={item}/>;
}
