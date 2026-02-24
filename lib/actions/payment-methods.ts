"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

export type PaymentMethodDTO = {
  id: string;
  name: string;
  type: "credit" | "debit" | "cash";
  card_limit: number | null;
  apple_pay_linked: boolean;
  is_active: boolean;
};

export type ListPaymentMethodsDTO = { methods: PaymentMethodDTO[] };

export type PaymentMethodWithSpentDTO = {
  id: string;
  name: string;
  type: "credit" | "debit";
  card_limit: number | null;
  spent: number;
  remaining: number | null;
};

export type ListPaymentMethodsWithSpentDTO = {
  methods: PaymentMethodWithSpentDTO[];
};

export async function listPaymentMethodsWithSpent(monthId: string): Promise<
  ActionResult<ListPaymentMethodsWithSpentDTO>
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
    .from("payment_methods")
    .select("id, name, type, card_limit")
    .eq("user_id", user.id)
    .in("type", ["credit", "debit"])
    .eq("is_active", true)
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

  const { data: txRows } = await supabase
    .from("transactions")
    .select("payment_method_id, amount")
    .eq("user_id", user.id)
    .eq("month_id", monthId)
    .eq("is_deleted", false);

  const spentByPm = new Map<string, number>();
  for (const r of txRows ?? []) {
    const amt = Number(r.amount);
    spentByPm.set(r.payment_method_id, (spentByPm.get(r.payment_method_id) ?? 0) + amt);
  }

  const methods: PaymentMethodWithSpentDTO[] = (rows ?? []).map((r) => {
    const spent = spentByPm.get(r.id) ?? 0;
    const limit = r.card_limit != null ? Number(r.card_limit) : null;
    const remaining = limit != null ? limit - spent : null;
    return {
      id: r.id,
      name: r.name,
      type: r.type as "credit" | "debit",
      card_limit: limit,
      spent,
      remaining,
    };
  });

  return { ok: true, data: { methods } };
}

export async function listPaymentMethods(): Promise<
  ActionResult<ListPaymentMethodsDTO>
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
    .from("payment_methods")
    .select("id, name, type, card_limit, apple_pay_linked, is_active")
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

  const methods: PaymentMethodDTO[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as "credit" | "debit" | "cash",
    card_limit: r.card_limit != null ? Number(r.card_limit) : null,
    apple_pay_linked: Boolean(r.apple_pay_linked),
    is_active: Boolean(r.is_active),
  }));

  return { ok: true, data: { methods } };
}

export async function createPaymentMethod(input: {
  name: string;
  type: "credit" | "debit" | "cash";
  card_limit?: number | null;
  apple_pay_linked?: boolean;
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
  if (!name) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Name is required" },
    };
  }
  const type = input.type;
  if (!type || !["credit", "debit", "cash"].includes(type)) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Type must be credit, debit, or cash",
      },
    };
  }

  const cardLimit =
    input.card_limit != null && Number.isFinite(Number(input.card_limit))
      ? Number(input.card_limit)
      : null;
  const applePayLinked = Boolean(input.apple_pay_linked);

  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      user_id: user.id,
      name,
      type,
      card_limit: cardLimit,
      apple_pay_linked: applePayLinked,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    const isConflict = error.code === "23505";
    return {
      ok: false,
      error: {
        code: isConflict ? "CONFLICT" : "INTERNAL_ERROR",
        message: isConflict ? "A payment method with this name already exists" : error.message,
        details: error,
      },
    };
  }

  return { ok: true, data: { id: data.id } };
}

export async function updatePaymentMethod(input: {
  id: string;
  name?: string;
  type?: "credit" | "debit" | "cash";
  card_limit?: number | null;
  apple_pay_linked?: boolean;
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

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = (input.name ?? "").trim();
    if (!name) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Name cannot be empty" },
      };
    }
    updates.name = name;
  }
  if (input.type !== undefined) {
    if (!["credit", "debit", "cash"].includes(input.type)) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Type must be credit, debit, or cash",
        },
      };
    }
    updates.type = input.type;
  }
  if (input.card_limit !== undefined) {
    updates.card_limit =
      input.card_limit != null && Number.isFinite(Number(input.card_limit))
        ? Number(input.card_limit)
        : null;
  }
  if (input.apple_pay_linked !== undefined) {
    updates.apple_pay_linked = Boolean(input.apple_pay_linked);
  }
  if (input.is_active !== undefined) {
    updates.is_active = Boolean(input.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, data: { id: input.id } };
  }

  const { data, error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    const isConflict = error.code === "23505";
    return {
      ok: false,
      error: {
        code: isConflict ? "CONFLICT" : "INTERNAL_ERROR",
        message: isConflict ? "A payment method with this name already exists" : error.message,
        details: error,
      },
    };
  }
  if (!data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Payment method not found" } };
  }

  return { ok: true, data: { id: data.id } };
}

export async function deletePaymentMethod(id: string): Promise<ActionResult<{ id: string }>> {
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

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    const isFk = error.code === "23503";
    return {
      ok: false,
      error: {
        code: isFk ? "CONFLICT" : "INTERNAL_ERROR",
        message: isFk
          ? "Cannot delete: this payment method is used in transactions"
          : error.message,
        details: error,
      },
    };
  }

  return { ok: true, data: { id } };
}
