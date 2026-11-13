// The companion only discusses addiction, recovery and related wellbeing. The model declines
// anything else itself; this is a backstop in case it flags a message as off topic but answers
// it at length anyway. A real decline is a sentence or two.

export const OFF_TOPIC_REPLY =
  "I'm only able to talk about recovery — things like cravings, drinking, drugs, betting, how you're feeling, and getting support. Is there anything like that on your mind today?";

const MAX_DECLINE_LENGTH = 400;

export function keepOnTopic<T extends { reply: string; on_topic: boolean; crisis: boolean }>(turn: T): T {
  // A crisis reply is never replaced: safety information must always get through.
  if (turn.on_topic || turn.crisis || turn.reply.length <= MAX_DECLINE_LENGTH) return turn;
  return { ...turn, reply: OFF_TOPIC_REPLY };
}
