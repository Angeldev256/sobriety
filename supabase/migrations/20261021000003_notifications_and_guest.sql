-- Notifications (email, web push, in-app inbox), recovery details, and guest access to public content.

-- ---------------------------------------------------------------------------
-- recovery details on each tracker
-- ---------------------------------------------------------------------------
alter table public.addictions
  add column reason     text check (char_length(reason) <= 300),
  add column daily_cost numeric(10, 2) check (daily_cost >= 0 and daily_cost <= 100000);

alter table public.profiles
  add column currency           text not null default 'USD' check (char_length(currency) = 3),
  add column welcome_email_sent boolean not null default false;

-- ---------------------------------------------------------------------------
-- notification preferences (extends the existing reminder settings row)
-- ---------------------------------------------------------------------------
alter table public.reminder_settings
  add column push_enabled     boolean not null default false,
  add column milestone_alerts boolean not null default true,
  add column encouragement    boolean not null default true;

-- milestone alerts are sent once per earned badge
alter table public.user_achievements
  add column notified boolean not null default false;

-- ---------------------------------------------------------------------------
-- web push subscriptions (one per device/browser)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- in-app notification inbox
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('welcome', 'reminder', 'milestone', 'encouragement', 'system')),
  title      text not null check (char_length(title) <= 120),
  body       text not null check (char_length(body) <= 500),
  url        text check (url like '/%'),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.notifications      enable row level security;

create policy "owner: all" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner: all" on public.notifications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- guests can read the shared motivational messages (no personal data)
-- ---------------------------------------------------------------------------
create policy "messages: guest read" on public.messages for select to anon using (true);
