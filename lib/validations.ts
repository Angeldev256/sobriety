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
