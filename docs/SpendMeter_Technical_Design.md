# SpendMeter — Technical Design (V1)

Stack:
- Next.js 14 (App Router) + TypeScript
- Tailwind + shadcn/ui (dark mode only)
- Supabase: Auth + Postgres + RLS
- Hosting: Vercel
- No cron jobs: use **lazy generation** patterns (recurring + month detection)

Primary goals:
- Ultra-simple daily use
- Multi-user isolation (each user sees only their data)
- Clean month containers with manual “Start New Month”
- Date-based recurring auto-apply (due day), generated lazily on app/month load
- Insights via aggregation queries (no AI required)

---

## 1) Architecture Overview

### Frontend (Next.js)
- App Router with route groups:
  - `(auth)` for login/signup
  - `(app)` for authenticated app screens

### Backend (Supabase)
- Auth: email + password
- DB: Postgres
- Security: strict RLS everywhere using `user_id = auth.uid()`

### Data access
- Next.js **Server Actions** for all reads/writes.
- Client components only for forms and interactions.
- Shared validators via Zod.

---

## 2) Core Domain Model

### Entities
- Profile (user preferences)
- Month (spending limit + container)
- Transaction (expense record)
- Recurring Template (monthly repeat rules)
- Payment Method (cash/cards)

### Key invariants
- Exactly **one active month** per user at a time.
- Transactions belong to exactly one month.
- Recurring templates can create **at most one** transaction per template per month.
- No percentages shown in UI (policy).
- Currency locked to AED (V1).

---

## 3) Month Lifecycle

### 3.1 Active Month
- The app always operates within the user’s **active month**.
- User manually triggers “Start New Month”:
  - Closes current month (`closed_at=now()`, `is_active=false`)
  - Creates new month (`is_active=true`, `started_at=now()`)
  - Copies previous month’s limit (editable)

### 3.2 “New month detected” banner
When opening Home:
- Compute current calendar month (e.g. June 2026)
- If active month label != calendar month label:
  - Show banner: “New month detected — Start June?”
  - User must confirm start before recurring can generate for the new month (as per requirements).

No automatic rollover.

---

## 4) Recurring Engine (Lazy Generation)

### 4.1 Template definition
A recurring template repeats **monthly** and has:
- due_day (1–31)
- amount, category, merchant, payment_method
- active toggle

### 4.2 Due-day handling for short months
If `due_day` > days in month:
- effective due date becomes **last day of the month**.

### 4.3 Generation timing
When the app loads an active month (Home, Transactions, Insights, Recurring screens):
1) Load active month.
2) Run `ensureRecurringAppliedForMonth(activeMonthId)`.
3) For each active template:
   - Determine effective due date for that month.
   - If today >= effective due date (Dubai time) AND template has not generated for this month:
     - Insert a transaction with:
       - `is_recurring_instance=true`
       - `recurring_template_id=template.id`
       - `month_id=activeMonth.id`
     - Record generation by setting `last_generated_month_id = activeMonth.id`

No cron is required because the check runs on demand.

### 4.4 Safety checks
To prevent duplicates:
- Use a unique constraint: `(user_id, recurring_template_id, month_id)` on transactions for recurring instances OR rely on last_generated_month_id plus insert conflict handling.

Recommended: **unique constraint** (stronger correctness).

---

## 5) Authentication & Authorization

### 5.1 Auth
- Supabase email/password login.
- A profile row exists per user.

### 5.2 Authorization
- All tables include `user_id`.
- RLS ensures rows can only be read/written by their owner:
  - `user_id = auth.uid()`

---

## 6) Database Schema (SQL)

Run in Supabase SQL editor.

```sql
-- Extensions
create extension if not exists pgcrypto;

-- Enum for payment method type
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_method_type') then
    create type payment_method_type as enum ('credit', 'debit', 'cash');
  end if;
end $$;

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
  label text not null, -- e.g. "May 2026"
  spending_limit numeric(12,2) not null default 0,
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  closed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_months_user on months(user_id);
create index if not exists idx_months_user_active on months(user_id, is_active);

-- Enforce one active month per user (partial unique index)
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

-- 4) Categories (defaults + custom)
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
  amount numeric(12,2) not null check (amount > 0), -- expenses only
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

-- Prevent duplicates for recurring-generated instances (strong correctness)
create unique index if not exists uq_tx_recurring_once_per_month
on transactions(user_id, recurring_template_id, month_id)
where is_recurring_instance = true and recurring_template_id is not null;

```

### Seed defaults (optional, per user)
Defaults are user-specific. Insert at first login:
- Categories: Food, Fuel, Groceries, Bills, Shopping, Entertainment, Other
- Payment method: Cash (type=cash)

---

## 7) Row Level Security (RLS)

Enable RLS:

```sql
alter table profiles enable row level security;
alter table months enable row level security;
alter table payment_methods enable row level security;
alter table categories enable row level security;
alter table recurring_templates enable row level security;
alter table transactions enable row level security;
```

Policies (pattern: owner-only):

```sql
-- Profiles
create policy "profiles owner read"
on profiles for select
using (user_id = auth.uid());

create policy "profiles owner insert"
on profiles for insert
with check (user_id = auth.uid());

create policy "profiles owner update"
on profiles for update
using (user_id = auth.uid());

-- Months
create policy "months owner read"
on months for select
using (user_id = auth.uid());

create policy "months owner write"
on months for insert
with check (user_id = auth.uid());

create policy "months owner update"
on months for update
using (user_id = auth.uid());

-- Payment methods
create policy "pm owner read"
on payment_methods for select
using (user_id = auth.uid());

create policy "pm owner write"
on payment_methods for insert
with check (user_id = auth.uid());

create policy "pm owner update"
on payment_methods for update
using (user_id = auth.uid());

-- Categories
create policy "cat owner read"
on categories for select
using (user_id = auth.uid());

create policy "cat owner write"
on categories for insert
with check (user_id = auth.uid());

create policy "cat owner update"
on categories for update
using (user_id = auth.uid());

-- Recurring templates
create policy "rt owner read"
on recurring_templates for select
using (user_id = auth.uid());

create policy "rt owner write"
on recurring_templates for insert
with check (user_id = auth.uid());

create policy "rt owner update"
on recurring_templates for update
using (user_id = auth.uid());

-- Transactions
create policy "tx owner read"
on transactions for select
using (user_id = auth.uid());

create policy "tx owner write"
on transactions for insert
with check (user_id = auth.uid());

create policy "tx owner update"
on transactions for update
using (user_id = auth.uid());

```

---

## 8) Server Actions (Contracts Summary)

Recommended actions (we’ll formalize in API Contracts doc next):
- Auth/profile:
  - `getSessionProfile()`
  - `ensureUserSeedData()` (categories + cash method)
- Month:
  - `getActiveMonth()`
  - `startNewMonth({ label, spending_limit })`
  - `updateMonthLimit(monthId, limit)`
- Recurring:
  - `listRecurringTemplates()`
  - `createRecurringTemplate()` / `updateRecurringTemplate()` / `toggleRecurringTemplate()`
  - `ensureRecurringAppliedForMonth(monthId)`
- Transactions:
  - `createTransaction()` / `updateTransaction()` / `deleteTransaction()` (soft)
  - `listTransactions({ monthId, query, filters })`
- Insights:
  - `getInsights(monthId)` (aggregates)

All actions must:
- Verify session (UNAUTHENTICATED)
- Scope by `user_id = auth.uid()`
- Never accept user_id from client

---

## 9) Insights Computation

All insights are computed via aggregates on `transactions` filtered by month and `is_deleted=false`.

Examples:
- Total spent:
  - `sum(amount)`
- Category totals:
  - `group by category_id`
- Merchant totals:
  - `group by merchant` (normalized string)
- Payment method totals:
  - `group by payment_method_id`
- Largest transaction:
  - `order by amount desc limit 1`
- Transaction count:
  - `count(*)`
- Total recurring this month:
  - `sum(amount) where is_recurring_instance=true`

Normalization tip for merchant:
- Store as user-entered, but also keep a normalized version (optional V1.1).
- For V1, keep simple + autocomplete list from existing merchants.

---

## 10) Timezone Handling

- Currency: AED only.
- Timezone for due-day comparisons: **Asia/Dubai**.
- Store all timestamps as `timestamptz` in UTC.
- Compute “today” and “days in month” in Dubai time for recurring logic.

---

## 11) UI Notes (Dark Only)

- Use shadcn/ui with dark theme configuration.
- No light mode toggle.
- The spending bar shows:
  - Spent amount
  - Remaining amount (can go negative)
  - No percentages

---

## 12) Deployment

- Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Use Supabase SSR helpers for session cookies.
- RLS ensures DB safety even if client calls are abused.

---

## 13) Open Items for V1.1 (Optional)

- Merchant normalization table
- Minimal chart on insights
- Push notifications for due dates (would require background job/cron)
- CSV export
- Multi-currency
