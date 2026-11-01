-- ADMINISTRATIVE USE ONLY. Not executed by the application or during delivery.
-- First verify one Auth UUID, then in the SAME database session:
-- BEGIN; SELECT set_config('cozy.fixture_owner', '<verified UUID>', true);
-- Execute this DO block, inspect affected counts, then COMMIT (or ROLLBACK).
-- Never identify ownership by names, email, or a frontend-provided role.
do $cleanup$
declare u uuid := nullif(current_setting('cozy.fixture_owner',true),'')::uuid; m jsonb; marker uuid; aids uuid[]; tids uuid[]; rids uuid[];
begin
 if u is null then raise exception 'Set cozy.fixture_owner to the verified UUID inside a transaction'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select request_id,payload into strict marker,m from public.finance_requests where user_id=u and action='fixture.cozy-glass-v1.1' and payload->>'batch'='cozy-glass-v1.1-2026-11-01' for update;
 select array_agg(value::uuid) into aids from jsonb_array_elements_text(m->'accounts');
 select array_agg(value::uuid) into tids from jsonb_array_elements_text(m->'transactions');
 select array_agg(value::uuid) into rids from jsonb_array_elements_text(m->'rules');
 if exists(select 1 from public.finance_transactions where user_id=u and (account_id=any(aids) or destination_account_id=any(aids)) and not(id=any(tids)))
 or exists(select 1 from public.finance_recurring_rules where user_id=u and (account_id=any(aids) or destination_account_id=any(aids)) and not(id=any(rids)))
 or exists(select 1 from public.finance_recurring_occurrences where user_id=u and (rule_id=any(rids) or transaction_id=any(tids))) then
  raise exception 'New data references this fixture. Nothing removed. Review dependencies and obtain a scoped cleanup decision.';
 end if;
 delete from public.finance_recurring_rules where user_id=u and id=any(rids);
 delete from public.finance_transactions where user_id=u and id=any(tids);
 delete from public.finance_accounts where user_id=u and id=any(aids);
 -- Keep operation receipts as replay tombstones; they no longer affect balances.
 delete from public.finance_requests where user_id=u and request_id=marker;
 raise notice 'Only this fixture was removed. Original accounts, categories and other operations were preserved.';
end $cleanup$;
