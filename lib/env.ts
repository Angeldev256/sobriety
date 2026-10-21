function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const APP_NAME = "Sobriety Tracker";

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
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
};
