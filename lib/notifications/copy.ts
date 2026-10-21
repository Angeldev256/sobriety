// Human, non-judgmental notification wording. Lock screens can be seen by others, so nothing
// here names an addiction or says "sober" — it reads like a note from a supportive friend.

export const REMINDER_LINES = [
  "just checking in on you. How's today going?",
  "a quick moment for yourself? Your daily check-in is waiting.",
  "however today went, it's worth a minute to notice it.",
  "you've been showing up for yourself. Want to log today?",
  "no pressure — just a reminder that your check-in is here when you're ready.",
  "how are you feeling right now? A one-minute check-in can help.",
  "small habits build big change. Ready for today's check-in?",
];

export const ENCOURAGEMENT_LINES = [
  "Whatever today brings, you don't have to face it all at once. One hour at a time.",
  "If a craving shows up, it will pass. The urge timer can help you ride it out.",
  "You're doing something hard, and you're doing it. That matters.",
  "Remember why you started. Your reasons are still yours.",
  "Rest, water, a short walk, a call to a friend — small things help.",
  "Progress isn't a straight line. Every day you keep going counts.",
];

/** Stable pick for a given day so a user doesn't get the same line two days running. */
export function pickLine(lines: readonly string[], seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length];
}

export function reminderNotification(name: string, seed: string) {
  const line = pickLine(REMINDER_LINES, seed);
  return { title: `Hi ${name}`, body: line.charAt(0).toUpperCase() + line.slice(1), line };
}
