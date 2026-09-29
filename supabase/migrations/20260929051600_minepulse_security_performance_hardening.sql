-- Keep the trigger's SECURITY DEFINER privilege for automatic report creation,
-- but do not expose the trigger function as a callable PostgREST RPC.
revoke execute on function public.minepulse_auto_report() from public, anon, authenticated;

-- Cover foreign keys used by deletes, joins, and user-scoped lookups.
create index if not exists audit_events_actor_id_idx on public.audit_events (actor_id);
create index if not exists evidence_uploaded_by_idx on public.evidence (uploaded_by);
create index if not exists observations_reporter_id_idx on public.observations (reporter_id);
create index if not exists reports_observation_id_idx on public.reports (observation_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists risk_reviews_reviewer_id_idx on public.risk_reviews (reviewer_id);

-- Evaluate auth.uid() once per query through an InitPlan rather than per row.
drop policy if exists "authenticated users can read mines" on public.mines;
create policy "authenticated users can read mines" on public.mines for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "users can read own observations" on public.observations;
create policy "users can read own observations" on public.observations for select to authenticated
  using (reporter_id = (select auth.uid()));
drop policy if exists "users can create own observations" on public.observations;
create policy "users can create own observations" on public.observations for insert to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists "users can read own reports" on public.reports;
create policy "users can read own reports" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "users can read own evidence metadata" on public.evidence;
create policy "users can read own evidence metadata" on public.evidence for select to authenticated using (
  exists (
    select 1 from public.observations o
    where o.id = evidence.observation_id and o.reporter_id = (select auth.uid())
  )
);
drop policy if exists "users can create own evidence metadata" on public.evidence;
create policy "users can create own evidence metadata" on public.evidence for insert to authenticated with check (
  uploaded_by = (select auth.uid()) and exists (
    select 1 from public.observations o
    where o.id = evidence.observation_id and o.reporter_id = (select auth.uid())
  )
);

drop policy if exists "users can read own risk reviews" on public.risk_reviews;
create policy "users can read own risk reviews" on public.risk_reviews for select to authenticated
  using (reviewer_id = (select auth.uid()));
drop policy if exists "users can create own risk reviews" on public.risk_reviews;
create policy "users can create own risk reviews" on public.risk_reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()));
drop policy if exists "users can update own risk reviews" on public.risk_reviews;
create policy "users can update own risk reviews" on public.risk_reviews for update to authenticated
  using (reviewer_id = (select auth.uid()))
  with check (reviewer_id = (select auth.uid()));

drop policy if exists "users can read own audit events" on public.audit_events;
create policy "users can read own audit events" on public.audit_events for select to authenticated
  using (actor_id = (select auth.uid()));

drop policy if exists "users can manage own contractors" on public.contractors;
create policy "users can manage own contractors" on public.contractors for all to authenticated
  using (reporter_id = (select auth.uid()))
  with check (reporter_id = (select auth.uid()));
drop policy if exists "users can manage own compliance checks" on public.compliance_checks;
create policy "users can manage own compliance checks" on public.compliance_checks for all to authenticated
  using (reporter_id = (select auth.uid()))
  with check (reporter_id = (select auth.uid()));

drop policy if exists "users can upload own evidence" on storage.objects;
create policy "users can upload own evidence" on storage.objects for insert to authenticated with check (
  bucket_id = 'minepulse-evidence'
  and (storage.foldername(name))[1] in (
    select id::text from public.observations where reporter_id = (select auth.uid())
  )
);
drop policy if exists "users can read own evidence files" on storage.objects;
create policy "users can read own evidence files" on storage.objects for select to authenticated using (
  bucket_id = 'minepulse-evidence'
  and (storage.foldername(name))[1] in (
    select id::text from public.observations where reporter_id = (select auth.uid())
  )
);
