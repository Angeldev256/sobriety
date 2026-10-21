-- Sobriety & Addiction Recovery Tracker — core schema
-- Every user-owned table has Row Level Security: a user can only ever touch rows where user_id = auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users, created automatically on first sign-in)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  timezone     text not null default 'UTC',
  country      text not null default 'US',
  theme        text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- addictions being tracked (a user can track several)
-- ---------------------------------------------------------------------------
create table public.addictions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  type                   text not null check (type in ('alcohol', 'nicotine', 'drugs', 'gambling', 'other')),
  label                  text check (char_length(label) <= 60),
  start_date             timestamptz not null,
  is_active              boolean not null default true,
  -- best completed streak before the current one (seconds); current streak is computed live
  longest_streak_seconds bigint not null default 0,
  created_at             timestamptz not null default now()
);
create index addictions_user_idx on public.addictions (user_id, is_active);

-- ---------------------------------------------------------------------------
-- daily check-ins (one per user, addiction and local calendar day)
-- ---------------------------------------------------------------------------
create table public.check_ins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  addiction_id  uuid not null references public.addictions (id) on delete cascade,
  date          date not null, -- the user's local calendar date
  mood          smallint not null check (mood between 1 and 5),
  craving_level smallint not null check (craving_level between 1 and 5),
  triggers      text[] not null default '{}',
  note          text check (char_length(note) <= 1000),
  stayed_sober  boolean not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint check_ins_one_per_day unique (user_id, addiction_id, date)
);
create index check_ins_user_date_idx on public.check_ins (user_id, date desc);

-- ---------------------------------------------------------------------------
-- recovery goals
-- ---------------------------------------------------------------------------
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (char_length(description) <= 1000),
  target_date  date,
  status       text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, status);

-- ---------------------------------------------------------------------------
-- achievement definitions (shared, read-only to users)
-- ---------------------------------------------------------------------------
create table public.achievements (
  id          text primary key,
  kind        text not null check (kind in ('sober_days', 'checkin_streak', 'goals_completed')),
  threshold   integer not null,
  title       text not null,
  description text not null,
  icon        text not null,
  sort_order  integer not null default 0
);

create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  -- sober-day badges belong to one addiction; check-in / goal badges are global (null)
  addiction_id   uuid references public.addictions (id) on delete cascade,
  earned_at      timestamptz not null default now(),
  seen           boolean not null default false,
  constraint user_achievements_unique unique nulls not distinct (user_id, achievement_id, addiction_id)
);
create index user_achievements_user_idx on public.user_achievements (user_id);

-- ---------------------------------------------------------------------------
-- motivational messages (shared) and favorites
-- ---------------------------------------------------------------------------
create table public.messages (
  id     serial primary key,
  body   text not null,
  author text
);

create table public.favorite_messages (
  user_id    uuid not null references auth.users (id) on delete cascade,
  message_id integer not null references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

-- ---------------------------------------------------------------------------
-- relapses (history is always preserved)
-- ---------------------------------------------------------------------------
create table public.relapses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  addiction_id        uuid not null references public.addictions (id) on delete cascade,
  occurred_at         timestamptz not null default now(),
  note                text check (char_length(note) <= 1000),
  counter_reset       boolean not null,
  previous_start_date timestamptz not null,
  streak_seconds      bigint not null,
  created_at          timestamptz not null default now()
);
create index relapses_user_idx on public.relapses (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- reminder settings
-- ---------------------------------------------------------------------------
create table public.reminder_settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  enabled       boolean not null default true,
  reminder_time time not null default '20:00',
  email_enabled boolean not null default false,
  last_sent_on  date,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger check_ins_updated_at before update on public.check_ins
  for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger reminder_settings_updated_at before update on public.reminder_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- create profile + reminder settings on sign-up (copies Google name/avatar)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.reminder_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- self-service account deletion (cascades to every table above)
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.addictions        enable row level security;
alter table public.check_ins         enable row level security;
alter table public.goals             enable row level security;
alter table public.achievements      enable row level security;
alter table public.user_achievements enable row level security;
alter table public.messages          enable row level security;
alter table public.favorite_messages enable row level security;
alter table public.relapses          enable row level security;
alter table public.reminder_settings enable row level security;

create policy "own profile: select" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- generic "owner can do everything" policies
do $$
declare t text;
begin
  foreach t in array array['addictions', 'check_ins', 'goals', 'user_achievements', 'favorite_messages', 'relapses', 'reminder_settings']
  loop
    execute format(
      'create policy "owner: all" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- child rows must point at the caller's own addiction
create policy "check-in addiction must be owned" on public.check_ins as restrictive for all to authenticated
  with check (exists (select 1 from public.addictions a where a.id = addiction_id and a.user_id = (select auth.uid())));
create policy "relapse addiction must be owned" on public.relapses as restrictive for all to authenticated
  with check (exists (select 1 from public.addictions a where a.id = addiction_id and a.user_id = (select auth.uid())));
create policy "achievement addiction must be owned" on public.user_achievements as restrictive for all to authenticated
  with check (addiction_id is null or exists (select 1 from public.addictions a where a.id = addiction_id and a.user_id = (select auth.uid())));

create policy "achievements: read" on public.achievements for select to authenticated using (true);
create policy "messages: read" on public.messages for select to authenticated using (true);
