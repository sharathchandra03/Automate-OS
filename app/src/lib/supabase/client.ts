"use client";

import { createBrowserClient } from "@supabase/ssr";
import { HAS_SUPABASE } from "../config";

export function createSupabaseBrowserClient() {
  if (!HAS_SUPABASE) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
