-- MinePulse Command · Supabase production foundation
-- Run this file once in Supabase SQL Editor, or with the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.mines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text not null,
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'Watch' check (status in ('Healthy', 'Watch', 'Action needed')),
  x text not null default '50%',
  y text not null default '50%',
  color text not null default 'amber' check (color in ('green', 'amber', 'red')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 180),
  mine text not null,
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low')),
  category text not null check (category in ('Safety hazard', 'Worker grievance', 'Environmental issue', 'Compliance concern')),
  description text not null check (char_length(description) between 3 and 5000),
  recipient text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid references public.observations(id) on delete set null,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null,
  category text not null,
  mine text not null,
  severity text not null,
  description text not null,
  recipient text not null,
  latitude double precision,
  longitude double precision,
  status text not null default 'Queued' check (status in ('Queued', 'Sent', 'Failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table if not exists public.risk_reviews (
  risk_title text not null,
  reviewer_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  primary key (risk_title, reviewer_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid default auth.uid() references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 180),
  mine text not null,
  workers integer not null default 0 check (workers >= 0),
  induction_pct integer not null default 0 check (induction_pct between 0 and 100),
  next_renewal date,
  status text not null default 'Active' check (status in ('Active', 'On hold')),
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  mine text not null,
  requirement text not null check (char_length(requirement) between 3 and 300),
  domain text not null check (domain in ('Safety', 'Environment', 'Production', 'Labour')),
  due_date date,
  status text not null default 'Open' check (status in ('Open', 'In review', 'Complete')),
  notes text not null default '' check (char_length(notes) <= 3000),
  created_at timestamptz not null default now()
);

create index if not exists observations_created_at_idx on public.observations (created_at desc);
create index if not exists contractors_reporter_idx on public.contractors (reporter_id, created_at desc);
create index if not exists compliance_checks_reporter_idx on public.compliance_checks (reporter_id, created_at desc);
create index if not exists observations_mine_idx on public.observations (mine);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists evidence_observation_id_idx on public.evidence (observation_id);

-- Enable live report refreshes when this Supabase project exposes the standard realtime publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.observations';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.reports';
    exception when duplicate_object then null; end;
  end if;
end $$;

create or replace function public.minepulse_auto_report()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.reports (observation_id, reporter_id, title, category, mine, severity, description, recipient, latitude, longitude, status)
  values (new.id, new.reporter_id, new.title, new.category, new.mine, new.severity, new.description, new.recipient, new.latitude, new.longitude, 'Queued');

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (new.reporter_id, 'automatic_report_created', 'observation', new.id,
    jsonb_build_object('category', new.category, 'mine', new.mine, 'recipient', new.recipient, 'severity', new.severity));

  return new;
end;
$$;

drop trigger if exists observations_auto_report on public.observations;
create trigger observations_auto_report
after insert on public.observations
for each row execute function public.minepulse_auto_report();

alter table public.mines enable row level security;
alter table public.observations enable row level security;
alter table public.reports enable row level security;
alter table public.evidence enable row level security;
alter table public.risk_reviews enable row level security;
alter table public.audit_events enable row level security;
alter table public.contractors enable row level security;
alter table public.compliance_checks enable row level security;

drop policy if exists "authenticated users can read mines" on public.mines;
create policy "authenticated users can read mines" on public.mines for select to authenticated using (auth.uid() is not null);

drop policy if exists "users can read own observations" on public.observations;
create policy "users can read own observations" on public.observations for select to authenticated using (reporter_id = auth.uid());
drop policy if exists "users can create own observations" on public.observations;
create policy "users can create own observations" on public.observations for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "users can read own reports" on public.reports;
create policy "users can read own reports" on public.reports for select to authenticated using (reporter_id = auth.uid());

-- Explicit table grants complement (do not replace) the row-level security policies.
grant select on public.mines to authenticated;
grant select, insert on public.observations to authenticated;
grant select on public.reports to authenticated;
grant select, insert on public.evidence to authenticated;
grant select, insert, update on public.risk_reviews to authenticated;
grant select on public.audit_events to authenticated;

-- Reports are created by the trigger, not directly by the browser.
drop policy if exists "users can read own evidence metadata" on public.evidence;
create policy "users can read own evidence metadata" on public.evidence for select to authenticated using (
  exists (select 1 from public.observations o where o.id = evidence.observation_id and o.reporter_id = auth.uid())
);
drop policy if exists "users can create own evidence metadata" on public.evidence;
create policy "users can create own evidence metadata" on public.evidence for insert to authenticated with check (
  uploaded_by = auth.uid() and exists (select 1 from public.observations o where o.id = evidence.observation_id and o.reporter_id = auth.uid())
);

drop policy if exists "users can read own risk reviews" on public.risk_reviews;
create policy "users can read own risk reviews" on public.risk_reviews for select to authenticated using (reviewer_id = auth.uid());
drop policy if exists "users can create own risk reviews" on public.risk_reviews;
create policy "users can create own risk reviews" on public.risk_reviews for insert to authenticated with check (reviewer_id = auth.uid());
drop policy if exists "users can update own risk reviews" on public.risk_reviews;
create policy "users can update own risk reviews" on public.risk_reviews for update to authenticated using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

drop policy if exists "users can read own audit events" on public.audit_events;
create policy "users can read own audit events" on public.audit_events for select to authenticated using (actor_id = auth.uid());

-- Per-anonymous-user isolation keeps this demo's registers private to the browser identity.
grant select, insert, update, delete on public.contractors to authenticated;
grant select, insert, update, delete on public.compliance_checks to authenticated;

drop policy if exists "users can manage own contractors" on public.contractors;
create policy "users can manage own contractors" on public.contractors for all to authenticated
using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());

drop policy if exists "users can manage own compliance checks" on public.compliance_checks;
create policy "users can manage own compliance checks" on public.compliance_checks for all to authenticated
using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('minepulse-evidence', 'minepulse-evidence', false)
on conflict (id) do nothing;

drop policy if exists "users can upload own evidence" on storage.objects;
create policy "users can upload own evidence" on storage.objects for insert to authenticated with check (
  bucket_id = 'minepulse-evidence' and (storage.foldername(name))[1] in (select id::text from public.observations where reporter_id = auth.uid())
);
drop policy if exists "users can read own evidence files" on storage.objects;
create policy "users can read own evidence files" on storage.objects for select to authenticated using (
  bucket_id = 'minepulse-evidence' and (storage.foldername(name))[1] in (select id::text from public.observations where reporter_id = auth.uid())
);

insert into public.mines (name, location, score, status, x, y, color)
values
  ('Gevra OC', 'Korba · Chhattisgarh', 94, 'Healthy', '58%', '47%', 'green'),
  ('Dipka OC', 'Korba · Chhattisgarh', 82, 'Watch', '61%', '55%', 'amber'),
  ('Kusmunda', 'Korba · Chhattisgarh', 76, 'Action needed', '55%', '63%', 'red'),
  ('Sohagpur', 'Umaria · Madhya Pradesh', 91, 'Healthy', '43%', '37%', 'green'),
  ('Jayant', 'Singrauli · MP', 88, 'Healthy', '36%', '53%', 'green'),
  ('Nigahi', 'Singrauli · MP', 69, 'Action needed', '31%', '62%', 'red')
on conflict (name) do update set
  location = excluded.location,
  score = excluded.score,
  status = excluded.status,
  x = excluded.x,
  y = excluded.y,
  color = excluded.color,
  updated_at = now();

-- Realtime is optional; if it is already enabled, these statements are harmless to run once.
do $$
begin
  begin alter publication supabase_realtime add table public.observations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reports; exception when duplicate_object then null; end;
end;
$$;
