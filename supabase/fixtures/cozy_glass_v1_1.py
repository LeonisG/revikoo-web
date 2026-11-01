"""Administrative fixture builder. Emits SQL; never connects with public credentials.
Usage: python cozy_glass_v1_1.py --user-id <verified UUID> --as-of YYYY-MM-DD
Keep emitted SQL outside the public repository. Batch date is immutable on rerun.
"""
import argparse, calendar, datetime as dt, json, random, uuid
BATCH='cozy-glass-v1.1-2026-11-01'

def build(user_id, as_of):
    owner=str(uuid.UUID(user_id)); today=dt.date.fromisoformat(as_of); rng=random.Random(11012026)
    ident=lambda key:str(uuid.uuid5(uuid.UUID(owner), BATCH+':'+key))
    accounts=[dict(id=ident('account:'+k),name=n+' · Demo',account_type=k,initial_balance_cents=b) for k,n,b in [('checking','Cuenta principal',125000),('savings','Cuenta ahorro',320000),('cash','Efectivo',9000)]]
    ids={a['account_type']:a['id'] for a in accounts};tx=[]
    def add(date,kind,amount,cat,desc,acct='checking',dest=None):
        if date>today:return
        key='tx:'+str(date)+':'+desc
        tx.append(dict(id=ident(key),client_request_id=ident('receipt:'+key),transaction_type=kind,amount_cents=amount,category_slug=cat,description=desc+' · Demo',occurred_on=str(date),account_id=ids[acct],destination_account_id=ids.get(dest)))
    month_index=today.year*12+today.month-1
    for delta in range(-6,1):
        y,m=divmod(month_index+delta,12);m+=1
        date=lambda day:dt.date(y,m,min(day,calendar.monthrange(y,m)[1]))
        if delta<0:
            add(date(28),'income',195000+(2500 if m==7 else 0),'nomina','Nómina')
            add(date(1),'expense',68000,'vivienda','Alquiler')
        for day,amt,cat,desc in [(3,2990,'vivienda','Internet'),(6,1500,'suscripciones','Teléfono'),(8,3290,'salud','Gimnasio'),(12,1099,'suscripciones','Plataforma streaming')]:add(date(day),'expense',amt,cat,desc)
        for j,day in enumerate([1,9,17,25]):add(date(day),'expense',rng.randint(3800,9200),'alimentacion','Supermercado '+str(j+1))
        for j,day in enumerate([5,13,21]):add(date(day),'expense',rng.randint(1400,4400),'restaurantes','Restaurante '+str(j+1))
        for j,day in enumerate([1,7,16,24]):add(date(day),'expense',rng.randint(260,790),'restaurantes','Cafetería '+str(j+1),'cash')
        for j,day in enumerate([4,15,23]):add(date(day),'expense',rng.randint(500,1750),'transporte','Transporte público '+str(j+1))
        for day,cat,desc,lo,hi in [(10,'compras','Compra de ropa',2500,11500),(19,'salud','Farmacia',900,3900),(22,'ocio','Cine',1400,2800),(26,'educacion','Libros y formación',1800,6500),(18,'otros','Pequeños imprevistos',600,2400)]:add(date(day),'expense',rng.randint(lo,hi),cat,desc)
        add(date(29),'transfer',20000,None,'Aportación al ahorro',dest='savings')
        add(date(2),'transfer',4000,None,'Retirada de efectivo',dest='cash')
        if m in (6,9):add(date(14),'income',rng.randint(12000,35000),'extraordinario','Proyecto puntual')
        if m in (5,8,10):add(date(20),'income',rng.randint(1800,8500),'reembolso','Reembolso de compra')
        if m==7:add(date(11),'income',6500,'otros','Venta de segunda mano')
    rules=[dict(id=ident('rule:'+slug),name=name+' · Demo',transaction_type=kind,amount_cents=amount,category_slug=slug,account_id=ids['checking'],day_of_month=day,start_date=today.replace(day=1).isoformat()) for name,slug,kind,amount,day in [('Nómina','nomina','income',195000,28),('Alquiler','vivienda','expense',68000,1),('Suscripción','suscripciones','expense',1099,12),('Teléfono','suscripciones','expense',1500,6),('Gimnasio','salud','expense',3290,8)]]
    # Subscription and telephone share a category, never a fixture identifier.
    for r in rules:r['id']=ident('rule:'+r['name'])
    marker=ident('manifest')
    manifest=dict(batch=BATCH,as_of=as_of,seed=11012026,accounts=[a['id'] for a in accounts],transactions=[t['id'] for t in tx],rules=[r['id'] for r in rules],created_categories=[])
    literal=lambda value:"'"+json.dumps(value,ensure_ascii=False,separators=(',',':')).replace("'","''")+"'::jsonb"
    sql=f"""do $fixture$
declare u constant uuid := '{owner}'; marker constant uuid := '{marker}'; a jsonb; t jsonb; r jsonb; c uuid;
begin
 if (select count(*) from auth.users where id=u)<>1 then raise exception 'Expected exactly one existing Auth user'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if exists(select 1 from public.finance_requests where user_id=u and request_id=marker) then return; end if;
 if exists(select 1 from public.finance_requests where user_id=u and action='fixture.cozy-glass-v1.1') then raise exception 'Another fixture batch exists'; end if;
 for a in select value from jsonb_array_elements({literal(accounts)}) loop
  insert into public.finance_accounts(id,user_id,name,account_type,initial_balance_cents,is_primary) values((a->>'id')::uuid,u,a->>'name',a->>'account_type',(a->>'initial_balance_cents')::bigint,false);
 end loop;
 for t in select value from jsonb_array_elements({literal(tx)}) loop
  c:=null;
  if t->>'transaction_type'<>'transfer' then
   select id into strict c from public.finance_categories where user_id=u and category_type=t->>'transaction_type' and slug=t->>'category_slug';
  end if;
  if (t->>'occurred_on')::date>'{as_of}'::date then raise exception 'Future fixture transaction'; end if;
  insert into public.finance_transactions(id,user_id,transaction_type,amount_cents,account_id,destination_account_id,category_id,description,occurred_on,client_request_id)
  values((t->>'id')::uuid,u,t->>'transaction_type',(t->>'amount_cents')::bigint,(t->>'account_id')::uuid,(t->>'destination_account_id')::uuid,c,t->>'description',(t->>'occurred_on')::date,(t->>'client_request_id')::uuid);
 end loop;
 for r in select value from jsonb_array_elements({literal(rules)}) loop
  select id into strict c from public.finance_categories where user_id=u and category_type=r->>'transaction_type' and slug=r->>'category_slug';
  insert into public.finance_recurring_rules(id,user_id,name,transaction_type,amount_cents,account_id,category_id,day_of_month,start_date)
  values((r->>'id')::uuid,u,r->>'name',r->>'transaction_type',(r->>'amount_cents')::bigint,(r->>'account_id')::uuid,c,(r->>'day_of_month')::smallint,(r->>'start_date')::date);
 end loop;
 insert into public.finance_requests(user_id,request_id,action,payload,result) values(u,marker,'fixture.cozy-glass-v1.1',{literal(manifest)},jsonb_build_object('accounts',3,'transactions',{len(tx)},'rules',5));
end $fixture$;
select result from public.finance_requests where user_id='{owner}' and request_id='{marker}';"""
    return dict(sql=sql,counts=dict(accounts=3,transactions=len(tx),rules=5),manifest=manifest)
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--user-id',required=True);ap.add_argument('--as-of',required=True);ap.add_argument('--json',action='store_true');args=ap.parse_args();result=build(args.user_id,args.as_of);print(json.dumps(result,ensure_ascii=False) if args.json else result['sql'])
