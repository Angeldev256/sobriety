-- Professional care: AI intake, verified mental health professionals, paid consultations
-- (Flutterwave) and a resource library (Butabika and other institutions).
--
-- Money and permissions are decided here, not in the browser:
--   * fees are copied from the professional's profile when a booking is created (create_consultation)
--   * only the server's service role can mark a booking paid (activate_consultation), after it has
--     verified the payment with Flutterwave
--   * professionals can't verify themselves; only admins can (review_professional)

-- ---------------------------------------------------------------------------
-- a paid consultation opens a support connection with relationship 'professional'
-- ---------------------------------------------------------------------------
alter table public.support_connections drop constraint if exists support_connections_relationship_check;
alter table public.support_connections add constraint support_connections_relationship_check
  check (relationship in ('counselor', 'sponsor', 'family', 'friend', 'peer', 'health_worker', 'faith_leader', 'professional', 'other'));

-- ---------------------------------------------------------------------------
-- admins (added by hand in the SQL editor — see README)
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- one-row settings table
create table public.app_settings (
  id                   boolean primary key default true check (id),
  platform_fee_percent numeric(5, 2) not null default 10 check (platform_fee_percent between 0 and 50),
  updated_at           timestamptz not null default now()
);
insert into public.app_settings default values;

-- ---------------------------------------------------------------------------
-- professionals (one row per professional's user account)
-- ---------------------------------------------------------------------------
create table public.professionals (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null check (char_length(full_name) between 2 and 80),
  email              text not null check (email = lower(email) and char_length(email) <= 254),
  profession         text not null check (profession in
                       ('counsellor', 'clinical_psychologist', 'psychiatrist', 'psychiatric_nurse', 'social_worker', 'addiction_specialist')),
  licence_body       text not null check (char_length(licence_body) between 2 and 120),
  licence_number     text not null check (char_length(licence_number) between 2 and 60),
  institution        text check (char_length(institution) <= 120),
  bio                text not null check (char_length(bio) between 40 and 1200),
  specialties        text[] not null check (cardinality(specialties) between 1 and 11 and specialties <@ array[
                       'alcohol', 'drugs', 'gambling', 'tobacco', 'dual_diagnosis', 'trauma',
                       'family', 'youth', 'women', 'relapse_prevention', 'withdrawal_medical']),
  languages          text[] not null check (cardinality(languages) between 1 and 10 and languages <@ array[
                       'English', 'Luganda', 'Swahili', 'Runyankole', 'Rukiga', 'Lusoga', 'Luo',
                       'Ateso', 'Lugbara', 'Runyoro', 'Rutooro', 'Lumasaba', 'Karimojong']),
  session_modes      text[] not null check (cardinality(session_modes) between 1 and 3 and session_modes <@ array['chat', 'audio', 'video']),
  fee_ugx            integer not null check (fee_ugx between 5000 and 2000000),
  payout_phone       text check (payout_phone ~ '^[0-9]{9,15}$'),
  accepting_patients boolean not null default true,
  status             text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'suspended')),
  review_note        text check (char_length(review_note) <= 500),
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index professionals_status_idx on public.professionals (status);

create or replace function public.is_verified_professional()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.professionals where user_id = (select auth.uid()) and status = 'verified');
$$;

-- Professionals can't set their own review status. Changing licence details after review sends the
-- profile back for re-verification (a suspension stays in place).
create or replace function public.guard_professional()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status      := 'pending';
    new.review_note := null;
    new.reviewed_at := null;
    return new;
  end if;
  new.user_id     := old.user_id;
  new.status      := old.status;
  new.review_note := old.review_note;
  new.reviewed_at := old.reviewed_at;
  if old.status in ('verified', 'rejected')
     and (new.profession, new.licence_body, new.licence_number) is distinct from (old.profession, old.licence_body, old.licence_number) then
    new.status      := 'pending';
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;
create trigger professionals_guard before insert or update on public.professionals
  for each row execute function public.guard_professional();

-- ---------------------------------------------------------------------------
-- AI intake conversations (private to the person; the transcript is never shared)
-- ---------------------------------------------------------------------------
create table public.care_intakes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  messages   jsonb not null default '[]' check (jsonb_typeof(messages) = 'array'),
  status     text not null default 'open' check (status in ('open', 'assessed')),
  assessment jsonb,
  crisis     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_intakes_user_idx on public.care_intakes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- consultations: one paid session booking
-- ---------------------------------------------------------------------------
create table public.consultations (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references auth.users (id) on delete cascade,
  patient_name            text not null check (char_length(patient_name) between 1 and 60),
  -- kept (set to null) if the professional deletes their account, so payment records survive
  professional_id         uuid references auth.users (id) on delete set null,
  professional_name       text not null,
  intake_id               uuid references public.care_intakes (id) on delete set null,
  -- the intake summary, only when the patient chose to share it
  intake_summary          text check (char_length(intake_summary) <= 2000),
  fee_ugx                 integer not null check (fee_ugx > 0),
  platform_fee_ugx        integer not null check (platform_fee_ugx between 0 and fee_ugx),
  status                  text not null default 'awaiting_payment'
                            check (status in ('awaiting_payment', 'paid', 'completed', 'cancelled', 'refunded')),
  tx_ref                  text not null unique default ('care-' || replace(gen_random_uuid()::text, '-', '')),
  payment_provider        text check (payment_provider in ('flutterwave', 'manual')),
  provider_transaction_id text unique,
  paid_at                 timestamptz,
  connection_id           uuid references public.support_connections (id) on delete set null,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  check (patient_id <> professional_id)
);
create index consultations_patient_idx on public.consultations (patient_id, created_at desc);
create index consultations_professional_idx on public.consultations (professional_id, created_at desc);

-- ---------------------------------------------------------------------------
-- resource library
-- ---------------------------------------------------------------------------
create table public.resources (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 160),
  description  text check (char_length(description) <= 600),
  institution  text not null check (char_length(institution) between 2 and 120),
  category     text not null check (category in ('guide', 'factsheet', 'treatment', 'family', 'policy', 'research', 'form')),
  source_url   text check (source_url ~ '^https://' and char_length(source_url) <= 500),
  -- object name in the private 'resources' storage bucket: '<uploader id>/<uuid>.<ext>'
  file_path    text unique,
  file_name    text check (char_length(file_name) <= 200),
  file_size    integer check (file_size between 1 and 20971520),
  mime_type    text,
  uploaded_by  uuid references auth.users (id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'published', 'archived')),
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  check (file_path is not null or source_url is not null)
);
create index resources_status_idx on public.resources (status, created_at desc);

-- Only admins publish. A professional's upload waits for review.
create or replace function public.guard_resource()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_admin() then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
      new.published_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.published_at := null;
  end if;
  return new;
end;
$$;
create trigger resources_guard before insert or update on public.resources
  for each row execute function public.guard_resource();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.app_settings  enable row level security;
alter table public.professionals enable row level security;
alter table public.care_intakes  enable row level security;
alter table public.consultations enable row level security;
alter table public.resources     enable row level security;

create policy "admins: see self" on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "settings: read" on public.app_settings for select to authenticated using (true);
create policy "settings: admin update" on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- The full professional row (licence number, payout phone, email) is visible only to its owner and
-- admins. Patients see the public card through list_professionals().
create policy "professionals: read own" on public.professionals for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "professionals: apply" on public.professionals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "professionals: update own" on public.professionals for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy "intakes: own" on public.care_intakes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Bookings are created and changed only through the functions below.
create policy "consultations: participants read" on public.consultations for select to authenticated
  using (patient_id = (select auth.uid()) or professional_id = (select auth.uid()) or public.is_admin());

create policy "resources: read published" on public.resources for select to anon, authenticated
  using (status = 'published' or uploaded_by = (select auth.uid()) or public.is_admin());
create policy "resources: add" on public.resources for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and (public.is_admin() or public.is_verified_professional()));
create policy "resources: admin update" on public.resources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "resources: delete" on public.resources for delete to authenticated
  using (public.is_admin() or (uploaded_by = (select auth.uid()) and status = 'pending'));

-- ---------------------------------------------------------------------------
-- storage: private bucket, files under the uploader's own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', false, 20971520, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'text/plain'
])
on conflict (id) do nothing;

create policy "resources bucket: upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'resources'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (public.is_admin() or public.is_verified_professional())
);

create policy "resources bucket: read" on storage.objects for select to authenticated
using (
  bucket_id = 'resources' and (
    public.is_admin()
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.resources r where r.file_path = storage.objects.name and r.status = 'published')
  )
);

create policy "resources bucket: delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'resources' and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
);

-- ---------------------------------------------------------------------------
-- functions
-- ---------------------------------------------------------------------------

-- What patients see when choosing a professional: verified, accepting, no private details.
create or replace function public.list_professionals()
returns table (
  user_id uuid, full_name text, profession text, licence_body text, institution text, bio text,
  specialties text[], languages text[], session_modes text[], fee_ugx integer
)
language sql stable security definer set search_path = '' as $$
  select p.user_id, p.full_name, p.profession, p.licence_body, p.institution, p.bio,
         p.specialties, p.languages, p.session_modes, p.fee_ugx
  from public.professionals p
  where p.status = 'verified' and p.accepting_patients and p.user_id <> (select auth.uid());
$$;

-- Creates a booking awaiting payment. The fee comes from the professional's profile, never the caller.
-- An unpaid booking with the same professional is reused (and keeps its price and payment reference).
create or replace function public.create_consultation(pro uuid, intake uuid, share_summary boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me       uuid := (select auth.uid());
  p        public.professionals;
  summary  text;
  pct      numeric;
  my_name  text;
  booking  uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into p from public.professionals where user_id = pro;
  if p.user_id is null or p.status <> 'verified' or not p.accepting_patients then
    raise exception 'professional unavailable';
  end if;
  if p.user_id = me then raise exception 'you cannot book yourself'; end if;

  if share_summary and intake is not null then
    select left(i.assessment ->> 'summary', 2000) into summary
    from public.care_intakes i where i.id = intake and i.user_id = me;
  end if;

  select id into booking from public.consultations
  where patient_id = me and professional_id = pro and status = 'awaiting_payment'
  order by created_at desc limit 1;

  if booking is not null then
    update public.consultations
      set intake_id = coalesce(intake, intake_id), intake_summary = summary
      where id = booking;
    return booking;
  end if;

  select platform_fee_percent into pct from public.app_settings where id;
  select left(coalesce(nullif(trim(display_name), ''), 'A member'), 60) into my_name from public.profiles where id = me;

  insert into public.consultations (patient_id, patient_name, professional_id, professional_name, intake_id, intake_summary, fee_ugx, platform_fee_ugx)
  values (me, coalesce(my_name, 'A member'), p.user_id, p.full_name,
          (select i.id from public.care_intakes i where i.id = intake and i.user_id = me),
          summary, p.fee_ugx, round(p.fee_ugx * coalesce(pct, 0) / 100)::integer)
  returning id into booking;
  return booking;
end;
$$;

create or replace function public.cancel_consultation(booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.consultations set status = 'cancelled'
  where id = booking and patient_id = (select auth.uid()) and status = 'awaiting_payment';
end;
$$;

-- Marks a booking paid and opens (or reuses) the support connection that is the session room.
-- Idempotent: a second call for the same booking returns the existing room. Called by the server
-- (service role) after verifying the payment with Flutterwave, or by admin_mark_consultation_paid.
create or replace function public.activate_consultation(booking uuid, provider text, provider_tx text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c         public.consultations;
  pro_email text;
  room      uuid;
begin
  select * into c from public.consultations where id = booking for update;
  if c.id is null then raise exception 'booking not found'; end if;
  if c.status in ('paid', 'completed') then return c.connection_id; end if;
  if c.status <> 'awaiting_payment' then raise exception 'booking is %', c.status; end if;
  if c.professional_id is null then raise exception 'professional no longer available'; end if;

  select email into pro_email from public.professionals where user_id = c.professional_id;

  -- An open connection with this professional (or an invite to their email) becomes the room.
  select id into room from public.support_connections
  where member_id = c.patient_id and status in ('pending', 'active')
    and (helper_id = c.professional_id or (helper_id is null and helper_email = pro_email))
  order by (status = 'active') desc
  limit 1;

  if room is null then
    insert into public.support_connections
      (member_id, member_name, helper_id, helper_name, helper_email, relationship, status, accepted_at)
    values
      (c.patient_id, c.patient_name, c.professional_id, left(c.professional_name, 60), pro_email, 'professional', 'active', now())
    returning id into room;
  else
    update public.support_connections
      set helper_id = c.professional_id, status = 'active', accepted_at = coalesce(accepted_at, now())
      where id = room;
  end if;

  update public.consultations
    set status = 'paid', payment_provider = provider, provider_transaction_id = provider_tx,
        paid_at = now(), connection_id = room
    where id = c.id;
  return room;
end;
$$;

create or replace function public.admin_mark_consultation_paid(booking uuid, reference text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return public.activate_consultation(booking, 'manual', nullif(trim(reference), ''));
end;
$$;

-- Closes the session room unless another paid booking still uses it.
create or replace function public.close_consultation_room(booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.consultations;
begin
  select * into c from public.consultations where id = booking;
  if c.connection_id is null then return; end if;
  if exists (select 1 from public.consultations o where o.connection_id = c.connection_id and o.id <> c.id and o.status = 'paid') then
    return;
  end if;
  update public.support_connections set status = 'ended', is_preferred = false
  where id = c.connection_id and status = 'active';
end;
$$;

create or replace function public.complete_consultation(booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.consultations set status = 'completed', completed_at = now()
  where id = booking and professional_id = (select auth.uid()) and status = 'paid';
  if found then perform public.close_consultation_room(booking); end if;
end;
$$;

-- Records a refund made in the Flutterwave dashboard.
create or replace function public.admin_refund_consultation(booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.consultations set status = 'refunded'
  where id = booking and status in ('paid', 'completed');
  if found then perform public.close_consultation_room(booking); end if;
end;
$$;

create or replace function public.review_professional(pro uuid, decision text, note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if decision not in ('verified', 'rejected', 'suspended') then raise exception 'invalid decision'; end if;
  update public.professionals
    set status = decision, review_note = left(nullif(trim(note), ''), 500), reviewed_at = now()
    where user_id = pro;
end;
$$;

revoke all on function
  public.list_professionals(), public.create_consultation(uuid, uuid, boolean), public.cancel_consultation(uuid),
  public.activate_consultation(uuid, text, text), public.admin_mark_consultation_paid(uuid, text),
  public.close_consultation_room(uuid), public.complete_consultation(uuid), public.admin_refund_consultation(uuid),
  public.review_professional(uuid, text, text)
from public, anon;

grant execute on function
  public.list_professionals(), public.create_consultation(uuid, uuid, boolean), public.cancel_consultation(uuid),
  public.admin_mark_consultation_paid(uuid, text), public.complete_consultation(uuid),
  public.admin_refund_consultation(uuid), public.review_professional(uuid, text, text)
to authenticated;

-- Only the server's service role may mark a payment received or close rooms directly.
revoke all on function public.activate_consultation(uuid, text, text), public.close_consultation_room(uuid) from authenticated;
grant execute on function public.activate_consultation(uuid, text, text), public.close_consultation_room(uuid) to service_role;
