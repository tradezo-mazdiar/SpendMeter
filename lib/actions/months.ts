"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthLabel } from "@/lib/dates";
import type {
  ActionResult,
  MonthDTO,
  ListMonthsDTO,
  NewMonthNeededDTO,
  StartNewMonthDTO,
  UpdateLimitDTO,
} from "./types";

function toMonthDTO(row: {
  id: string;
  label: string;
  spending_limit: number;
  is_active: boolean;
  started_at: string;
}): MonthDTO {
  return {
    id: row.id,
    label: row.label,
    spending_limit: Number(row.spending_limit),
    is_active: true as const,
    started_at: row.started_at,
  };
}

export async function getActiveMonth(): Promise<ActionResult<MonthDTO>> {
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

  const userId = user.id;

  const { data: active, error: fetchError } = await supabase
    .from("months")
    .select("id, label, spending_limit, is_active, started_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: fetchError.message,
        details: fetchError,
      },
    };
  }

  if (active) {
    return { ok: true, data: toMonthDTO(active) };
  }

  const label = getCurrentMonthLabel();
  const { data: inserted, error: insertError } = await supabase
    .from("months")
    .insert({
      user_id: userId,
      label,
      spending_limit: 0,
      is_active: true,
    })
    .select("id, label, spending_limit, is_active, started_at")
    .single();

  if (insertError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: insertError.message,
        details: insertError,
      },
    };
  }

  return { ok: true, data: toMonthDTO(inserted) };
}

export async function listMonths(input?: {
  limit?: number;
}): Promise<ActionResult<ListMonthsDTO>> {
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

  const limit = input?.limit ?? 24;

  const { data: rows, error } = await supabase
    .from("months")
    .select("id, label, spending_limit, is_active, started_at")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(limit);

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

  const months = (rows ?? []).map((r) => toMonthDTO(r));
  return { ok: true, data: { months } };
}

export async function detectNewMonthNeeded(): Promise<
  ActionResult<NewMonthNeededDTO>
> {
  const result = await getActiveMonth();
  if (!result.ok) return result;

  const currentLabel = getCurrentMonthLabel();
  const needed = result.data.label !== currentLabel;

  return {
    ok: true,
    data: {
      needed,
      suggested_label: currentLabel,
      current_active_label: result.data.label,
    },
  };
}

export async function startNewMonth(input: {
  label: string;
  spending_limit: number;
}): Promise<ActionResult<StartNewMonthDTO>> {
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

  const label = (input.label ?? getCurrentMonthLabel()).trim();
  const spending_limit = Number(input.spending_limit);
  if (!label) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Label is required",
      },
    };
  }

  const { data: active, error: fetchError } = await supabase
    .from("months")
    .select("id, spending_limit")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: fetchError.message,
        details: fetchError,
      },
    };
  }

  const limitToUse = active ? Number(active.spending_limit) : 0;
  const newLimit = Number.isFinite(spending_limit) ? spending_limit : limitToUse;

  if (active) {
    const { error: updateError } = await supabase
      .from("months")
      .update({ is_active: false, closed_at: new Date().toISOString() })
      .eq("id", active.id);

    if (updateError) {
      return {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: updateError.message,
          details: updateError,
        },
      };
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("months")
    .insert({
      user_id: user.id,
      label,
      spending_limit: newLimit,
      is_active: true,
    })
    .select("id, label, spending_limit, is_active, started_at")
    .single();

  if (insertError) {
    return {
      ok: false,
      error: {
        code: insertError.code === "23505" ? "CONFLICT" : "INTERNAL_ERROR",
        message: insertError.message,
        details: insertError,
      },
    };
  }

  return {
    ok: true,
    data: {
      closed_month_id: active?.id ?? "",
      new_month: toMonthDTO(inserted),
    },
  };
}

export async function updateActiveMonthLimit(input: {
  spending_limit: number;
}): Promise<ActionResult<UpdateLimitDTO>> {
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

  const spending_limit = Number(input.spending_limit);
  if (!Number.isFinite(spending_limit) || spending_limit < 0) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid spending limit",
      },
    };
  }

  const { data: active, error: fetchError } = await supabase
    .from("months")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError || !active) {
    return {
      ok: false,
      error: {
        code: fetchError ? "INTERNAL_ERROR" : "NOT_FOUND",
        message: fetchError?.message ?? "No active month found",
        details: fetchError,
      },
    };
  }

  const { error: updateError } = await supabase
    .from("months")
    .update({ spending_limit })
    .eq("id", active.id);

  if (updateError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: updateError.message,
        details: updateError,
      },
    };
  }

  return {
    ok: true,
    data: { month_id: active.id, spending_limit },
  };
}

export async function getMonthSpent(monthId: string): Promise<
  ActionResult<{ spent: number }>
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

  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("month_id", monthId)
    .eq("is_deleted", false);

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

  const spent = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  return { ok: true, data: { spent } };
}
