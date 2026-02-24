# SpendMeter — API Contracts (Server Actions) (V1)

This document defines the **server actions** used by SpendMeter (Next.js App Router).  
All actions return a consistent `ActionResult<T>` shape and enforce Supabase RLS (owner-only).

Conventions:
- All actions are **server-only**.
- All inputs validated with **Zod**.
- No client-provided `user_id` is ever accepted.
- All writes use server timestamps (`now()`).
- All reads/writes include `is_deleted=false` where relevant.
- All actions assume currency is locked to AED in V1.

---

## 0) Common Types

### Action Result

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

### Common Error Codes
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

---

## 1) Auth / Profile

### 1.1 `getSessionProfile()`

Purpose: Return current user's profile and basic settings.

Input: none

Output:
```ts
type ProfileDTO = {
  user_id: string;
  display_name: string | null;
  currency_code: 'AED';
};
```

Errors: `UNAUTHENTICATED`

---

### 1.2 `ensureUserSeedData()`

Purpose: Ensure the user has:
- a profile row (if missing)
- default categories
- a default “Cash” payment method

Input: none

Output:
```ts
type SeedDTO = {
  created_profile: boolean;
  created_default_categories: boolean;
  created_cash_method: boolean;
};
```

Rules:
- Safe to call often (idempotent).
- Called on app entry (e.g., `(app)/layout`).

Errors: `UNAUTHENTICATED`, `INTERNAL_ERROR`

---

## 2) Months

### 2.1 `getActiveMonth()`

Purpose: Return the active month for the user (create one if missing).

Input: none

Output:
```ts
type MonthDTO = {
  id: string;
  label: string; // "May 2026"
  spending_limit: number;
  is_active: true;
  started_at: string;
};
```

Rules:
- If no active month exists:
  - create one using current calendar month label
  - spending_limit defaults to 0 (or a configured default)
- This action does NOT auto-start new months.

Errors: `UNAUTHENTICATED`, `INTERNAL_ERROR`

---

### 2.2 `listMonths(input)`

Purpose: Show month history for dropdown selector.

Input:
```ts
type ListMonthsInput = { limit?: number }; // default 24
```

Output:
```ts
type ListMonthsDTO = { months: MonthDTO[] };
```

Rules:
- Sort newest first
- Include active + closed

Errors: `UNAUTHENTICATED`

---

### 2.3 `detectNewMonthNeeded()`

Purpose: Detect if calendar month != active month label.

Input: none

Output:
```ts
type NewMonthNeededDTO = {
  needed: boolean;
  suggested_label: string; // "June 2026"
  current_active_label: string; // "May 2026"
};
```

Rules:
- Used by Home page banner.
- Does not write anything.

Errors: `UNAUTHENTICATED`

---

### 2.4 `startNewMonth(input)`

Purpose: Close current active month and create a new active month.

Input:
```ts
type StartNewMonthInput = {
  label: string;            // suggested calendar label
  spending_limit: number;   // default copied from previous; editable
};
```

Output:
```ts
type StartNewMonthDTO = {
  closed_month_id: string;
  new_month: MonthDTO;
};
```

Rules:
- Close current active month:
  - `is_active=false`, `closed_at=now()`
- Create new active month (unique active enforced by DB):
  - `is_active=true`, `started_at=now()`
- Must be manual (only triggered from UI).

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `CONFLICT`

---

### 2.5 `updateActiveMonthLimit(input)`

Input:
```ts
type UpdateLimitInput = { spending_limit: number };
```

Output:
```ts
type UpdateLimitDTO = { month_id: string; spending_limit: number };
```

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

## 3) Payment Methods

### 3.1 `listPaymentMethods()`

Output:
```ts
type PaymentMethodDTO = {
  id: string;
  name: string;
  type: 'credit'|'debit'|'cash';
  card_limit: number | null;
  apple_pay_linked: boolean;
  is_active: boolean;
};
type ListPMDTO = { methods: PaymentMethodDTO[] };
```

Errors: `UNAUTHENTICATED`

---

### 3.2 `createPaymentMethod(input)`

Input:
```ts
type CreatePMInput = {
  name: string;
  type: 'credit'|'debit'|'cash';
  card_limit?: number | null;
  apple_pay_linked?: boolean;
};
```

Output: `{ id: string }`

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `CONFLICT`

---

### 3.3 `updatePaymentMethod(input)`

Input:
```ts
type UpdatePMInput = {
  id: string;
  name?: string;
  type?: 'credit'|'debit'|'cash';
  card_limit?: number | null;
  apple_pay_linked?: boolean;
  is_active?: boolean;
};
```

Output: `{ id: string }`

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`

---

## 4) Categories

### 4.1 `listCategories()`

Output:
```ts
type CategoryDTO = { id: string; name: string; is_default: boolean };
type ListCategoriesDTO = { categories: CategoryDTO[] };
```

Errors: `UNAUTHENTICATED`

---

### 4.2 `createCategory(input)`

Input:
```ts
type CreateCategoryInput = { name: string };
```

Output: `{ id: string }`

Rules:
- Defaults exist; user can add custom categories.
- No delete in V1 (optional: deactivate later).

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `CONFLICT`

---

## 5) Transactions

### 5.1 `createTransaction(input)`

Input:
```ts
type CreateTxInput = {
  month_id: string;            // active month
  amount: number;              // > 0
  category_id: string;
  merchant: string;            // required (autocomplete + free text)
  payment_method_id: string;
  note?: string | null;
};
```

Output: `{ id: string }`

Rules:
- Expense only, `amount > 0`.
- Server sets `created_at`.

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### 5.2 `updateTransaction(input)`

Input:
```ts
type UpdateTxInput = {
  id: string;
  amount?: number;
  category_id?: string;
  merchant?: string;
  payment_method_id?: string;
  note?: string | null;
};
```

Output: `{ id: string }`

Rules:
- Set `updated_at=now()` on change.
- Still `amount > 0`.

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### 5.3 `deleteTransaction(input)` (soft delete)

Input: `{ id: string }`

Output: `{ id: string }`

Rules:
- Set `is_deleted=true`, `deleted_at=now()`
- Exclude deleted from lists & insights

Errors: `UNAUTHENTICATED`, `NOT_FOUND`

---

### 5.4 `listTransactions(input)`

Input:
```ts
type ListTxInput = {
  month_id: string;
  query?: string; // search merchant/note/category name (implementation choice)
  category_id?: string;
  payment_method_id?: string;
  limit?: number; // default 100
  offset?: number;
};
```

Output:
```ts
type TxDTO = {
  id: string;
  amount: number;
  merchant: string;
  note: string | null;
  category: { id: string; name: string };
  payment_method: { id: string; name: string; type: 'credit'|'debit'|'cash' };
  is_recurring_instance: boolean;
  created_at: string;
  updated_at: string | null;
};
type ListTxDTO = { transactions: TxDTO[]; total: number };
```

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`

---

### 5.5 `listMerchantSuggestions(input)`

Purpose: Merchant autocomplete suggestions based on user history.

Input:
```ts
type MerchantSuggestInput = { q: string; limit?: number }; // default 8
```

Output:
```ts
type MerchantSuggestDTO = { suggestions: string[] };
```

Rules:
- Query distinct merchants (non-deleted) matching prefix/substring.
- Return most recent or most frequent (simple recency is fine for V1).

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`

---

## 6) Recurring Templates

### 6.1 `listRecurringTemplates()`

Output:
```ts
type RecurringDTO = {
  id: string;
  name: string;
  amount: number;
  due_day: number; // 1..31
  merchant: string;
  category: { id: string; name: string };
  payment_method: { id: string; name: string };
  is_active: boolean;
  last_generated_month_id: string | null;
};
type ListRecurringDTO = { templates: RecurringDTO[] };
```

Errors: `UNAUTHENTICATED`

---

### 6.2 `createRecurringTemplate(input)`

Input:
```ts
type CreateRecurringInput = {
  name: string;
  amount: number; // >0
  due_day: number; // 1..31
  category_id: string;
  merchant: string;
  payment_method_id: string;
  is_active?: boolean;
};
```

Output: `{ id: string }`

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`

---

### 6.3 `updateRecurringTemplate(input)`

Input:
```ts
type UpdateRecurringInput = {
  id: string;
  name?: string;
  amount?: number;
  due_day?: number;
  category_id?: string;
  merchant?: string;
  payment_method_id?: string;
  is_active?: boolean;
};
```

Output: `{ id: string }`

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### 6.4 `ensureRecurringAppliedForMonth(input)`

Purpose: Lazy-generate due recurring transactions for the active month.

Input:
```ts
type EnsureRecurringInput = { month_id: string };
```

Output:
```ts
type EnsureRecurringDTO = {
  created_count: number;
  created_transaction_ids: string[];
};
```

Rules:
- Determine “today” in Asia/Dubai.
- For each active template:
  - Compute effective due date within the month (cap at month end).
  - If today >= due date AND not generated for this month:
    - Insert transaction (recurring instance)
    - Update template.last_generated_month_id
- Must be idempotent.
- Prefer DB uniqueness constraint + upsert/ignore conflicts.

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

---

## 7) Insights

### 7.1 `getMonthOverview(input)`

Input: `{ month_id: string }`

Output:
```ts
type MonthOverviewDTO = {
  month: { id: string; label: string; spending_limit: number };
  spent_total: number;
  remaining: number; // can be negative
  top_category: { name: string; total: number } | null;
  top_merchant: { merchant: string; total: number } | null;
  recurring_total: number;
  transaction_count: number;
};
```

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### 7.2 `getInsights(input)`

Input: `{ month_id: string }`

Output:
```ts
type InsightsDTO = {
  by_category: { name: string; total: number }[];
  by_merchant: { merchant: string; total: number }[];
  by_payment_method: { name: string; total: number }[];
  highlights: string[];
  largest_expense: { merchant: string; amount: number; created_at: string } | null;
};
```

Rules:
- All sums exclude deleted transactions.
- Sorted desc by total.
- Highlights are deterministic strings derived from aggregates.

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

## 8) Recommended Action Dependency Map

- App entry (layout): `ensureUserSeedData()` → `getSessionProfile()` → `getActiveMonth()` → `ensureRecurringAppliedForMonth(activeMonth.id)`
- Home: `detectNewMonthNeeded()` + `getMonthOverview(activeMonth.id)`
- Transactions: `listTransactions()` + `listMerchantSuggestions()`
- Recurring Manager: `listRecurringTemplates()` + CRUD
- Insights: `getInsights()`
