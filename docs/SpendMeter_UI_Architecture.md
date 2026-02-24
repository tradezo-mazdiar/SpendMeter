# SpendMeter — UI Architecture (shadcn/ui) + Route Map (V1)

This document defines the App Router structure, layouts, component library, and page responsibilities.

Design requirements:
- Dark theme only (no toggle)
- No percentage UI anywhere
- Mobile-first
- Extremely fast “Add Expense” flow

---

## 1) Route Groups

```
app/
  (auth)/
    login/
      page.tsx
    signup/
      page.tsx

  (app)/
    layout.tsx
    home/
      page.tsx
    add/
      page.tsx
    transactions/
      page.tsx
    recurring/
      page.tsx
    insights/
      page.tsx
    settings/
      page.tsx  (optional minimal)

components/
  ui/                # shadcn/ui
  spendmeter/        # app-specific
lib/
  actions/
  supabase/
  dates/
  validators/
  format/
```

Navigation:
- Bottom nav in `(app)/layout.tsx`:
  - Home
  - Transactions
  - Recurring
  - Insights
- “Add” is a floating button that navigates to `/add`.

---

## 2) shadcn/ui Components to Use

Install:
- `button`, `card`, `input`, `select`, `tabs`, `badge`, `dialog`, `dropdown-menu`
- `separator`, `textarea`, `form`, `toast` (or sonner), `command` (optional for autocomplete)

---

## 3) Shared App Components

### 3.1 `SpendBar`
A clean bar without percent. Shows spent vs remaining.

Props:
```ts
type SpendBarProps = {
  limit: number;
  spent: number;
};
```
Rules:
- If spent <= limit:
  - bar fill proportional (visual only)
  - show:
    - Spent: AED X
    - Remaining: AED Y
- If spent > limit:
  - bar becomes red
  - Remaining shows negative

(Still no % text.)

---

### 3.2 `MonthSelector`
Props:
```ts
type MonthSelectorProps = {
  months: { id: string; label: string; is_active?: boolean }[];
  value: string; // month_id
  onChange: (monthId: string) => void;
};
```

---

### 3.3 `QuickInsightCards`
Props:
```ts
type QuickInsightCardsProps = {
  topCategory?: { name: string; total: number } | null;
  topMerchant?: { merchant: string; total: number } | null;
  recurringTotal: number;
  txCount: number;
};
```

---

### 3.4 `TransactionList`
Props:
```ts
type TransactionItem = {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  paymentMethod: string;
  createdAtISO: string;
  isRecurring: boolean;
};

type TransactionListProps = {
  items: TransactionItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};
```

---

### 3.5 `TransactionForm`
Used on `/add` and edit dialogs.

Props:
```ts
type TransactionFormProps = {
  mode: 'create' | 'edit';
  initial?: { ... };
  categories: { id: string; name: string }[];
  paymentMethods: { id: string; name: string }[];
  merchantSuggestions?: string[];
  onSubmit: (values: any) => Promise<void>;
};
```

Includes:
- amount
- category
- payment method
- merchant (autocomplete)
- note (optional)

---

### 3.6 `RecurringForm`
Props:
```ts
type RecurringFormProps = {
  mode: 'create' | 'edit';
  initial?: { ... };
  categories: { id: string; name: string }[];
  paymentMethods: { id: string; name: string }[];
  onSubmit: (values: any) => Promise<void>;
};
```

---

## 4) Pages

### 4.1 `/home`
Responsibilities:
- Run seed + active month load (if not in layout)
- Show new-month banner if detected
- Render spend bar + quick insight cards
- Month selector

### 4.2 `/add`
- Show transaction form
- After save: redirect to `/home` (or `/transactions`)

### 4.3 `/transactions`
- Search bar
- Filters (category/payment method)
- List transactions (newest first)
- Edit/delete via dialogs

### 4.4 `/recurring`
- List recurring templates
- Add/edit via dialog
- Toggle active
- Show due day clearly

### 4.5 `/insights`
- Category totals list
- Merchant totals list
- Payment totals list
- Highlights list

---

## 5) Dark Theme Policy
- Configure Tailwind/shadcn dark mode default.
- Remove light-mode toggle.
- Ensure all pages use dark-friendly card backgrounds and muted text.

---

## 6) Loading/Empty/Error States
- Empty month: show “No expenses yet this month.”
- Empty recurring: “No recurring items yet.”
- Loading skeleton cards
- Toast for errors
