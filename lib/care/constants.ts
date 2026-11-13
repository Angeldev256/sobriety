import type { Profession, ResourceCategory, SessionMode, Specialty } from "@/lib/database.types";

export const PROFESSIONS: { value: Profession; label: string }[] = [
  { value: "counsellor", label: "Counsellor" },
  { value: "addiction_specialist", label: "Addiction specialist" },
  { value: "clinical_psychologist", label: "Clinical psychologist" },
  { value: "psychiatrist", label: "Psychiatrist" },
  { value: "psychiatric_nurse", label: "Psychiatric nurse / clinical officer" },
  { value: "social_worker", label: "Social worker" },
];

export const SPECIALTIES: { value: Specialty; label: string }[] = [
  { value: "alcohol", label: "Alcohol" },
  { value: "drugs", label: "Drugs (including mairungi and marijuana)" },
  { value: "gambling", label: "Betting and gambling" },
  { value: "tobacco", label: "Tobacco and nicotine" },
  { value: "dual_diagnosis", label: "Depression or anxiety alongside addiction" },
  { value: "trauma", label: "Trauma" },
  { value: "family", label: "Family and relationships" },
  { value: "youth", label: "Young people" },
  { value: "women", label: "Women's recovery" },
  { value: "relapse_prevention", label: "Relapse prevention" },
  { value: "withdrawal_medical", label: "Withdrawal and medication review" },
];

export const SPECIALTY_VALUES = SPECIALTIES.map((s) => s.value) as [Specialty, ...Specialty[]];

export const LANGUAGES = [
  "English", "Luganda", "Swahili", "Runyankole", "Rukiga", "Lusoga", "Luo",
  "Ateso", "Lugbara", "Runyoro", "Rutooro", "Lumasaba", "Karimojong",
] as const;

export const SESSION_MODES: { value: SessionMode; label: string }[] = [
  { value: "chat", label: "Chat" },
  { value: "audio", label: "Voice call" },
  { value: "video", label: "Video call" },
];

export const LICENCE_BODIES = [
  "Uganda Medical and Dental Practitioners Council",
  "Uganda Allied Health Professionals Council",
  "Uganda Nurses and Midwives Council",
  "Uganda Counselling Association",
  "National Council for Social Work",
  "Other",
];

export const RESOURCE_CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: "guide", label: "Self-help guide" },
  { value: "factsheet", label: "Fact sheet" },
  { value: "treatment", label: "Treatment and services" },
  { value: "family", label: "For families" },
  { value: "policy", label: "Policy and guidelines" },
  { value: "research", label: "Research" },
  { value: "form", label: "Form" },
];

export const INSTITUTIONS = [
  "Butabika National Referral Mental Hospital",
  "Ministry of Health Uganda",
  "Mental Health Uganda",
  "Uganda Youth Development Link (UYDEL)",
  "World Health Organization",
];

export const professionLabel = (p: Profession) => PROFESSIONS.find((x) => x.value === p)?.label ?? "Professional";
export const specialtyLabel = (s: Specialty) => SPECIALTIES.find((x) => x.value === s)?.label ?? s;
export const modeLabel = (m: SessionMode) => SESSION_MODES.find((x) => x.value === m)?.label ?? m;
export const categoryLabel = (c: ResourceCategory) => RESOURCE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString("en-US")}`;
}

/** A conversation stops accepting messages after this many from the person (they can start a new one). */
export const MAX_INTAKE_TURNS = 40;
/** New conversations a person can start per day (keeps AI costs predictable). */
export const MAX_INTAKES_PER_DAY = 5;
