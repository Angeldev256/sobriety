import { z } from "zod";
import { CURRENCIES, TRIGGERS } from "@/lib/constants";
import { HELPLINES } from "@/lib/helplines";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.");

export const addictionSchema = z.object({
  type: z.enum(["alcohol", "nicotine", "drugs", "gambling", "other"], { error: "Please choose what you're tracking." }),
  label: optionalText(60),
  // Sent as an absolute ISO timestamp computed in the browser from the user's local date+time.
  start_date: z.iso.datetime({ offset: true, error: "Please choose when your sobriety started." }).refine(
    (v) => new Date(v).getTime() <= Date.now() + 60_000,
    "Your start date can't be in the future.",
  ),
  reason: optionalText(300),
  daily_cost: z
    .union([z.literal("").transform(() => null), z.coerce.number({ error: "Please enter an amount." }).min(0, "Please enter an amount of 0 or more.").max(100000)])
    .nullable()
    .optional(),
});

export const checkInSchema = z.object({
  addiction_id: z.uuid("Please choose what this check-in is for."),
  mood: z.coerce.number().int().min(1, "Please choose your mood.").max(5),
  craving_level: z.coerce.number().int().min(1, "Please choose a craving level.").max(5),
  triggers: z.array(z.enum(TRIGGERS)).max(TRIGGERS.length).default([]),
  note: optionalText(1000),
  stayed_sober: z.enum(["yes", "no"], { error: "Please let us know how today went." }).transform((v) => v === "yes"),
});

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Please give your goal a title.").max(120, "Please keep the title under 120 characters."),
  description: optionalText(1000),
  target_date: isoDate.optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["not_started", "in_progress", "completed"]).default("not_started"),
});

export const relapseSchema = z.object({
  addiction_id: z.uuid(),
  note: optionalText(1000),
  reset_counter: z.enum(["reset", "keep"]).transform((v) => v === "reset"),
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Please enter a name.").max(60),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone."),
  country: z.enum(HELPLINES.map((h) => h.code) as [string, ...string[]]),
  theme: z.enum(["system", "light", "dark"]),
  currency: z.enum(CURRENCIES),
});

export const reminderSchema = z.object({
  enabled: z.boolean(),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please choose a valid time."),
  email_enabled: z.boolean(),
  milestone_alerts: z.boolean(),
  encouragement: z.boolean(),
});

export type FieldErrors = Record<string, string[] | undefined>;
export type ActionState = { ok: boolean; message?: string; fieldErrors?: FieldErrors } | null;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

// ---- auth ----
const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Please enter a valid email address."));
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Please use 72 characters or fewer.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use at least one letter and one number.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password."),
});

export const signUpSchema = z
  .object({
    display_name: z.string().trim().min(1, "What should we call you?").max(60),
    email,
    password,
    confirm: z.string(),
    agree: z.literal("on", { error: "Please confirm you understand this isn't medical care." }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match." });

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match." });

// ---- support circle ----
export const inviteHelperSchema = z.object({
  helper_name: z.string().trim().min(1, "What do you call this person?").max(60),
  helper_email: z.string().trim().toLowerCase().max(254).pipe(z.email("Please enter their email address.")),
  relationship: z.enum(["counselor", "sponsor", "family", "friend", "peer", "health_worker", "faith_leader", "other"], {
    error: "Please choose how you know them.",
  }),
  phone: z.string().trim().max(30).optional(),
  is_preferred: z.boolean(),
});

export const supportMessageSchema = z.object({
  connection_id: z.uuid(),
  body: z.string().trim().min(1, "Write a message first.").max(2000, "Please keep messages under 2,000 characters."),
});

// ---- professional care ----
const checkboxList = <T extends string>(values: readonly [T, ...T[]], min: number, message: string) =>
  z.array(z.enum(values)).min(min, message).transform((v) => [...new Set(v)]);

export const professionalSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(80),
  profession: z.enum(["counsellor", "clinical_psychologist", "psychiatrist", "psychiatric_nurse", "social_worker", "addiction_specialist"], {
    error: "Please choose your profession.",
  }),
  licence_body: z.string().trim().min(2, "Please enter the council or body you're registered with.").max(120),
  licence_number: z.string().trim().min(2, "Please enter your registration or licence number.").max(60),
  institution: optionalText(120),
  bio: z
    .string()
    .trim()
    .min(40, "Please write at least a few sentences (40 characters or more).")
    .max(1200, "Please keep this under 1,200 characters."),
  specialties: checkboxList(
    ["alcohol", "drugs", "gambling", "tobacco", "dual_diagnosis", "trauma", "family", "youth", "women", "relapse_prevention", "withdrawal_medical"],
    1,
    "Choose at least one area you work in.",
  ),
  languages: checkboxList(
    ["English", "Luganda", "Swahili", "Runyankole", "Rukiga", "Lusoga", "Luo", "Ateso", "Lugbara", "Runyoro", "Rutooro", "Lumasaba", "Karimojong"],
    1,
    "Choose at least one language.",
  ),
  session_modes: checkboxList(["chat", "audio", "video"], 1, "Choose at least one session type."),
  fee_ugx: z.coerce
    .number({ error: "Please enter your fee." })
    .int("Please enter a whole number of shillings.")
    .min(5000, "The minimum fee is UGX 5,000.")
    .max(2000000, "The maximum fee is UGX 2,000,000."),
  payout_phone: z.string().trim().max(30).optional(),
  accepting_patients: z.boolean(),
  agree: z.literal("on", { error: "Please confirm your details are true and your registration is current." }),
});

export const resourceSchema = z
  .object({
    title: z.string().trim().min(3, "Please give the resource a title.").max(160),
    description: optionalText(600),
    institution: z.string().trim().min(2, "Which institution is this from?").max(120),
    category: z.enum(["guide", "factsheet", "treatment", "family", "policy", "research", "form"], { error: "Please choose a category." }),
    source_url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Please enter a full https:// link.")
      .transform((v) => (v === "" ? null : v)),
    file_path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|docx?|png|jpe?g|txt)$/).nullable(),
    file_name: z.string().max(200).nullable(),
    file_size: z.number().int().min(1).max(20 * 1024 * 1024).nullable(),
    mime_type: z.string().max(120).nullable(),
    permission: z.literal(true, { error: "Please confirm you have permission to share this." }),
  })
  .refine((d) => d.file_path || d.source_url, { path: ["source_url"], message: "Upload a file or add a link to the original." });

export const intakeMessageSchema = z.object({
  intake_id: z.uuid().nullable(),
  text: z.string().trim().min(1, "Write a message first.").max(1500, "Please keep each message under 1,500 characters."),
});
