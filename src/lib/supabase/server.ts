// server.ts — the authenticated server-side Supabase client boundary.
//
// Uses the current Next.js App Router cookie API. Importing next/headers makes
// this module server-only: importing it from client code throws at build time,
// so it cannot leak into the browser bundle.
//
// Accepts ONLY public configuration (URL + publishable/anon key) plus the
// request cookies — this is NOT a service-role client. No service-role client is
// created in this batch. This batch performs no queries and makes no tenant
// assumptions.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // safe-catch: setAll is invoked from a Server Component render, where
          // the cookie store is read-only. Session refresh is handled in
          // middleware instead, so this is an expected, non-fatal no-op.
        }
      },
    },
  });
}
