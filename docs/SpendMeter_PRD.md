
# SpendMeter — Product Requirements Document (PRD)
Version: 1.0
Theme: Dark Mode Only
Deployment: Vercel
Backend: Supabase (Auth + Postgres)
Audience: Individual users (multi-user system, isolated accounts)

---

# 1. Product Vision

SpendMeter is a personal monthly spending control system designed for clarity and simplicity.

It allows users to:
- Set a monthly spending limit
- Track expenses quickly
- Automatically apply recurring expenses by due date
- View clean behavioral insights
- Maintain structured month-based history

The system intentionally avoids:
- Percentage tracking
- Complex budgeting rules
- Financial jargon
- Income tracking (V1)
- Bank integrations

---

# 2. Core Principles

1. One active month at a time
2. Manual month reset
3. No percentages anywhere
4. Recurring expenses auto-apply based on due date
5. Clean dark UI
6. Extremely fast expense entry
7. Multi-user with strict isolation

---

# 3. User Authentication

- Email + password (Supabase Auth)
- One profile per user
- All data scoped by user_id (auth.uid())

---

# 4. Core Features

## 4.1 Monthly System

Each month contains:
- Spending limit
- Transactions
- Recurring applications
- Insights

Rules:
- Only one active month
- User must manually start a new month
- Spending limit auto-copies from previous month (editable)
- Recurring will NOT apply until new month is started

If new calendar month is detected:
→ Show banner: “New month detected — Start {Month}?”

---

## 4.2 Transactions

Fields:
- Amount
- Category
- Merchant (autocomplete + free text)
- Payment Method
- Note (optional)
- Timestamp (auto)
- Recurring flag (if auto-generated)

Capabilities:
- Search
- Filter
- Edit
- Delete

Expenses only (no income in V1).

---

## 4.3 Recurring Manager

Recurring Template Fields:
- Name
- Amount
- Category
- Merchant
- Payment Method
- Due Day (1–31)
- Active toggle
- Last generated month

Rules:
- If due_day exceeds month length → apply on last day
- Only generate if today >= due_day
- Only generate once per month
- Auto-mark as normal transaction
- Lazy generation when month loads

---

## 4.4 Payment Methods

Fields:
- Name
- Type (credit / debit / cash)
- Optional card limit
- Apple Pay linked (boolean)

No utilization tracking in V1.

---

## 4.5 Insights

Displayed per month:

1. Category totals (descending)
2. Merchant totals (descending)
3. Payment method totals
4. Highlights:
   - Highest category
   - Highest merchant
   - Largest single expense
   - Total recurring this month
   - Transaction count

No charts required in V1.

---

# 5. UI Structure

## Screens

1. Home
2. Add Expense
3. Transactions
4. Recurring Manager
5. Insights

---

## Home

- Month dropdown
- Spending limit
- Spending bar (no %)
- Spent amount
- Remaining amount (can go negative)
- Quick insight cards
- Floating Add button

If overspent:
- Bar turns red
- Remaining displays negative

---

## Add Expense

- Large amount input
- Category dropdown
- Payment method dropdown
- Merchant (autocomplete)
- Save

Optimized for 3-second entry.

---

## Transactions

- Search bar
- Filters
- List view
- Recurring badge
- Edit/Delete

---

## Recurring Manager

- List of recurring templates
- Due day visible
- Toggle active
- Add/Edit/Delete

---

## Insights

Clean list sections:
- Category totals
- Merchant totals
- Payment totals
- Behavioral summary snippets

---

# 6. Non-Goals (V1)

- Bank sync
- CSV import/export
- Charts
- Multi-currency
- Shared accounts
- Income tracking
- Budget per category
- Notifications

---

# 7. Security

All tables enforce:
user_id = auth.uid()

No cross-user visibility.

---

# 8. Performance Requirements

- Fast expense entry (< 2s perceived)
- Lazy recurring generation
- Simple aggregate queries
- Optimized for mobile first

---

# 9. Future Expansion Possibilities

- Income tracking
- Charts
- Multi-currency
- Savings tracking
- Export
- AI insights
- Shared household view

---

END OF PRD
