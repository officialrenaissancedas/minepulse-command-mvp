-- Remove the single temporary QA observation created during production deployment verification.
-- This is a safe no-op on other environments and does not reference generated IDs.
do $$
declare
  qa_observation_id uuid;
begin
  select id into qa_observation_id
  from public.observations
  where title = 'MINEPULSE QA CHECK 5Y2AMYdJK72N2EB9UJOQfh 2026-09-29'
  limit 1;

  if qa_observation_id is not null then
    delete from public.reports where observation_id = qa_observation_id;
    delete from public.audit_events where entity_id = qa_observation_id;
    delete from public.observations where id = qa_observation_id;
  end if;
end;
$$;
