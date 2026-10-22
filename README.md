# Sobriety Tracker

A free, private, judgment-free web app for people in addiction recovery. Anyone can use the coping toolkit, help lines, daily reflection and sober-time calculator without an account. Creating a free account unlocks private tracking: a live sober-time counter, daily check-ins, goals, milestones, progress history, and gentle reminders by email or phone notification. It installs on phones and desktops as a Progressive Web App. **100% free — no paywalls, no subscriptions, no locked features.**

## Features

- **Sign in your way:** email and password (with email confirmation, forgot-password and reset flows) or Google. Passwords are handled by Supabase Auth and never touch this app's database.
- **No account needed for support:** the coping toolkit (urge timer, guided breathing, 5-4-3-2-1 grounding), help lines, today's reflection and a sober-time calculator are open to everyone. Tracking features send guests to sign in, then return them to where they were.
- **Notifications:** a welcome email, daily check-in reminders, milestone alerts and occasional encouragement, delivered to an in-app inbox and, if the user chooses, by web push (phone or desktop) and email. Lock-screen and email wording never mentions the addiction.
- **Live sobriety timer.** Track several addictions (alcohol, nicotine, drugs, gambling, other), each with its own counter.
- **Daily check-ins.** Record mood, cravings, triggers, a note and whether you stayed sober. One per day per tracker, and today's entry can be edited.
- **Recovery goals.** Create, edit, complete and delete goals, with an optional target date and a status.
- **Milestones and badges.** Badges at 1, 3, 7, 14, 30, 60, 90, 180 and 365 days and yearly after that, for check-in streaks, and for completed goals. New badges get a celebration animation.
- **Message of the day.** 55 supportive messages, which you can save as favorites.
- **Progress history.** A calendar colored by mood or sober status, a 30-day mood and craving chart, the current and longest streaks, total sober days, top triggers and the relapse log.
- **Reminders.** A banner on the dashboard when today's check-in is missing, plus optional email reminders (Resend) behind an environment flag.
- **Compassionate relapse flow.** "I slipped" lets you reset or keep your counter. Your history and longest streak are always kept.
- **Get help now.** Crisis and addiction help lines that you can switch by country. The page is linked from every footer and works offline.
- **Settings.** Profile, time zone, country, light/dark/system theme, CSV/JSON export, and permanent account deletion.
- **Installable PWA.** A manifest, a service worker, an offline page and an "Install app" button, with Add to Home Screen instructions on iOS.

### Made for Uganda

- New accounts default to Uganda: Kampala time, Ugandan shillings (UGX) for money saved, and Ugandan help lines first.
- Trackers use local wording: betting, waragi and local brews, mairungi (khat).
- Phone numbers accept local formats such as `0772 123 456`.
- **Verify the Ugandan help-line numbers in `lib/helplines.ts` before launch.** Lines in a crisis app must be current.

### Photos

- Photos come from Unsplash under the free Unsplash License. Each one is credited to its photographer on the page.
- All six are listed in `lib/photos.ts`. To swap one, change its `id` and credit there.
- They're served from Unsplash's CDN, resized to each screen's width and delivered as WebP or AVIF to keep mobile data use low.

### Support circle (preferred helper)

- A member invites a counsellor, sponsor, health worker, faith leader, family member or friend by email. The invite link can also be shared on WhatsApp.
- The helper signs in with that email and accepts. Either person can end the connection at any time.
- Once connected, they can use:
  - **chat:** live updates, with a phone notification that doesn't include the message text
  - **in-app video and voice calls:** WebRTC, peer-to-peer and not recorded
  - **one-tap WhatsApp and phone buttons:** a fallback when mobile data is weak
- One helper can be marked **preferred**. They then appear on the overview and on the Get help page.
- Helpers never see check-ins, notes or relapses. A member can choose to share their sober days.

## Tech stack

| Area      | Choice |
|-----------|--------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions), TypeScript |
| Styling   | Tailwind CSS 4, custom calming design tokens, light and dark mode |
| Database  | Supabase Postgres with **Row Level Security** on every table |
| Auth      | Supabase Auth (email and password, optional Google), cookie sessions via `@supabase/ssr` |
| Calls and chat | WebRTC, with Supabase Realtime (private channels) for signalling and live chat |
| Validation | Zod on every Server Action and form |
| Charts and dates | Recharts, date-fns + `@date-fns/tz` |
| Email     | Resend (optional) |
| Tests     | Vitest |

## Project structure

```
app/
  page.tsx                landing
  login/ register/        Google sign-in (/register redirects to /login)
  auth/callback|signout   OAuth code exchange, POST sign-out
  (app)/                  signed-in area (layout checks the session)
    dashboard/ check-in/ goals/ milestones/ history/ settings/ relapse/[id]/
  help/ offline/          public pages (also cached for offline use)
  api/export              CSV/JSON download of your own data
  api/cron/notifications  reminders, milestone alerts, encouragement (protected by CRON_SECRET)
  manifest.ts             PWA manifest
components/               UI components (forms, timer, calendar, chart, celebration, PWA)
lib/
  supabase/               server/browser clients, requireUser()
  recovery/               pure time, streak and milestone logic (unit tested)
  data.ts                 server data loaders, achievement sync, message of the day
  validations.ts          Zod schemas
  helplines.ts            help lines by country (edit to add countries)
supabase/migrations/      schema, RLS policies, triggers, seed content
public/sw.js              service worker
tests/                    Vitest unit tests
proxy.ts                  session refresh and route protection (Next 16's "middleware")
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Create a free project at <https://supabase.com/dashboard>.
2. Apply the database migrations. Use **either** of these:
   - **SQL Editor:** paste and run the four files in `supabase/migrations/` in order (`…01_schema`, `…02_seed_content`, `…03_notifications_and_guest`, `…04_support_circle_uganda`).
   - **CLI:** `npx supabase link --project-ref <your-ref>` and then `npx supabase db push`.

   Together they create the tables, the RLS policies, the profile trigger, the account-deletion function, the 14 badges and the 55 motivational messages.

### 3. Set up sign-in

**Email and password:** go to **Authentication → Sign In / Providers** and make sure **Email** is enabled. Keep **Confirm email** on (recommended). Optionally, turn on leaked-password protection.

**Confirmation emails:** Supabase's built-in email service only delivers to your own team's addresses. To let anyone sign up, either set up custom SMTP under **Authentication → Emails → SMTP settings** (for example Resend, Brevo or Mailgun), or, while testing, turn off **Confirm email**.

**Use the project URL, not the REST URL:** `NEXT_PUBLIC_SUPABASE_URL` should be `https://<ref>.supabase.co`, with nothing after `.co`. The app strips a pasted `/rest/v1/` automatically, but it's best to keep the value clean.

**Google (optional):** once the provider below is enabled, set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. The Google button stays hidden until then.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**. You'll need to configure the OAuth consent screen first if you haven't.
   - **Authorized JavaScript origins:** `http://localhost:3000` and your production URL.
   - **Authorized redirect URI:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase, go to **Authentication → Sign In / Providers → Google**. Enable it and paste the Client ID and Client Secret.
3. In Supabase, go to **Authentication → URL Configuration**:
   - **Site URL:** your production URL (use `http://localhost:3000` while developing).
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` and `https://your-domain/auth/callback`. Email confirmation, password reset and Google all return through this route.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings → API**. The publishable (anon) key is safe to expose in the browser because RLS protects the data. Leave the email settings empty unless you want email reminders.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (streaks, milestones, sober time, time zones) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run icons` | Regenerate the PWA icons |

## Notifications

Everything below is optional. Without it, the dashboard still shows a reminder banner and the in-app inbox still works.

### The notifications job

Set `SUPABASE_SECRET_KEY` (service-role key, server only) and `CRON_SECRET` (any long random string), then call
`GET /api/cron/notifications` with the header `Authorization: Bearer <CRON_SECRET>` every 15 to 60 minutes. On each run, for each member and according to their settings, it:

1. awards newly reached milestones and sends one alert for the biggest,
2. sends the daily reminder once per local day, after their chosen time, only if they haven't checked in,
3. sends a supportive note at most once a week, around midday local time.

- **Vercel Pro:** add a `vercel.json` with `{ "crons": [{ "path": "/api/cron/notifications", "schedule": "*/15 * * * *" }] }`. Vercel sends `CRON_SECRET` automatically.
- **Vercel Hobby:** Hobby only allows daily crons, so use a free external scheduler (for example cron-job.org or a GitHub Actions schedule) that calls the URL with the header.

### Email (Resend)

```
EMAIL_NOTIFICATIONS_ENABLED=true
RESEND_API_KEY=...
EMAIL_FROM="Sobriety Tracker <hello@yourdomain.com>"
```

This sends the welcome email, plus reminder and milestone emails to members who turn email on in Settings. Supabase sends the sign-up confirmation and password-reset emails itself. For production, configure custom SMTP under **Authentication → Emails** so those come from your domain too.

### Web push (phone and desktop)

```bash
npx web-push generate-vapid-keys
```

Put the keys in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a `mailto:` address). Members turn push on per device under **Settings → Notifications**, where they can also send themselves a test. On iPhone and iPad, push only works after the app is added to the Home Screen (iOS 16.4 or later).

## Calls

Video and voice calls use WebRTC. Signalling runs over private Supabase Realtime channels, protected by the policies in migration 4.

- **Public STUN:** with this alone, calls connect on most Wi-Fi.
- **Mobile networks (MTN, Airtel):** many sit behind carrier NAT and need a **TURN relay**. Add one to `.env.local`, for example from Metered, Twilio or Cloudflare Calls:

  ```
  NEXT_PUBLIC_TURN_URLS=turn:your-turn-host:3478,turns:your-turn-host:5349
  NEXT_PUBLIC_TURN_USERNAME=...
  NEXT_PUBLIC_TURN_CREDENTIAL=...
  ```

- **Ringing a closed app:** to wake a helper whose app is closed, set `SUPABASE_SECRET_KEY` and the web push keys. The incoming call then arrives as a phone notification.
- **WhatsApp and phone buttons:** these always work as a fallback.

## Deployment (Vercel + Supabase)

1. Push the repository to GitHub and import it in Vercel.
2. Add the environment variables from `.env.example`, with `NEXT_PUBLIC_SITE_URL` set to your production URL.
3. Add the production `/auth/callback` URL to Supabase's Redirect URLs and the production origin to the Google OAuth client.
4. Deploy. The app is then installable from the browser on Android, iOS and desktop.

## Privacy and security

- **Row Level Security** is on for every table, so a user can only read and write rows where `user_id = auth.uid()`. Restrictive policies also stop a user from attaching check-ins, relapses or badges to someone else's tracker.
- Every Server Action re-checks the user with `supabase.auth.getUser()` and filters by `user_id`, as defence in depth.
- Check-in dates are computed on the server from the user's saved time zone, so the client can't backdate or duplicate them. Timestamps are stored in UTC and shown in the user's time zone.
- The service-role key is used only by the reminder cron and never reaches the browser.
- Sign-out is POST-only. `?next=` redirects only accept same-site paths. Server Actions have Next's built-in origin check against CSRF, and Supabase rate-limits its auth endpoints.
- Private pages are never cached by the service worker.
- Account deletion calls a `security definer` SQL function that deletes the auth user, and every row cascades with it.
- CSV export escapes cells to prevent spreadsheet formula injection.

## Disclaimer

This app is a self-help tool, not medical advice. Help line numbers can change, so check them regularly in `lib/helplines.ts`.
