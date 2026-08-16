import { notFound } from "next/navigation";
import { SpellingChat } from "@/components/spelling-chat";
import { getSpellingWeek, spellingWeeks } from "@/data/spelling-weeks";

export function generateStaticParams() {
  return spellingWeeks.map(({ week }) => ({ week: String(week) }));
}

export default async function LearnWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: value } = await params;
  const week = getSpellingWeek(value);
  if (!week) notFound();
  return <SpellingChat week={week} />;
}
