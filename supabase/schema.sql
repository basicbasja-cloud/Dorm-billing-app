create extension if not exists "pgcrypto";

create table if not exists public.tenant_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  room_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  mode text not null check (mode in ('prepaid', 'postpaid')),
  monthly_rent integer not null,
  electric_unit_price integer not null,
  meter_before integer not null,
  meter_after integer not null,
  electric_units integer not null,
  electric_amount integer not null,
  water_amount integer not null,
  total_amount integer not null,
  billing_month_label text not null,
  billing_month_key text not null,
  due_date_label text not null,
  issued_at_iso timestamptz not null,
  lines jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bills_room_id_created_at
  on public.bills(room_id, created_at desc);

alter table public.bills enable row level security;

alter table public.tenant_profiles enable row level security;
alter table public.owner_profiles enable row level security;

drop policy if exists "public read bills" on public.bills;
drop policy if exists "public insert bills" on public.bills;

create policy "tenant read own profile"
on public.tenant_profiles
for select
using (auth.uid() = user_id);

create policy "tenant insert own profile"
on public.tenant_profiles
for insert
with check (auth.uid() = user_id);

create policy "owner read own profile"
on public.owner_profiles
for select
using (auth.uid() = user_id);

create policy "tenant read own room bills"
on public.bills
for select
using (
  exists (
    select 1
    from public.tenant_profiles tp
    where tp.user_id = auth.uid() and tp.room_id = bills.room_id
  )
);

create policy "owner read all bills"
on public.bills
for select
using (
  exists (
    select 1 from public.owner_profiles op where op.user_id = auth.uid()
  )
);

create policy "owner insert bills"
on public.bills
for insert
with check (
  exists (
    select 1 from public.owner_profiles op where op.user_id = auth.uid()
  )
);

create or replace function public.keepalive()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'timestamp', now()
  );
$$;

grant execute on function public.keepalive() to anon, authenticated;
