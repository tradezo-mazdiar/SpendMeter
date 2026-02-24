-- SpendMeter Phase 2 — Schema + RLS
-- Run this once in Supabase Dashboard: SQL Editor → New query → paste → Run
-- Source: docs/SpendMeter_Technical_Design.md

-- ========== EXTENSIONS ==========
create extension if not exists pgcrypto;

-- ========== ENUMS ==========
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_method_type') then
    create type payment_method_type as enum ('credit', 'debit', 'cash');
  end if;
end $$;

-- ========== TABLES ==========

-- 1) Profiles
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  currency_code text not null default 'AED',
  created_at timestamptz not null default now()
);

-- 2) Months
create table if not exists months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  spending_limit numeric(12,2) not null default 0,
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  closed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_months_user on months(user_id);
create index if not exists idx_months_user_active on months(user_id, is_active);

create unique index if not exists uq_months_one_active_per_user
on months(user_id)
where is_active = true;

-- 3) Payment methods
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type payment_method_type not null,
  card_limit numeric(12,2) null,
  apple_pay_linked boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_payment_methods_user on payment_methods(user_id);

-- 4) Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_categories_user on categories(user_id);

-- 5) Recurring templates
create table if not exists recurring_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  category_id uuid not null references categories(id) on delete restrict,
  merchant text not null,
  payment_method_id uuid not null references payment_methods(id) on delete restrict,
  due_day int not null check (due_day >= 1 and due_day <= 31),
  is_active boolean not null default true,
  last_generated_month_id uuid null references months(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_user on recurring_templates(user_id);

-- 6) Transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null references months(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid not null references categories(id) on delete restrict,
  merchant text not null,
  note text null,
  payment_method_id uuid not null references payment_methods(id) on delete restrict,
  is_recurring_instance boolean not null default false,
  recurring_template_id uuid null references recurring_templates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  is_deleted boolean not null default false,
  deleted_at timestamptz null
);

create index if not exists idx_tx_user_month_created on transactions(user_id, month_id, created_at);
create index if not exists idx_tx_user_created on transactions(user_id, created_at);
create index if not exists idx_tx_user_category on transactions(user_id, category_id);
create index if not exists idx_tx_user_payment on transactions(user_id, payment_method_id);

create unique index if not exists uq_tx_recurring_once_per_month
on transactions(user_id, recurring_template_id, month_id)
where is_recurring_instance = true and recurring_template_id is not null;

-- ========== ROW LEVEL SECURITY ==========

alter table profiles enable row level security;
alter table months enable row level security;
alter table payment_methods enable row level security;
alter table categories enable row level security;
alter table recurring_templates enable row level security;
alter table transactions enable row level security;

-- ========== POLICIES (owner-only) ==========

-- Profiles
create policy "profiles owner read" on profiles for select using (user_id = auth.uid());
create policy "profiles owner insert" on profiles for insert with check (user_id = auth.uid());
create policy "profiles owner update" on profiles for update using (user_id = auth.uid());

-- Months
create policy "months owner read" on months for select using (user_id = auth.uid());
create policy "months owner write" on months for insert with check (user_id = auth.uid());
create policy "months owner update" on months for update using (user_id = auth.uid());

-- Payment methods
create policy "pm owner read" on payment_methods for select using (user_id = auth.uid());
create policy "pm owner write" on payment_methods for insert with check (user_id = auth.uid());
create policy "pm owner update" on payment_methods for update using (user_id = auth.uid());

-- Categories
create policy "cat owner read" on categories for select using (user_id = auth.uid());
create policy "cat owner write" on categories for insert with check (user_id = auth.uid());
create policy "cat owner update" on categories for update using (user_id = auth.uid());

-- Recurring templates
create policy "rt owner read" on recurring_templates for select using (user_id = auth.uid());
create policy "rt owner write" on recurring_templates for insert with check (user_id = auth.uid());
create policy "rt owner update" on recurring_templates for update using (user_id = auth.uid());
create policy "rt owner delete" on recurring_templates for delete using (user_id = auth.uid());

-- Transactions
create policy "tx owner read" on transactions for select using (user_id = auth.uid());
create policy "tx owner write" on transactions for insert with check (user_id = auth.uid());
create policy "tx owner update" on transactions for update using (user_id = auth.uid());
