import Link from "next/link";
import type { Topic } from "@/types/lesson";

export function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  return (
    <Link href={`/learn/${topic.slug}`} className={`topic-card ${topic.color}`}>
      <span className="topic-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="topic-icon" aria-hidden="true">{topic.icon}</span>
      <div><h2>{topic.title}</h2><p>{topic.description}</p></div>
      <span className="card-arrow">↗</span>
    </Link>
  );
}
