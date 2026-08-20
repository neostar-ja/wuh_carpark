import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this file
// from client components — it bypasses Row Level Security by design.
//
// Built lazily (on first use) rather than at module load: Next.js imports
// every route module during `next build` to collect page data, and throwing
// here at import time would crash the production build if env vars aren't
// injected into that build step — even though they'd be present at request
// time. Deferring the check to first real use keeps the build resilient and
// still fails loudly the moment an API route actually tries to talk to
// Supabase without credentials configured.
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // Next.js patches the global fetch() to add its own Data Cache layer,
      // and that patch reaches into supabase-js's internal fetch calls too —
      // separate from (and invisible to) Vercel's edge/CDN cache. A route
      // being marked force-dynamic controls whether *that route* is
      // prerendered, but isn't reliably enough to stop this from silently
      // caching a stale Supabase read (e.g. an admin approval not showing up
      // on the public status-check page afterwards). Force every Supabase
      // request to bypass it outright.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
