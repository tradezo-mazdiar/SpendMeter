"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, SeedDTO } from "./types";

const DEFAULT_CATEGORIES = [
  "Food",
  "Fuel",
  "Groceries",
  "Bills",
  "Shopping",
  "Entertainment",
  "Other",
];

export async function ensureUserSeedData(): Promise<ActionResult<SeedDTO>> {
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
  const result: SeedDTO = {
    created_profile: false,
    created_default_categories: false,
    created_cash_method: false,
  };

  try {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        display_name: null,
        currency_code: "AED",
      });
      if (profileError) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: profileError.message,
            details: profileError,
          },
        };
      }
      result.created_profile = true;
    }

    const { data: existingCategories } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingCategories?.length) {
      const { error: catError } = await supabase.from("categories").insert(
        DEFAULT_CATEGORIES.map((name) => ({
          user_id: userId,
          name,
          is_default: true,
        }))
      );
      if (catError) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: catError.message,
            details: catError,
          },
        };
      }
      result.created_default_categories = true;
    }

    const { data: existingCash } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "Cash")
      .maybeSingle();

    if (!existingCash) {
      const { error: pmError } = await supabase.from("payment_methods").insert({
        user_id: userId,
        name: "Cash",
        type: "cash",
        card_limit: null,
        apple_pay_linked: false,
        is_active: true,
      });
      if (pmError) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: pmError.message,
            details: pmError,
          },
        };
      }
      result.created_cash_method = true;
    }

    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Seed failed",
        details: err,
      },
    };
  }
}
