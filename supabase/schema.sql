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

create table if not exists public.tenant_accounts (
  room_id text primary key,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
alter table public.tenant_accounts enable row level security;

drop policy if exists "public read bills" on public.bills;
drop policy if exists "public insert bills" on public.bills;
drop policy if exists "tenant read own profile" on public.tenant_profiles;
drop policy if exists "tenant insert own profile" on public.tenant_profiles;
drop policy if exists "owner read own profile" on public.owner_profiles;
drop policy if exists "tenant read own room bills" on public.bills;
drop policy if exists "owner read all bills" on public.bills;
drop policy if exists "owner insert bills" on public.bills;
drop policy if exists "owner delete bills" on public.bills;
drop policy if exists "owner read tenant accounts" on public.tenant_accounts;
drop policy if exists "owner delete tenant accounts" on public.tenant_accounts;

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

create policy "owner delete bills"
on public.bills
for delete
using (
  exists (
    select 1 from public.owner_profiles op where op.user_id = auth.uid()
  )
);

create policy "owner read tenant accounts"
on public.tenant_accounts
for select
using (
  exists (
    select 1 from public.owner_profiles op where op.user_id = auth.uid()
  )
);

create policy "owner delete tenant accounts"
on public.tenant_accounts
for delete
using (
  exists (
    select 1 from public.owner_profiles op where op.user_id = auth.uid()
  )
);

create or replace function public.tenant_register(
  p_room_id text,
  p_password_hash text,
  p_setup_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(coalesce(p_room_id, '')) = '' then
    raise exception 'เลขห้องไม่ถูกต้อง';
  end if;

  if trim(coalesce(p_password_hash, '')) = '' then
    raise exception 'รหัสผ่านไม่ถูกต้อง';
  end if;

  if p_setup_key not in ('somjai1234', 'setup-tenant-2026', 'tenant-setup-2026-9k2x') then
    raise exception 'รหัสยืนยันการลงทะเบียนไม่ถูกต้อง';
  end if;

  if exists (select 1 from public.tenant_accounts where room_id = p_room_id) then
    raise exception 'ห้องนี้มีบัญชีผู้เช่าแล้ว';
  end if;

  insert into public.tenant_accounts (room_id, password_hash)
  values (p_room_id, p_password_hash);
end;
$$;

create or replace function public.tenant_login(
  p_room_id text,
  p_password_hash text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_accounts ta
    where ta.room_id = p_room_id
      and ta.password_hash = p_password_hash
  );
$$;

create or replace function public.tenant_fetch_bills(
  p_room_id text,
  p_password_hash text
)
returns setof public.bills
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.tenant_accounts ta
    where ta.room_id = p_room_id
      and ta.password_hash = p_password_hash
  ) then
    return;
  end if;

  return query
  select b.*
  from public.bills b
  where b.room_id = p_room_id
  order by b.issued_at_iso desc;
end;
$$;

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
grant execute on function public.tenant_register(text, text, text) to anon, authenticated;
grant execute on function public.tenant_login(text, text) to anon, authenticated;
grant execute on function public.tenant_fetch_bills(text, text) to anon, authenticated;
