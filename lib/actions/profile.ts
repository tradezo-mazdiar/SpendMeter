"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

export type ProfileDTO = {
  user_id: string;
  display_name: string | null;
  currency_code: "AED";
};

export async function getSessionProfile(): Promise<ActionResult<ProfileDTO>> {
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

  const { data: row, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, currency_code")
    .eq("user_id", user.id)
    .maybeSingle();

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

  if (!row) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Profile not found" },
    };
  }

  return {
    ok: true,
    data: {
      user_id: row.user_id,
      display_name: row.display_name,
      currency_code: (row.currency_code ?? "AED") as "AED",
    },
  };
}

export async function updateProfileDisplayName(input: {
  display_name: string | null;
}): Promise<ActionResult<{ user_id: string }>> {
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

  const displayName =
    input.display_name != null ? String(input.display_name).trim() || null : null;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("user_id", user.id);

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

  return { ok: true, data: { user_id: user.id } };
}

/** Call after signUp to set display_name for the new user (upserts profile). */
export async function ensureProfileWithDisplayName(input: {
  display_name: string | null;
}): Promise<ActionResult<{ user_id: string }>> {
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

  const displayName =
    input.display_name != null ? String(input.display_name).trim() || null : null;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: displayName,
      currency_code: "AED",
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: upsertError.message,
        details: upsertError,
      },
    };
  }

  return { ok: true, data: { user_id: user.id } };
}
