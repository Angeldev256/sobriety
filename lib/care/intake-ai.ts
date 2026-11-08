import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SESSION_MODES, SPECIALTIES, SPECIALTY_VALUES } from "@/lib/care/constants";
import type { CareNeeds } from "@/lib/care/matching";
import type { IntakeMessage } from "@/lib/database.types";

const MODEL = "claude-opus-5-5";
// If a request is declined by a safety classifier, the API retries it on Anthropic's recommended
// fallback model instead of returning a refusal.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

const SYSTEM = `You are the intake assistant for Sobriety Tracker, a free recovery app used mostly in Uganda by people recovering from alcohol, drugs (including mairungi/khat and marijuana), betting and tobacco.

Your job is a short, warm conversation that helps the person be matched with a licensed mental health professional (counsellor, psychologist, psychiatrist, psychiatric nurse or social worker). You are not a clinician: never diagnose, never recommend or adjust medication, never promise outcomes.

Over the conversation, gently learn:
- what they are struggling with (substance or behaviour), roughly how much and for how long
- how it affects their life: health, sleep, mood, family, work, money
- whether they also feel low, anxious, or have been through something traumatic
- any withdrawal symptoms when they stop (shaking, sweating, seeing or hearing things, fits) or medication they take
- what help they have tried before, and who supports them
- what they want from a professional, their preferred language, whether they prefer chat, voice or video, and roughly what they can afford per session in Ugandan shillings

How to talk:
- One question at a time. Keep each reply under 80 words, in plain, simple English.
- If they write in Luganda, Swahili or another language, reply in that language as best you can.
- Be non-judgemental. Thank them for their honesty. Never lecture or shame.
- Do not ask for their full name, address, ID number or phone number.

Safety comes first. If at any point they mention thoughts of suicide or self-harm, harming someone, an overdose, a seizure or fit, seeing or hearing things, or a medical emergency: set crisis to true, tell them clearly and kindly to get help now by calling 999 or 112, the free Mental Health Uganda helpline 0800 21 21 21, or going to Butabika Hospital or the nearest health facility, and that they can still continue here afterwards. Do not continue the intake questions in that reply.

Set ready_to_match to true once you understand their main concern, how serious it is, and their preferences for language, session type and budget, which is usually after 4 to 8 of their messages. When you set it, tell them they can now see the professionals matched to them, and that they can keep talking if they want to add anything.`;

const TurnSchema = z.object({
  reply: z.string().describe("Your next message to the person."),
  crisis: z.boolean().describe("True if the person may be at risk of harm to themselves or others, or describes a medical emergency."),
  ready_to_match: z.boolean().describe("True once there is enough information to match them with a professional."),
});

const AssessmentSchema = z.object({
  summary: z
    .string()
    .describe(
      "3 to 6 sentences for the professional, in the third person: main concern, duration and pattern, impact, mental health, withdrawal or medication, past help, goals. No names or identifying details.",
    ),
  concerns: z.array(z.string()).describe("Up to 5 short phrases naming the person's main concerns, e.g. 'Daily drinking for 3 years'."),
  specialties: z.array(z.enum(SPECIALTY_VALUES)).describe("The specialties that fit their needs, most important first."),
  needs_medical_review: z
    .boolean()
    .describe("True if withdrawal symptoms, heavy daily use of alcohol or sedatives, psychosis, or medication questions mean a psychiatrist or psychiatric nurse should be involved."),
  severity: z.enum(["low", "moderate", "high", "crisis"]),
  preferred_languages: z.array(z.string()).describe("Languages they want to speak in, e.g. ['Luganda', 'English']. Empty if not mentioned."),
  preferred_modes: z.array(z.enum(["chat", "audio", "video"])).describe("Session types they prefer. Empty if not mentioned."),
  max_budget_ugx: z.number().nullable().describe("The most they said they can pay per session, in Ugandan shillings, or null if not mentioned."),
});

export type IntakeAssessment = z.infer<typeof AssessmentSchema>;

export class IntakeAiError extends Error {}

const toParams = (messages: IntakeMessage[]): Anthropic.Beta.BetaMessageParam[] =>
  messages.map((m) => ({ role: m.role, content: m.content }));

/** The assistant's next reply in the intake conversation. */
export async function nextIntakeTurn(messages: IntakeMessage[]) {
  try {
    const res = await anthropic().beta.messages.parse({
      ...FALLBACK,
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: betaZodOutputFormat(TurnSchema) },
      system: SYSTEM,
      messages: toParams(messages),
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      // Never leave someone without a reply: fall back to a safe, supportive message.
      return {
        reply:
          "I'm sorry, I couldn't respond to that properly. If you're in danger or thinking of harming yourself, please call 999 or 112, or the free Mental Health Uganda helpline on 0800 21 21 21. Otherwise, could you tell me a little more in different words?",
        crisis: res.stop_reason === "refusal",
        ready_to_match: false,
      };
    }
    return res.parsed_output;
  } catch (error) {
    throw new IntakeAiError(error instanceof Error ? error.message : "AI request failed");
  }
}

const SPECIALTY_GUIDE = SPECIALTIES.map((s) => `${s.value}: ${s.label}`).join("; ");
const MODE_GUIDE = SESSION_MODES.map((m) => `${m.value}: ${m.label}`).join("; ");

/** A structured assessment of the whole conversation, used for matching and (if shared) by the professional. */
export async function assessIntake(messages: IntakeMessage[]): Promise<IntakeAssessment> {
  const transcript = messages.map((m) => `${m.role === "user" ? "Person" : "Assistant"}: ${m.content}`).join("\n\n");
  try {
    const res = await anthropic().beta.messages.parse({
      ...FALLBACK,
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "medium", format: betaZodOutputFormat(AssessmentSchema) },
      system:
        "You summarise intake conversations for a recovery app in Uganda so the person can be matched with a licensed mental health professional. " +
        "Base everything strictly on what the person said; do not invent details. When unsure, choose the more cautious option (for example, flag medical review). " +
        `Specialty codes — ${SPECIALTY_GUIDE}. Session types — ${MODE_GUIDE}.`,
      messages: [{ role: "user", content: `Here is the intake conversation:\n\n<conversation>\n${transcript}\n</conversation>\n\nAssess it.` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) throw new IntakeAiError("The assessment could not be completed.");
    return res.parsed_output;
  } catch (error) {
    if (error instanceof IntakeAiError) throw error;
    throw new IntakeAiError(error instanceof Error ? error.message : "AI request failed");
  }
}

/** Turns a stored assessment (JSON from the database) back into matcher input, defensively. */
export function needsFromAssessment(raw: unknown): (CareNeeds & { summary: string; concerns: string[] }) | null {
  const parsed = AssessmentSchema.safeParse(raw);
  if (!parsed.success) return null;
  const a = parsed.data;
  return {
    summary: a.summary,
    concerns: a.concerns.slice(0, 5),
    specialties: [...new Set(a.specialties)],
    needs_medical_review: a.needs_medical_review,
    severity: a.severity,
    preferred_languages: a.preferred_languages,
    preferred_modes: [...new Set(a.preferred_modes)],
    max_budget_ugx: a.max_budget_ugx != null && a.max_budget_ugx > 0 ? Math.round(a.max_budget_ugx) : null,
  };
}
