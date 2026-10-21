import type { AddictionType, GoalStatus } from "@/lib/database.types";

export const ADDICTION_TYPES: { value: AddictionType; label: string }[] = [
  { value: "alcohol", label: "Alcohol" },
  { value: "nicotine", label: "Nicotine" },
  { value: "drugs", label: "Drugs" },
  { value: "gambling", label: "Gambling" },
  { value: "other", label: "Other" },
];

export function addictionMeta(type: AddictionType) {
  return ADDICTION_TYPES.find((a) => a.value === type) ?? ADDICTION_TYPES[4];
}

export function addictionName(a: { type: AddictionType; label: string | null }) {
  return a.label?.trim() || addictionMeta(a.type).label;
}

export const TRIGGERS = [
  "Stress",
  "Boredom",
  "Loneliness",
  "Anxiety",
  "Sadness",
  "Anger",
  "Tiredness",
  "Celebration",
  "Social pressure",
  "Work",
  "Relationships",
  "Money worries",
  "Physical pain",
  "Certain places",
  "Certain people",
  "Seeing others use",
] as const;

export const MOODS = [
  { value: 1, label: "Very low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

export const CRAVINGS = [
  { value: 1, label: "None" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Strong" },
  { value: 5, label: "Intense" },
] as const;

export const GOAL_STATUSES: { value: GoalStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD", "NGN", "INR", "ZAR", "KES", "GHS"] as const;
