"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDateInDubai, getLastDayOfMonth } from "@/lib/dates";
import type {
  ActionResult,
  RecurringDTO,
  ListRecurringDTO,
  EnsureRecurringDTO,
} from "./types";

export async function listRecurringTemplates(): Promise<
  ActionResult<ListRecurringDTO>
> {
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

  const { data: rows, error } = await supabase
    .from("recurring_templates")
    .select("id, name, amount, due_day, merchant, is_active, last_generated_month_id, category_id, payment_method_id")
    .eq("user_id", user.id)
    .order("name");

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
      ? supabase.from("payment_methods").select("id, name").in("id", pmIds)
      : { data: [] as { id: string; name: string }[] },
  ]);

  const catMap = new Map(
    (catRes.data ?? []).map((c) => [c.id, { id: c.id, name: c.name }])
  );
  const pmMap = new Map(
    (pmRes.data ?? []).map((p) => [p.id, { id: p.id, name: p.name }])
  );

  const templates: RecurringDTO[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    due_day: Number(r.due_day),
    merchant: r.merchant,
    is_active: Boolean(r.is_active),
    last_generated_month_id: r.last_generated_month_id,
    category: catMap.get(r.category_id) ?? { id: r.category_id, name: "" },
    payment_method: pmMap.get(r.payment_method_id) ?? {
      id: r.payment_method_id,
      name: "",
    },
  }));

  return { ok: true, data: { templates } };
}

export async function createRecurringTemplate(input: {
  name: string;
  amount: number;
  due_day: number;
  category_id: string;
  merchant: string;
  payment_method_id: string;
  is_active?: boolean;
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

  const name = (input.name ?? "").trim();
  const amount = Number(input.amount);
  const due_day = Number(input.due_day);
  if (!name || !Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid name or amount" },
    };
  }
  if (!Number.isFinite(due_day) || due_day < 1 || due_day > 31) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "due_day must be 1–31" },
    };
  }
  if (!input.category_id || !input.merchant?.trim() || !input.payment_method_id) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "category, merchant, and payment method required" },
    };
  }

  const { data, error } = await supabase
    .from("recurring_templates")
    .insert({
      user_id: user.id,
      name,
      amount,
      due_day,
      category_id: input.category_id,
      merchant: input.merchant.trim(),
      payment_method_id: input.payment_method_id,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

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

  return { ok: true, data: { id: data.id } };
}

export async function updateRecurringTemplate(input: {
  id: string;
  name?: string;
  amount?: number;
  due_day?: number;
  category_id?: string;
  merchant?: string;
  payment_method_id?: string;
  is_active?: boolean;
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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updates.name = input.name.trim();
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
  if (input.due_day !== undefined) {
    const d = Number(input.due_day);
    if (!Number.isFinite(d) || d < 1 || d > 31) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "due_day must be 1–31" },
      };
    }
    updates.due_day = d;
  }
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.merchant !== undefined) updates.merchant = input.merchant.trim();
  if (input.payment_method_id !== undefined)
    updates.payment_method_id = input.payment_method_id;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { error } = await supabase
    .from("recurring_templates")
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

export async function deleteRecurringTemplate(id: string): Promise<ActionResult<{ id: string }>> {
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

  if (!id) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "id required" },
    };
  }

  const { error } = await supabase
    .from("recurring_templates")
    .delete()
    .eq("id", id)
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

  return { ok: true, data: { id } };
}

export async function ensureRecurringAppliedForMonth(input: {
  month_id: string;
}): Promise<ActionResult<EnsureRecurringDTO>> {
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

  const { data: monthRow, error: monthError } = await supabase
    .from("months")
    .select("id, started_at")
    .eq("id", input.month_id)
    .eq("user_id", user.id)
    .single();

  if (monthError || !monthRow) {
    return {
      ok: false,
      error: {
        code: monthError ? "INTERNAL_ERROR" : "NOT_FOUND",
        message: monthError?.message ?? "Month not found",
        details: monthError,
      },
    };
  }

  const startedAt = new Date(monthRow.started_at);
  const monthYear = startedAt.getUTCFullYear();
  const monthMonth = startedAt.getUTCMonth() + 1;
  const lastDay = getLastDayOfMonth(monthYear, monthMonth);

  const today = getCurrentDateInDubai();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const { data: templates, error: listError } = await supabase
    .from("recurring_templates")
    .select("id, due_day, amount, category_id, merchant, payment_method_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (listError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: listError.message,
        details: listError,
      },
    };
  }

  const createdTransactionIds: string[] = [];

  for (const t of templates ?? []) {
    const effectiveDueDay = Math.min(Number(t.due_day), lastDay);

    const dueDatePassed =
      todayYear > monthYear ||
      (todayYear === monthYear && todayMonth > monthMonth) ||
      (todayYear === monthYear &&
        todayMonth === monthMonth &&
        todayDay >= effectiveDueDay);

    if (!dueDatePassed) continue;

    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_id", input.month_id)
      .eq("recurring_template_id", t.id)
      .eq("is_recurring_instance", true)
      .maybeSingle();

    if (existing) continue;

    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        month_id: input.month_id,
        amount: t.amount,
        category_id: t.category_id,
        merchant: t.merchant,
        payment_method_id: t.payment_method_id,
        is_recurring_instance: true,
        recurring_template_id: t.id,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") continue;
      return {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: insertError.message,
          details: insertError,
        },
      };
    }

    if (inserted) {
      createdTransactionIds.push(inserted.id);
      await supabase
        .from("recurring_templates")
        .update({
          last_generated_month_id: input.month_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.id)
        .eq("user_id", user.id);
    }
  }

  return {
    ok: true,
    data: {
      created_count: createdTransactionIds.length,
      created_transaction_ids: createdTransactionIds,
    },
  };
}
