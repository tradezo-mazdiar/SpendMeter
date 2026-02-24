"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

export type CategoryDTO = { id: string; name: string; is_default: boolean };

export type ListCategoriesDTO = { categories: CategoryDTO[] };

export async function listCategories(): Promise<ActionResult<ListCategoriesDTO>> {
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
    .from("categories")
    .select("id, name, is_default")
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

  const categories: CategoryDTO[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    is_default: Boolean(r.is_default),
  }));

  return { ok: true, data: { categories } };
}
