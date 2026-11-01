-- Cozy Bank: exact cents, ownership-preserving references and durable request receipts.
create table public.finance_accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 80),
 account_type text not null check (account_type in ('checking','savings','cash','other')),
 currency text not null default 'EUR' check (currency='EUR'), initial_balance_cents bigint not null default 0,
 is_primary boolean not null default false, archived_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create unique index finance_accounts_primary on public.finance_accounts(user_id) where is_primary and archived_at is null;
create table public.finance_categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, slug text not null, category_type text not null check(category_type in ('expense','income')),
 icon text not null default 'leaf', color text not null default '#70835a', created_at timestamptz not null default now(),
 unique(user_id,category_type,slug), unique(user_id,id,category_type)
);
create table public.finance_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 transaction_type text not null check(transaction_type in ('expense','income','transfer')),
 amount_cents bigint not null check(amount_cents>0), account_id uuid not null, destination_account_id uuid,
 category_id uuid, category_type text generated always as (case when transaction_type='transfer' then null else transaction_type end) stored,
 description text not null default '' check(length(description)<=240), occurred_on date not null,
 client_request_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id), unique(user_id,client_request_id),
 foreign key(user_id,account_id) references public.finance_accounts(user_id,id),
 foreign key(user_id,destination_account_id) references public.finance_accounts(user_id,id),
 foreign key(user_id,category_id,category_type) references public.finance_categories(user_id,id,category_type),
 check ((transaction_type='transfer' and destination_account_id is not null and destination_account_id<>account_id and category_id is null)
     or (transaction_type<>'transfer' and destination_account_id is null and category_id is not null))
);
create index finance_transactions_date on public.finance_transactions(user_id,occurred_on desc,id desc);
create index finance_transactions_source on public.finance_transactions(user_id,account_id);
create index finance_transactions_destination on public.finance_transactions(user_id,destination_account_id);
create index finance_transactions_category on public.finance_transactions(user_id,category_id,category_type);
create table public.finance_recurring_rules (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 80),
 transaction_type text not null check(transaction_type in ('expense','income','transfer')),
 amount_cents bigint not null check(amount_cents>0), account_id uuid not null, destination_account_id uuid, category_id uuid,
 category_type text generated always as (case when transaction_type='transfer' then null else transaction_type end) stored,
 frequency text not null default 'monthly' check(frequency='monthly'), day_of_month smallint not null check(day_of_month between 1 and 31),
 start_date date not null, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
 foreign key(user_id,account_id) references public.finance_accounts(user_id,id),
 foreign key(user_id,destination_account_id) references public.finance_accounts(user_id,id),
 foreign key(user_id,category_id,category_type) references public.finance_categories(user_id,id,category_type),
 check ((transaction_type='transfer' and destination_account_id is not null and destination_account_id<>account_id and category_id is null)
     or (transaction_type<>'transfer' and destination_account_id is null and category_id is not null))
);
create index finance_rules_source on public.finance_recurring_rules(user_id,account_id);
create index finance_rules_destination on public.finance_recurring_rules(user_id,destination_account_id);
create index finance_rules_category on public.finance_recurring_rules(user_id,category_id,category_type);
create table public.finance_recurring_occurrences (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 rule_id uuid not null, period date not null check(extract(day from period)=1),
 decision text not null check(decision in ('confirmed','skipped','postponed')), postponed_until date,
 transaction_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,rule_id,period),
 foreign key(user_id,rule_id) references public.finance_recurring_rules(user_id,id),
 foreign key(user_id,transaction_id) references public.finance_transactions(user_id,id),
 check ((decision='postponed' and postponed_until is not null) or (decision<>'postponed' and postponed_until is null))
);
create index finance_occurrences_transaction on public.finance_recurring_occurrences(user_id,transaction_id);
-- Receipts survive movement deletion: replay cannot recreate a deleted movement.
create table public.finance_requests (
 user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 action text not null, payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
-- RLS is defense in depth. Writes are only granted through the narrowly scoped RPC.
do $$ declare t text; begin
 foreach t in array array['finance_accounts','finance_categories','finance_transactions','finance_recurring_rules','finance_recurring_occurrences','finance_requests'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 end loop;
end $$;
