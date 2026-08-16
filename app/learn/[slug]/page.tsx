import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
import { getTopic, topics } from "@/data/topics";

export function generateStaticParams() { return topics.map(({ slug }) => ({ slug })); }

export default async function LearnPage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  return <ChatRoom key={topic.slug} topic={topic} />;
}
