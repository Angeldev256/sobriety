import "server-only";
import { Resend } from "resend";
import { APP_NAME, env } from "@/lib/env";

// Recovery is sensitive. Emails never mention the addiction, check-in answers, notes or
// relapses — only gentle, generic wording and a link back into the app.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout({
  preheader,
  heading,
  body,
  cta,
  footer = "notifications",
}: {
  preheader: string;
  heading: string;
  body: string[];
  cta?: { label: string; url: string };
  footer?: "notifications" | "invite";
}) {
  const footerText =
    footer === "invite"
      ? "Someone entered your email address to invite you. If you weren't expecting this, you can ignore it — nothing happens unless you accept."
      : `You're receiving this because you turned on email notifications. You can change this any time in <a href="${env.siteUrl}/settings#notifications" style="color:#0064b7">Settings</a>.`;
  const paragraphs = body.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333333">${esc(p)}</p>`).join("");
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:#0070d1">
         <a href="${cta.url}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(cta.label)}</a>
       </td></tr></table>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
    <tr><td style="background:#000000;padding:22px 32px;color:#ffffff;font-size:17px;font-weight:300;letter-spacing:-0.2px">${APP_NAME}</td></tr>
    <tr><td style="padding:40px 32px 32px">
      <h1 style="margin:0 0 20px;font-size:28px;line-height:1.25;font-weight:300;color:#000000">${esc(heading)}</h1>
      ${paragraphs}${button}
    </td></tr>
    <tr><td style="padding:24px 32px;border-top:1px solid #ececec;font-size:12px;line-height:1.6;color:#6b6b6b">
      ${footerText}<br>
      Need support right now? <a href="${env.siteUrl}/help" style="color:#0064b7">Find a help line</a>.
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

export type EmailContent = { subject: string; html: string; text: string };

export const emailTemplates = {
  supportInvite(memberName: string, relationship: string, link: string): EmailContent {
    const body = [
      `${memberName} has invited you to be part of their support circle on ${APP_NAME}, as their ${relationship.toLowerCase()}.`,
      "Being in someone's circle means they can message you and call you by voice or video through the app when they need support. You won't see their private notes or check-ins.",
      "If you don't know this person or would rather not, you can simply ignore this email.",
    ];
    return {
      subject: `${memberName} invited you to their support circle`,
      html: layout({ preheader: `${memberName} would like your support.`, heading: "You've been asked to help.", body, cta: { label: "View the invitation", url: link }, footer: "invite" }),
      text: `${body.join("\n\n")}\n\nView the invitation: ${link}`,
    };
  },
  welcome(name: string): EmailContent {
    const body = [
      `Hi ${name}, welcome. Choosing to start is one of the bravest things a person can do, and we're glad you're here.`,
      "Your space is private — only you can see what you track. Start by adding what you're working on and when your sober time began. A one-minute check-in each day helps you notice patterns and progress.",
      "On hard days, your recovery companion is there to talk any time. And help lines are always one tap away.",
    ];
    return {
      subject: `Welcome to ${APP_NAME}`,
      html: layout({ preheader: "Your private recovery space is ready.", heading: "Welcome. You've taken the first step.", body, cta: { label: "Open Sobriety Tracker", url: `${env.siteUrl}/dashboard` } }),
      text: `${body.join("\n\n")}\n\nOpen the app: ${env.siteUrl}/dashboard`,
    };
  },
  reminder(name: string, line: string): EmailContent {
    const body = [`Hi ${name}, ${line}`, "Taking a minute to check in is a small act of care for yourself."];
    return {
      subject: "A gentle check-in",
      html: layout({ preheader: line, heading: "How's today going?", body, cta: { label: "Check in", url: `${env.siteUrl}/check-in` } }),
      text: `${body.join("\n\n")}\n\nCheck in: ${env.siteUrl}/check-in`,
    };
  },
  milestone(name: string, title: string, description: string): EmailContent {
    const body = [`${name}, you reached a milestone: ${title}.`, description, "Take a moment to honour how far you've come. Every one of those days was a choice."];
    return {
      subject: `Milestone reached: ${title}`,
      html: layout({ preheader: `You reached ${title}.`, heading: `${title}.`, body, cta: { label: "See your milestones", url: `${env.siteUrl}/milestones` } }),
      text: `${body.join("\n\n")}\n\n${env.siteUrl}/milestones`,
    };
  },
};

/** Sends an email if email notifications are configured; otherwise a silent no-op. */
export async function sendEmail(to: string, content: EmailContent): Promise<boolean> {
  if (!env.emailEnabled) return false;
  const resend = new Resend(env.resendApiKey);
  const { error } = await resend.emails.send({ from: env.emailFrom, to, ...content });
  return !error;
}
