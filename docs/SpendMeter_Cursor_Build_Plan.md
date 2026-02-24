# SpendMeter — Cursor Build Plan (V1)

Goal: Build in stable phases so the app is always runnable.  
Strategy: UI with mock data → Supabase schema → auth → seed → month engine → recurring engine → CRUD → insights.

---

## Phase 0 — Repo Setup

1) Create Next.js app
```bash
pnpm create next-app spendmeter --ts --tailwind --eslint
cd spendmeter
```

2) Install deps
```bash
pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers lucide-react
```

3) shadcn/ui
```bash
npx shadcn@latest init
npx shadcn@latest add button card input select tabs badge dialog dropdown-menu separator textarea form toast
```

(Optional for autocomplete)
```bash
npx shadcn@latest add command
```

4) Add docs to `/docs`
- SpendMeter_PRD.md
- SpendMeter_Technical_Design.md
- SpendMeter_API_Contracts.md
- SpendMeter_UI_Architecture.md
- SpendMeter_Cursor_Build_Plan.md

---

## Phase 1 — App Skeleton (Mock Data)

1) Create routes per UI Architecture doc:
- `(auth)/login`, `(auth)/signup`
- `(app)/layout`, `/home`, `/add`, `/transactions`, `/recurring`, `/insights`

2) Build bottom nav in `(app)/layout`.

3) Build core components:
- SpendBar
- MonthSelector
- QuickInsightCards
- TransactionForm
- TransactionList
- RecurringForm

4) Wire pages with mock data.

Acceptance:
- All pages render
- Navigation works
- Dark theme looks correct

---

## Phase 2 — Supabase Project + Schema + RLS

1) Create Supabase project
2) Run SQL from SpendMeter_Technical_Design.md
3) Enable RLS + policies
4) Add env vars:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Acceptance:
- Tables exist
- RLS enabled

---

## Phase 3 — Auth

1) Implement email/password login + signup
2) Implement Supabase SSR session persistence
3) Create guards:
- redirect unauth users to /login
- redirect logged in users away from /login

Acceptance:
- Login works across refresh
- Protected routes require auth

---

## Phase 4 — Seed Data

Implement `ensureUserSeedData()`:
- Create profile row if missing
- Create default categories if missing
- Create Cash payment method if missing

Call it on `(app)/layout` load.

Acceptance:
- New user sees categories and Cash method automatically

---

## Phase 5 — Month Engine

1) `getActiveMonth()` (create if missing)
2) `listMonths()`
3) `detectNewMonthNeeded()` for banner
4) `startNewMonth()` (close + create, copy limit)
5) `updateActiveMonthLimit()`

Acceptance:
- Month dropdown works
- Banner appears when calendar month != active month label
- Start new month closes old and creates new active

---

## Phase 6 — Recurring Engine

1) CRUD recurring templates
2) Implement `ensureRecurringAppliedForMonth(month_id)`
   - Dubai date logic
   - due_day capped to month end
   - generate only when due_day <= today
   - idempotent via unique constraint

Call ensureRecurringApplied:
- after active month load (home/transactions/insights entry)

Acceptance:
- Recurring transaction appears only once per month after due date

---

## Phase 7 — Transactions CRUD

1) createTransaction
2) listTransactions with search + filters
3) updateTransaction
4) deleteTransaction (soft)
5) merchant suggestions endpoint/action

Acceptance:
- Add/edit/delete works
- Search + filters work
- Deleted entries do not show

---

## Phase 8 — Insights

1) getMonthOverview()
2) getInsights()
3) Build insights page lists
4) Add highlights strings

Acceptance:
- Correct totals and top items display
- No percent UI

---

## Phase 9 — Polish + Deploy

- Skeleton loaders
- Empty states
- Confirm dialogs
- Deploy to Vercel

---

## Suggested Cursor Prompts (Phased)

### Prompt 1 — UI Skeleton
“Follow SpendMeter_UI_Architecture.md and build the route groups and shadcn-based UI with mock data only. No Supabase yet.”

### Prompt 2 — Auth
“Implement Supabase email/password auth with SSR sessions. Protect (app) routes. Do not implement month/recurring yet.”

### Prompt 3 — Month Engine
“Implement Month actions and banner detection per SpendMeter_Technical_Design.md and SpendMeter_API_Contracts.md.”

### Prompt 4 — Recurring Engine
“Implement ensureRecurringAppliedForMonth() per Technical Design. Enforce uniqueness and due-day handling.”
