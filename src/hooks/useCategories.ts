import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { READING_CATEGORIES } from "@/lib/constants";

export type ReadingCategory = {
  id: number;
  name: string;
  realm: string;
  prompt: string;
};

const FALLBACK: ReadingCategory[] = READING_CATEGORIES;

let cache: ReadingCategory[] | null = null;
const listeners = new Set<(v: ReadingCategory[]) => void>();
let subscribed = false;

async function load() {
  try {
    const { data, error } = await (supabase as any)
      .from("custom_categories")
      .select("id,name,realm_name,prompt,display_order,is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (error || !data || data.length === 0) {
      cache = FALLBACK;
    } else {
      cache = (data as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        realm: r.realm_name || "",
        prompt: r.prompt || "",
      }));
    }
  } catch (err) {
    console.warn("Could not load categories from database, using fallback:", err);
    cache = FALLBACK;
  }
  listeners.forEach((l) => l(cache!));
}

/** Reading categories, live from the database (admin-editable), with static fallback. */
export function useCategories() {
  const [categories, setCategories] = useState<ReadingCategory[]>(cache ?? FALLBACK);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    listeners.add(setCategories);
    load().finally(() => setLoading(false));

    if (!subscribed) {
      subscribed = true;
      supabase
        .channel("custom_categories_live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "custom_categories" },
          () => load()
        )
        .subscribe();
    }

    return () => {
      listeners.delete(setCategories);
    };
  }, []);

  return { categories, loading };
}
