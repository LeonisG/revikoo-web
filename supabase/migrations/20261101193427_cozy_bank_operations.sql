-- Only this entry point can write. Definer is necessary to protect the immutable
-- request/occurrence receipts from direct API updates. No caller-supplied owner.
create function public.finance_mutate(p_action text, p_payload jsonb, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); prior public.finance_requests%rowtype; result jsonb;
 entity uuid; source_id uuid; dest_id uuid; cat_id uuid; kind text; cents bigint;
 day date; month_start date; due date; today date := (now() at time zone 'Europe/Madrid')::date;
 rule public.finance_recurring_rules%rowtype; occurrence public.finance_recurring_occurrences%rowtype;
 label text; make_primary boolean;
begin
 if u is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or p_payload ? 'user_id' then
  raise exception 'Invalid request' using errcode='22023';
 end if;
 -- Serialize one user's writes, including first-account creation and retries.
 perform pg_advisory_xact_lock(hashtextextended(u::text,7913));
 select * into prior from public.finance_requests where user_id=u and request_id=p_request_id;
 if found then
  if prior.action<>p_action or prior.payload<>p_payload then raise exception 'Request already used with different data' using errcode='22023'; end if;
  return prior.result;
 end if;
 if p_action='bootstrap' then
  insert into public.finance_categories(user_id,name,slug,category_type,icon,color)
  select u,v.name,v.slug,v.kind,'leaf',v.color from (values
   ('Vivienda','vivienda','expense','#607452'),('Alimentación','alimentacion','expense','#899a69'),
   ('Restaurantes','restaurantes','expense','#b58b56'),('Transporte','transporte','expense','#5c827e'),
   ('Suscripciones','suscripciones','expense','#9a7c9b'),('Compras','compras','expense','#b7826c'),
   ('Salud','salud','expense','#759a89'),('Ocio','ocio','expense','#8a8fbc'),
   ('Educación','educacion','expense','#a7a05c'),('Otros','otros','expense','#8a8980'),
   ('Nómina','nomina','income','#4c795a'),('Ingreso extraordinario','extraordinario','income','#7d976d'),
   ('Reembolso','reembolso','income','#b79c59'),('Otros','otros','income','#7f9185')
  ) v(name,slug,kind,color) on conflict(user_id,category_type,slug) do nothing;
  result:=jsonb_build_object('ok',true);
 elsif p_action='account.save' then
  entity:=nullif(p_payload->>'id','')::uuid; label:=btrim(p_payload->>'name');
  if coalesce(p_payload->>'initial_balance_cents','') !~ '^-?[0-9]{1,18}$' then raise exception 'Invalid cents' using errcode='22023'; end if;
  cents:=(p_payload->>'initial_balance_cents')::bigint;
  make_primary:=coalesce((p_payload->>'is_primary')::boolean,false) or not exists(select 1 from public.finance_accounts where user_id=u and archived_at is null and is_primary);
  if entity is not null and not exists(select 1 from public.finance_accounts where id=entity and user_id=u) then raise exception 'Account unavailable' using errcode='42501'; end if;
  if make_primary then update public.finance_accounts set is_primary=false,updated_at=now() where user_id=u and is_primary; end if;
  if entity is null then
   insert into public.finance_accounts(user_id,name,account_type,initial_balance_cents,is_primary)
   values(u,label,p_payload->>'account_type',cents,make_primary) returning id into entity;
  else
   update public.finance_accounts set name=label,account_type=p_payload->>'account_type',initial_balance_cents=cents,is_primary=make_primary,updated_at=now() where id=entity and user_id=u;
  end if;
  result:=jsonb_build_object('id',entity);
 elsif p_action in ('transaction.save','rule.save') then
  entity:=nullif(p_payload->>'id','')::uuid; kind:=p_payload->>'transaction_type';
  if coalesce(p_payload->>'amount_cents','') !~ '^[0-9]{1,18}$' then raise exception 'Invalid cents' using errcode='22023'; end if;
  cents:=(p_payload->>'amount_cents')::bigint;
  source_id:=(p_payload->>'account_id')::uuid;dest_id:=nullif(p_payload->>'destination_account_id','')::uuid;cat_id:=nullif(p_payload->>'category_id','')::uuid;
  if not exists(select 1 from public.finance_accounts where id=source_id and user_id=u and archived_at is null)
   or (dest_id is not null and not exists(select 1 from public.finance_accounts where id=dest_id and user_id=u and archived_at is null))
   then raise exception 'Account unavailable' using errcode='42501'; end if;
  -- Composite foreign keys also enforce both owner and category kind.
  if p_action='transaction.save' then
   if coalesce(p_payload->>'occurred_on','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023'; end if;
   day:=(p_payload->>'occurred_on')::date;
   if day<'1900-01-01' or day>'2100-12-31' then raise exception 'Date out of range' using errcode='22023'; end if;
   if entity is null then
    insert into public.finance_transactions(user_id,transaction_type,amount_cents,account_id,destination_account_id,category_id,description,occurred_on,client_request_id)
    values(u,kind,cents,source_id,dest_id,cat_id,coalesce(p_payload->>'description',''),day,p_request_id) returning id into entity;
   else
    update public.finance_transactions set transaction_type=kind,amount_cents=cents,account_id=source_id,destination_account_id=dest_id,category_id=cat_id,description=coalesce(p_payload->>'description',''),occurred_on=day,updated_at=now() where id=entity and user_id=u;
    if not found then raise exception 'Movement unavailable' using errcode='42501'; end if;
   end if;
  else
   if coalesce(p_payload->>'start_date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023'; end if;
   day:=(p_payload->>'start_date')::date;
   if day<'1900-01-01' or day>'2100-12-31' then raise exception 'Date out of range' using errcode='22023'; end if;
   if entity is null then
    insert into public.finance_recurring_rules(user_id,name,transaction_type,amount_cents,account_id,destination_account_id,category_id,day_of_month,start_date)
    values(u,btrim(p_payload->>'name'),kind,cents,source_id,dest_id,cat_id,(p_payload->>'day_of_month')::smallint,day) returning id into entity;
   else
    update public.finance_recurring_rules set name=btrim(p_payload->>'name'),transaction_type=kind,amount_cents=cents,account_id=source_id,destination_account_id=dest_id,category_id=cat_id,day_of_month=(p_payload->>'day_of_month')::smallint,start_date=day,active=coalesce((p_payload->>'active')::boolean,true),updated_at=now() where id=entity and user_id=u;
    if not found then raise exception 'Rule unavailable' using errcode='42501'; end if;
   end if;
  end if;
  result:=jsonb_build_object('id',entity);
 elsif p_action='transaction.delete' then
  entity:=(p_payload->>'id')::uuid;
  -- Keep confirmed period tombstone; deleting a correction cannot re-post it.
  update public.finance_recurring_occurrences set transaction_id=null,updated_at=now() where user_id=u and transaction_id=entity;
  delete from public.finance_transactions where user_id=u and id=entity;
  if not found then raise exception 'Movement unavailable' using errcode='42501'; end if;
  result:=jsonb_build_object('id',entity,'deleted',true);
 elsif p_action='rule.toggle' then
  entity:=(p_payload->>'id')::uuid;
  update public.finance_recurring_rules set active=(p_payload->>'active')::boolean,updated_at=now() where id=entity and user_id=u;
  if not found then raise exception 'Rule unavailable' using errcode='42501'; end if;
  result:=jsonb_build_object('id',entity);
 elsif p_action='occurrence.decide' then
  select * into rule from public.finance_recurring_rules where user_id=u and id=(p_payload->>'rule_id')::uuid;
  if not found or not rule.active then raise exception 'Rule unavailable' using errcode='42501'; end if;
  if coalesce(p_payload->>'period','') !~ '^\d{4}-\d{2}-01$' then raise exception 'Invalid period' using errcode='22023'; end if;
  month_start:=(p_payload->>'period')::date;
  due:=month_start+least(rule.day_of_month,extract(day from month_start+interval '1 month - 1 day')::int)-1;
  if due<rule.start_date or due>today then raise exception 'Occurrence is not due' using errcode='22023'; end if;
  select * into occurrence from public.finance_recurring_occurrences where user_id=u and rule_id=rule.id and period=month_start;
  if found and occurrence.decision in ('confirmed','skipped') then
   result:=jsonb_build_object('id',occurrence.id,'transaction_id',occurrence.transaction_id,'decision',occurrence.decision,'already_decided',true);
  else
   kind:=p_payload->>'decision'; entity:=null; day:=null;
   if kind='confirmed' then
    if coalesce(p_payload->>'amount_cents','') !~ '^[0-9]{1,18}$' then raise exception 'Invalid cents' using errcode='22023'; end if;
    cents:=(p_payload->>'amount_cents')::bigint;
    if not exists(select 1 from public.finance_accounts where user_id=u and id=rule.account_id and archived_at is null)
      or (rule.destination_account_id is not null and not exists(select 1 from public.finance_accounts where user_id=u and id=rule.destination_account_id and archived_at is null)) then raise exception 'Account unavailable' using errcode='42501'; end if;
    insert into public.finance_transactions(user_id,transaction_type,amount_cents,account_id,destination_account_id,category_id,description,occurred_on,client_request_id)
    values(u,rule.transaction_type,cents,rule.account_id,rule.destination_account_id,rule.category_id,rule.name,due,p_request_id) returning id into entity;
   elsif kind='postponed' then
    if coalesce(p_payload->>'postponed_until','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023'; end if;
    day:=(p_payload->>'postponed_until')::date;
    if day<=today or day>today+366 then raise exception 'Invalid postponement' using errcode='22023'; end if;
   elsif kind<>'skipped' or kind is null then raise exception 'Invalid decision' using errcode='22023'; end if;
   insert into public.finance_recurring_occurrences(user_id,rule_id,period,decision,postponed_until,transaction_id)
   values(u,rule.id,month_start,kind,day,entity)
   on conflict(user_id,rule_id,period) do update set decision=excluded.decision,postponed_until=excluded.postponed_until,transaction_id=excluded.transaction_id,updated_at=now()
   returning id into occurrence.id;
   result:=jsonb_build_object('id',occurrence.id,'transaction_id',entity,'decision',kind);
  end if;
 else raise exception 'Unknown action' using errcode='22023'; end if;
 insert into public.finance_requests(user_id,request_id,action,payload,result) values(u,p_request_id,p_action,p_payload,result);
 return result;
end $$;
revoke all on function public.finance_mutate(text,jsonb,uuid) from public,anon;
grant execute on function public.finance_mutate(text,jsonb,uuid) to authenticated;

-- Aggregation stays in PostgreSQL. Cents cross the JSON boundary as strings.
create function public.finance_snapshot(p_month date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; first_day date:=date_trunc('month',p_month)::date;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_month is null or not isfinite(p_month) then raise exception 'Invalid month' using errcode='22023'; end if;
 select jsonb_build_object(
  'accounts',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('initial_balance_cents',a.initial_balance_cents::text,'balance_cents',
   (a.initial_balance_cents+coalesce((select sum(case when t.transaction_type='income' and t.account_id=a.id or t.transaction_type='transfer' and t.destination_account_id=a.id then t.amount_cents else -t.amount_cents end) from public.finance_transactions t where t.account_id=a.id or t.destination_account_id=a.id),0))::text) order by a.is_primary desc,a.created_at) from public.finance_accounts a),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.name) from public.finance_categories c),'[]'::jsonb),
  'rules',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('amount_cents',r.amount_cents::text) order by r.created_at) from public.finance_recurring_rules r),'[]'::jsonb),
  'occurrences',coalesce((select jsonb_agg(to_jsonb(o)) from public.finance_recurring_occurrences o),'[]'::jsonb),
  'income_cents',coalesce((select sum(amount_cents) from public.finance_transactions where occurred_on>=first_day and occurred_on<first_day+interval '1 month' and transaction_type='income'),0)::text,
  'expense_cents',coalesce((select sum(amount_cents) from public.finance_transactions where occurred_on>=first_day and occurred_on<first_day+interval '1 month' and transaction_type='expense'),0)::text,
  'expenses_by_category',coalesce((select jsonb_agg(to_jsonb(g)) from (select category_id,sum(amount_cents)::text amount_cents from public.finance_transactions where occurred_on>=first_day and occurred_on<first_day+interval '1 month' and transaction_type='expense' group by category_id) g),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('amount_cents',t.amount_cents::text) order by t.occurred_on desc,t.id desc) from (select * from public.finance_transactions order by occurred_on desc,id desc limit 5) t),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.finance_snapshot(date) from public,anon;
grant execute on function public.finance_snapshot(date) to authenticated;

create function public.finance_history(p_before_date date default null,p_before_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('amount_cents',t.amount_cents::text) order by t.occurred_on desc,t.id desc),'[]'::jsonb)
 from (select * from public.finance_transactions where p_before_date is null or (occurred_on,id)<(p_before_date,p_before_id) order by occurred_on desc,id desc limit 50) t;
$$;
revoke all on function public.finance_history(date,uuid) from public,anon;
grant execute on function public.finance_history(date,uuid) to authenticated;
