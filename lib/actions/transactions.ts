"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, TxDTO, ListTxDTO } from "./types";

function isValidYMD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  // Validate calendar date (avoids 2026-02-31 etc.)
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export async function createTransaction(input: {
  month_id: string;
  amount: number;
  category_id: string;
  merchant: string;
  payment_method_id: string;
  note?: string | null;
  spent_on?: string; // YYYY-MM-DD (Dubai calendar date)
}): Promise<ActionResult<{ id: string }>> {
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

  const amount = Number(input.amount);
  const merchant = (input.merchant ?? "").trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Amount must be positive" },
    };
  }
  if (!merchant) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Merchant is required" },
    };
  }
  if (!input.month_id || !input.category_id || !input.payment_method_id) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "month, category, and payment method required",
      },
    };
  }

  const spent_on = input.spent_on?.trim();
  if (spent_on && !isValidYMD(spent_on)) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "spent_on must be a valid date (YYYY-MM-DD)" },
    };
  }

  // Guardrail: prevent saving a date outside the given month_id.
  if (spent_on) {
    const { data: monthRow, error: monthErr } = await supabase
      .from("months")
      .select("id, started_at")
      .eq("id", input.month_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (monthErr) {
      return {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: monthErr.message, details: monthErr },
      };
    }
    if (!monthRow) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Month not found" } };
    }

    const startedAt = new Date(monthRow.started_at);
    const monthYear = startedAt.getUTCFullYear();
    const monthMonth = startedAt.getUTCMonth() + 1;
    const spentYear = Number(spent_on.slice(0, 4));
    const spentMonth = Number(spent_on.slice(5, 7));
    if (spentYear !== monthYear || spentMonth !== monthMonth) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Selected date is outside the current month",
        },
      };
    }
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    month_id: input.month_id,
    amount,
    category_id: input.category_id,
    merchant,
    payment_method_id: input.payment_method_id,
    note: input.note?.trim() || null,
    is_recurring_instance: false,
  };
  if (spent_on) insertPayload.spent_on = spent_on;

  const { data, error } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: {
        code: error.code === "23503" ? "NOT_FOUND" : "INTERNAL_ERROR",
        message: error.message,
        details: error,
      },
    };
  }

  return { ok: true, data: { id: data.id } };
}

export async function listTransactions(input: {
  month_id: string;
  query?: string;
  category_id?: string;
  payment_method_id?: string;
  limit?: number;
  offset?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
}): Promise<ActionResult<ListTxDTO>> {
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

  if (!input.month_id) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "month_id required" },
    };
  }

  const limit = Math.min(input.limit ?? 100, 500);
  const offset = input.offset ?? 0;

  let q = supabase
    .from("transactions")
    .select(
      "id, amount, merchant, note, category_id, payment_method_id, is_recurring_instance, spent_on, created_at, updated_at",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .eq("month_id", input.month_id)
    .eq("is_deleted", false)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.category_id) q = q.eq("category_id", input.category_id);
  if (input.payment_method_id)
    q = q.eq("payment_method_id", input.payment_method_id);
  if (input.date_from) q = q.gte("spent_on", input.date_from);
  if (input.date_to) q = q.lte("spent_on", input.date_to);
  if (input.query?.trim()) {
    const term = input.query.trim();
    const pattern = `%${term}%`;
    q = q.or(`merchant.ilike.${pattern},note.ilike.${pattern}`);
  }

  const { data: rows, error, count } = await q;

  if (error) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message,
        details: error,
      },
    };
  }

  const categoryIds = Array.from(new Set((rows ?? []).map((r) => r.category_id)));
  const pmIds = Array.from(new Set((rows ?? []).map((r) => r.payment_method_id)));

  const [catRes, pmRes] = await Promise.all([
    categoryIds.length > 0
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : { data: [] as { id: string; name: string }[] },
    pmIds.length > 0
      ? supabase
          .from("payment_methods")
          .select("id, name, type")
          .in("id", pmIds)
      : { data: [] as { id: string; name: string; type: string }[] },
  ]);

  const catMap = new Map(
    (catRes.data ?? []).map((c) => [c.id, { id: c.id, name: c.name }])
  );
  const pmMap = new Map(
    (pmRes.data ?? []).map((p) => [
      p.id,
      { id: p.id, name: p.name, type: p.type as "credit" | "debit" | "cash" },
    ])
  );

  const transactions: TxDTO[] = (rows ?? []).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    merchant: r.merchant,
    note: r.note,
    category: catMap.get(r.category_id) ?? { id: r.category_id, name: "" },
    payment_method: pmMap.get(r.payment_method_id) ?? {
      id: r.payment_method_id,
      name: "",
      type: "cash" as const,
    },
    is_recurring_instance: Boolean(r.is_recurring_instance),
    spent_on: r.spent_on,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return {
    ok: true,
    data: {
      transactions,
      total: count ?? transactions.length,
    },
  };
}

export async function updateTransaction(input: {
  id: string;
  amount?: number;
  category_id?: string;
  merchant?: string;
  payment_method_id?: string;
  note?: string | null;
  spent_on?: string; // YYYY-MM-DD, must stay within transaction's month
}): Promise<ActionResult<{ id: string }>> {
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

  if (!input.id) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "id required" },
    };
  }

  if (input.spent_on !== undefined) {
    const spent_on = input.spent_on.trim();
    if (!isValidYMD(spent_on)) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "spent_on must be a valid date (YYYY-MM-DD)" },
      };
    }
    const { data: txRow, error: txErr } = await supabase
      .from("transactions")
      .select("month_id")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (txErr || !txRow) {
      return {
        ok: false,
        error: { code: txErr ? "INTERNAL_ERROR" : "NOT_FOUND", message: txErr?.message ?? "Transaction not found", details: txErr },
      };
    }
    const { data: monthRow, error: monthErr } = await supabase
      .from("months")
      .select("started_at")
      .eq("id", txRow.month_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (monthErr || !monthRow) {
      return {
        ok: false,
        error: { code: monthErr ? "INTERNAL_ERROR" : "NOT_FOUND", message: monthErr?.message ?? "Month not found", details: monthErr },
      };
    }
    const started = new Date(monthRow.started_at);
    const monthYear = started.getUTCFullYear();
    const monthMonth = started.getUTCMonth() + 1;
    const spentYear = Number(spent_on.slice(0, 4));
    const spentMonth = Number(spent_on.slice(5, 7));
    if (spentYear !== monthYear || spentMonth !== monthMonth) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Date must stay within the transaction's month" },
      };
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.amount !== undefined) {
    const n = Number(input.amount);
    if (!Number.isFinite(n) || n <= 0) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "amount must be positive" },
      };
    }
    updates.amount = n;
  }
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.merchant !== undefined) updates.merchant = input.merchant.trim();
  if (input.payment_method_id !== undefined)
    updates.payment_method_id = input.payment_method_id;
  if (input.note !== undefined) updates.note = input.note?.trim() || null;
  if (input.spent_on !== undefined) updates.spent_on = input.spent_on.trim();

  const { error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: {
        code: error.code === "PGRST116" ? "NOT_FOUND" : "INTERNAL_ERROR",
        message: error.message,
        details: error,
      },
    };
  }

  return { ok: true, data: { id: input.id } };
}

export async function deleteTransaction(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
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

  if (!input.id) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "id required" },
    };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: {
        code: error.code === "PGRST116" ? "NOT_FOUND" : "INTERNAL_ERROR",
        message: error.message,
        details: error,
      },
    };
  }

  return { ok: true, data: { id: input.id } };
}

export async function listMerchantSuggestions(input: {
  q: string;
  limit?: number;
}): Promise<ActionResult<{ suggestions: string[] }>> {
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

  const q = (input.q ?? "").trim();
  const limit = Math.min(input.limit ?? 8, 20);

  if (!q) {
    const { data: rows } = await supabase
      .from("transactions")
      .select("merchant")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    const suggestions = Array.from(
      new Set((rows ?? []).map((r) => r.merchant).filter(Boolean))
    ).slice(0, limit);
    return { ok: true, data: { suggestions } };
  }

  const { data: rows } = await supabase
    .from("transactions")
    .select("merchant")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .ilike("merchant", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  const suggestions = Array.from(
    new Set((rows ?? []).map((r) => r.merchant).filter(Boolean))
  ).slice(0, limit);

  return { ok: true, data: { suggestions } };
}
