// browser.ts — the browser-side Supabase client boundary.
//
// Accepts ONLY public configuration (URL + publishable/anon key). No server
// secret is ever referenced here. Throws a clear error via getPublicEnv() when
// the required public configuration is missing.
//
// This batch defines the boundary only — it performs no queries and makes no
// tenant assumptions.

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
  return createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
