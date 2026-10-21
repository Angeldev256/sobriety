-- Support circle (preferred helpers, chat, audio/video calls) and Uganda defaults.

-- ---------------------------------------------------------------------------
-- Uganda defaults for new accounts
-- ---------------------------------------------------------------------------
alter table public.profiles alter column country  set default 'UG';
alter table public.profiles alter column timezone set default 'Africa/Kampala';
alter table public.profiles alter column currency set default 'UGX';

-- new notification kinds
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('welcome', 'reminder', 'milestone', 'encouragement', 'system', 'message', 'call', 'support'));

-- ---------------------------------------------------------------------------
-- support connections: a member (in recovery) invites a helper by email
-- ---------------------------------------------------------------------------
create table public.support_connections (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references auth.users (id) on delete cascade,
  member_name    text not null check (char_length(member_name) between 1 and 60),
  helper_id      uuid references auth.users (id) on delete cascade,
  helper_name    text not null check (char_length(helper_name) between 1 and 60),
  helper_email   text not null check (helper_email = lower(helper_email) and char_length(helper_email) <= 254),
  relationship   text not null check (relationship in ('counselor', 'sponsor', 'family', 'friend', 'peer', 'health_worker', 'faith_leader', 'other')),
  phone          text check (phone ~ '^[0-9]{9,15}$'),
  is_preferred   boolean not null default false,
  share_progress boolean not null default false,
  status         text not null default 'pending' check (status in ('pending', 'active', 'declined', 'ended')),
  invite_token   uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  check (helper_id is null or helper_id <> member_id)
);
create index support_connections_member_idx on public.support_connections (member_id, status);
create index support_connections_helper_idx on public.support_connections (helper_id, status);
-- one open invite/connection per helper email, and one preferred helper per member
create unique index support_connections_open_email on public.support_connections (member_id, helper_email)
  where status in ('pending', 'active');
create unique index support_connections_one_preferred on public.support_connections (member_id)
  where is_preferred and status in ('pending', 'active');

create table public.support_messages (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.support_connections (id) on delete cascade,
  sender_id     uuid not null references auth.users (id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index support_messages_conn_idx on public.support_messages (connection_id, created_at desc);

create table public.call_logs (
  id               uuid primary key default gen_random_uuid(),
  connection_id    uuid not null references public.support_connections (id) on delete cascade,
  caller_id        uuid not null references auth.users (id) on delete cascade,
  kind             text not null check (kind in ('audio', 'video')),
  status           text not null check (status in ('completed', 'missed', 'declined', 'failed')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at       timestamptz not null default now()
);
create index call_logs_conn_idx on public.call_logs (connection_id, created_at desc);

-- ---------------------------------------------------------------------------
-- helpers used by policies (security definer avoids recursive RLS lookups)
-- ---------------------------------------------------------------------------
create or replace function public.is_support_participant(conn uuid, require_active boolean default true)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_connections c
    where c.id = conn
      and (select auth.uid()) in (c.member_id, c.helper_id)
      and (not require_active or c.status = 'active')
  );
$$;

create or replace function public.is_connected_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_connections c
    where c.status = 'active'
      and ((c.member_id = (select auth.uid()) and c.helper_id = other)
        or (c.helper_id = (select auth.uid()) and c.member_id = other))
  );
$$;

-- extracts the uuid from a realtime topic like 'call:<uuid>' (null if it doesn't match)
create or replace function public.realtime_topic_uuid(prefix text)
returns uuid language plpgsql stable set search_path = '' as $$
declare t text := realtime.topic();
begin
  if t ~ ('^' || prefix || ':[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return substr(t, char_length(prefix) + 2)::uuid;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- members can't promote their own invites; only the helper's acceptance can
-- ---------------------------------------------------------------------------
create or replace function public.guard_support_connection_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) = old.member_id then
    new.member_id    := old.member_id;
    new.helper_id    := old.helper_id;
    new.helper_email := old.helper_email;
    new.invite_token := old.invite_token;
    new.accepted_at  := old.accepted_at;
    if new.status <> old.status and new.status <> 'ended' then
      raise exception 'members can only end a connection';
    end if;
  end if;
  return new;
end;
$$;
create trigger support_connections_guard before update on public.support_connections
  for each row execute function public.guard_support_connection_update();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.support_connections enable row level security;
alter table public.support_messages    enable row level security;
alter table public.call_logs           enable row level security;

create policy "member: read own" on public.support_connections for select to authenticated
  using (member_id = (select auth.uid()) or helper_id = (select auth.uid()));
create policy "member: invite" on public.support_connections for insert to authenticated
  with check (member_id = (select auth.uid()) and helper_id is null and status = 'pending');
create policy "member: update own" on public.support_connections for update to authenticated
  using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy "member: delete own" on public.support_connections for delete to authenticated
  using (member_id = (select auth.uid()));

create policy "participants: read messages" on public.support_messages for select to authenticated
  using (public.is_support_participant(connection_id, false));
create policy "participants: send messages" on public.support_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_support_participant(connection_id, true));

create policy "participants: read calls" on public.call_logs for select to authenticated
  using (public.is_support_participant(connection_id, false));
create policy "participants: log calls" on public.call_logs for insert to authenticated
  with check (caller_id = (select auth.uid()) and public.is_support_participant(connection_id, false));

-- ---------------------------------------------------------------------------
-- RPCs for the helper side of the flow
-- ---------------------------------------------------------------------------
create or replace function public.get_support_invite(token uuid)
returns table (member_name text, helper_name text, relationship text, status text, email_matches boolean, is_self boolean)
language sql stable security definer set search_path = '' as $$
  select
    case when c.helper_email = lower(coalesce((select auth.jwt()) ->> 'email', '')) then c.member_name else null end,
    c.helper_name,
    c.relationship,
    c.status,
    c.helper_email = lower(coalesce((select auth.jwt()) ->> 'email', '')),
    c.member_id = (select auth.uid())
  from public.support_connections c
  where c.invite_token = token;
$$;

create or replace function public.accept_support_invite(token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare conn public.support_connections;
begin
  select * into conn from public.support_connections where invite_token = token for update;
  if conn.id is null then raise exception 'invite not found'; end if;
  if conn.status <> 'pending' then raise exception 'invite is no longer open'; end if;
  if conn.member_id = (select auth.uid()) then raise exception 'you cannot accept your own invite'; end if;
  if conn.helper_email <> lower(coalesce((select auth.jwt()) ->> 'email', '')) then
    raise exception 'this invite was sent to a different email address';
  end if;
  update public.support_connections
    set helper_id = (select auth.uid()), status = 'active', accepted_at = now()
    where id = conn.id;
  return conn.id;
end;
$$;

create or replace function public.decline_support_invite(token uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.support_connections
    set status = 'declined'
    where invite_token = token and status = 'pending'
      and helper_email = lower(coalesce((select auth.jwt()) ->> 'email', ''));
end;
$$;

create or replace function public.end_support_connection(conn uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.support_connections
    set status = 'ended', is_preferred = false
    where id = conn and (select auth.uid()) in (member_id, helper_id) and status in ('pending', 'active');
end;
$$;

create or replace function public.mark_support_read(conn uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_support_participant(conn, false) then return; end if;
  update public.support_messages
    set read_at = now()
    where connection_id = conn and sender_id <> (select auth.uid()) and read_at is null;
end;
$$;

-- what a helper sees when the member chose to share progress: tracker names and start dates only
create or replace function public.get_shared_progress(conn uuid)
returns table (label text, type text, start_date timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.label, a.type, a.start_date
  from public.support_connections c
  join public.addictions a on a.user_id = c.member_id and a.is_active
  where c.id = conn and c.status = 'active' and c.share_progress and c.helper_id = (select auth.uid());
$$;

revoke all on function public.get_support_invite(uuid), public.accept_support_invite(uuid), public.decline_support_invite(uuid),
  public.end_support_connection(uuid), public.mark_support_read(uuid), public.get_shared_progress(uuid) from public, anon;
grant execute on function public.get_support_invite(uuid), public.accept_support_invite(uuid), public.decline_support_invite(uuid),
  public.end_support_connection(uuid), public.mark_support_read(uuid), public.get_shared_progress(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- live chat: push each new message to the private 'support:<id>' channel
-- ---------------------------------------------------------------------------
create or replace function public.broadcast_support_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'connection_id', new.connection_id, 'sender_id', new.sender_id, 'body', new.body, 'created_at', new.created_at),
    'message',
    'support:' || new.connection_id::text,
    true
  );
  return null;
end;
$$;
create trigger support_messages_broadcast after insert on public.support_messages
  for each row execute function public.broadcast_support_message();

-- ---------------------------------------------------------------------------
-- Realtime authorization for private channels
--   user:<my id>      — incoming-call rings for me (anyone I'm connected with may send)
--   support:<conn id> — chat updates for a connection I'm part of
--   call:<conn id>    — WebRTC signalling for a connection I'm part of
-- ---------------------------------------------------------------------------
create policy "sobriety: receive" on realtime.messages for select to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence') and (
    (select realtime.topic()) = 'user:' || (select auth.uid())::text
    or public.is_support_participant(public.realtime_topic_uuid('support'), false)
    or public.is_support_participant(public.realtime_topic_uuid('call'), true)
  )
);

create policy "sobriety: send" on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence') and (
    public.is_connected_with(public.realtime_topic_uuid('user'))
    or public.is_support_participant(public.realtime_topic_uuid('call'), true)
  )
);
