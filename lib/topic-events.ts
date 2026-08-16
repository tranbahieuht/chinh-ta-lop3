const topicStartEvents: Record<string, string> = {
  "khai-niem": "start_topic_01",
  "bang-nhau": "start_topic_02",
  "rut-gon": "start_topic_03",
  "quy-dong": "start_topic_04",
  "so-sanh": "start_topic_05",
  "cong": "start_topic_06",
  "tru": "start_topic_07",
  "nhan": "start_topic_08",
  "chia": "start_topic_09",
  "on-tap": "start_topic_10",
};

export function getTopicStartEvent(topicSlug: string) {
  return topicStartEvents[topicSlug];
}
