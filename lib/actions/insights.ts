"use server";

import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/actions/transactions";
import type {
  ActionResult,
  MonthOverviewDTO,
  InsightsDTO,
  TxDTO,
} from "@/lib/actions/types";

function formatAED(n: number): string {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function getMonthOverview(input: {
  month_id: string;
}): Promise<ActionResult<MonthOverviewDTO>> {
  const monthId = input?.month_id?.trim();
  if (!monthId) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "month_id is required" },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: authError?.message ?? "Not authenticated",
      },
    };
  }

  const { data: monthRow, error: monthError } = await supabase
    .from("months")
    .select("id, label, spending_limit")
    .eq("id", monthId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (monthError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: monthError.message,
        details: monthError,
      },
    };
  }
  if (!monthRow) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Month not found" },
    };
  }

  const txRes = await listTransactions({ month_id: monthId, limit: 5000 });
  if (!txRes.ok) return txRes;
  const transactions = txRes.data.transactions;

  const spent_total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const spending_limit = Number(monthRow.spending_limit);
  const remaining = spending_limit - spent_total;
  const recurring_total = transactions
    .filter((t) => t.is_recurring_instance)
    .reduce((s, t) => s + Number(t.amount), 0);

  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  for (const t of transactions) {
    const cat = t.category.name;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(t.amount));
    const m = t.merchant;
    byMerchant.set(m, (byMerchant.get(m) ?? 0) + Number(t.amount));
  }

  const topCategory =
    byCategory.size === 0
      ? null
      : (() => {
          let best: { name: string; total: number } | null = null;
          Array.from(byCategory.entries()).forEach(([name, total]) => {
            if (!best || total > best.total) best = { name, total };
          });
          return best;
        })();

  const topMerchant =
    byMerchant.size === 0
      ? null
      : (() => {
          let best: { merchant: string; total: number } | null = null;
          Array.from(byMerchant.entries()).forEach(([merchant, total]) => {
            if (!best || total > best.total) best = { merchant, total };
          });
          return best;
        })();

  return {
    ok: true,
    data: {
      month: {
        id: monthRow.id,
        label: monthRow.label,
        spending_limit: spending_limit,
      },
      spent_total,
      remaining,
      top_category: topCategory,
      top_merchant: topMerchant,
      recurring_total,
      transaction_count: transactions.length,
    },
  };
}

function aggregateForInsights(transactions: TxDTO[]): {
  by_category: { name: string; total: number }[];
  by_merchant: { merchant: string; total: number }[];
  by_payment_method: { name: string; total: number }[];
  largest_expense: { merchant: string; amount: number; created_at: string } | null;
} {
  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  const byPaymentMethod = new Map<string, number>();
  let largest: TxDTO | null = null;

  for (const t of transactions) {
    const amt = Number(t.amount);
    byCategory.set(t.category.name, (byCategory.get(t.category.name) ?? 0) + amt);
    byMerchant.set(t.merchant, (byMerchant.get(t.merchant) ?? 0) + amt);
    byPaymentMethod.set(
      t.payment_method.name,
      (byPaymentMethod.get(t.payment_method.name) ?? 0) + amt
    );
    if (!largest || amt > Number(largest.amount)) largest = t;
  }

  const sortByTotal = <T>(entries: [string, number][], toItem: (name: string, total: number) => T): T[] =>
    Array.from(entries)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => toItem(name, total));

  return {
    by_category: sortByTotal(Array.from(byCategory.entries()), (name, total) => ({ name, total })),
    by_merchant: sortByTotal(Array.from(byMerchant.entries()), (merchant, total) => ({ merchant, total })),
    by_payment_method: sortByTotal(Array.from(byPaymentMethod.entries()), (name, total) => ({ name, total })),
    largest_expense: largest
      ? {
          merchant: largest.merchant,
          amount: Number(largest.amount),
          created_at: largest.created_at,
        }
      : null,
  };
}

function buildHighlights(
  transactions: TxDTO[],
  agg: ReturnType<typeof aggregateForInsights>
): string[] {
  const lines: string[] = [];
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const count = transactions.length;

  if (count > 0) {
    lines.push(`Spent ${formatAED(total)} in ${count} transaction${count === 1 ? "" : "s"} this month.`);
  }
  const topCat = agg.by_category[0];
  if (topCat) {
    lines.push(`Top category: ${topCat.name} (${formatAED(topCat.total)}).`);
  }
  const topM = agg.by_merchant[0];
  if (topM) {
    lines.push(`Top merchant: ${topM.merchant} (${formatAED(topM.total)}).`);
  }
  if (agg.largest_expense) {
    lines.push(
      `Largest single expense: ${agg.largest_expense.merchant} — ${formatAED(agg.largest_expense.amount)}.`
    );
  }
  const recurringTotal = transactions
    .filter((t) => t.is_recurring_instance)
    .reduce((s, t) => s + Number(t.amount), 0);
  if (recurringTotal > 0) {
    lines.push(`Recurring total this month: ${formatAED(recurringTotal)}.`);
  }
  return lines;
}

export async function getInsights(input: {
  month_id: string;
}): Promise<ActionResult<InsightsDTO>> {
  const monthId = input?.month_id?.trim();
  if (!monthId) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "month_id is required" },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: authError?.message ?? "Not authenticated",
      },
    };
  }

  const { data: monthRow, error: monthError } = await supabase
    .from("months")
    .select("id")
    .eq("id", monthId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (monthError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: monthError.message,
        details: monthError,
      },
    };
  }
  if (!monthRow) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Month not found" },
    };
  }

  const txRes = await listTransactions({ month_id: monthId, limit: 5000 });
  if (!txRes.ok) return txRes;
  const transactions = txRes.data.transactions;

  const agg = aggregateForInsights(transactions);
  const highlights = buildHighlights(transactions, agg);

  return {
    ok: true,
    data: {
      by_category: agg.by_category,
      by_merchant: agg.by_merchant,
      by_payment_method: agg.by_payment_method,
      highlights,
      largest_expense: agg.largest_expense,
    },
  };
}
