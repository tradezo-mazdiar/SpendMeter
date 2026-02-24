export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export type SeedDTO = {
  created_profile: boolean;
  created_default_categories: boolean;
  created_cash_method: boolean;
};

export type MonthDTO = {
  id: string;
  label: string;
  spending_limit: number;
  is_active: true;
  started_at: string;
};

export type ListMonthsDTO = { months: MonthDTO[] };

export type NewMonthNeededDTO = {
  needed: boolean;
  suggested_label: string;
  current_active_label: string;
};

export type StartNewMonthDTO = {
  closed_month_id: string;
  new_month: MonthDTO;
};

export type UpdateLimitDTO = { month_id: string; spending_limit: number };

export type RecurringDTO = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  merchant: string;
  category: { id: string; name: string };
  payment_method: { id: string; name: string };
  is_active: boolean;
  last_generated_month_id: string | null;
};

export type ListRecurringDTO = { templates: RecurringDTO[] };

export type EnsureRecurringDTO = {
  created_count: number;
  created_transaction_ids: string[];
};

export type TxDTO = {
  id: string;
  amount: number;
  merchant: string;
  note: string | null;
  category: { id: string; name: string };
  payment_method: { id: string; name: string; type: "credit" | "debit" | "cash" };
  is_recurring_instance: boolean;
  created_at: string;
  updated_at: string | null;
};

export type ListTxDTO = { transactions: TxDTO[]; total: number };

// Insights (Phase 8)
export type MonthOverviewDTO = {
  month: { id: string; label: string; spending_limit: number };
  spent_total: number;
  remaining: number;
  top_category: { name: string; total: number } | null;
  top_merchant: { merchant: string; total: number } | null;
  recurring_total: number;
  transaction_count: number;
};

export type InsightsDTO = {
  by_category: { name: string; total: number }[];
  by_merchant: { merchant: string; total: number }[];
  by_payment_method: { name: string; total: number }[];
  highlights: string[];
  largest_expense: { merchant: string; amount: number; created_at: string } | null;
};
