function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const APP_NAME = "Sobriety Tracker";

/**
 * The Supabase project URL reduced to its origin. People often paste the REST endpoint
 * (https://<ref>.supabase.co/rest/v1/) by mistake; the clients need just the origin.
 */
export function supabaseOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

export const env = {
  get supabaseUrl() {
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
    return supabaseOrigin();
  },
  get supabaseKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  },
  get supabaseSecretKey() {
    return process.env.SUPABASE_SECRET_KEY;
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
  get emailEnabled() {
    return process.env.EMAIL_NOTIFICATIONS_ENABLED === "true" && Boolean(process.env.RESEND_API_KEY);
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? `${APP_NAME} <hello@example.com>`;
  },
  get vapidPublicKey() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  },
  get vapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY;
  },
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? "mailto:support@example.com";
  },
  get pushEnabled() {
    return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  },
  /** The AI intake assistant needs an Anthropic API key. */
  get careAiEnabled() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  get flutterwaveSecretKey() {
    return process.env.FLW_SECRET_KEY;
  },
  /** The "Secret hash" set in the Flutterwave dashboard; sent back in each webhook's verif-hash header. */
  get flutterwaveWebhookHash() {
    return process.env.FLW_WEBHOOK_HASH;
  },
  /** Paying for consultations needs Flutterwave keys and the service key (to record payments). */
  get paymentsEnabled() {
    return Boolean(process.env.FLW_SECRET_KEY && process.env.SUPABASE_SECRET_KEY);
  },
};

/**
 * True once real Supabase credentials are in place (not the .env.example placeholders).
 * Safe to call on the server and in the browser — it only reads NEXT_PUBLIC_* values.
 */
export function isSupabaseConfigured(): boolean {
  const url = supabaseOrigin();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !url.includes("your-project-ref") && key.length > 20 && !key.endsWith("xxx");
}

export const NOT_CONFIGURED_MESSAGE =
  "Sign-in isn't connected yet. The app's Supabase project still needs to be set up — see the README.";
