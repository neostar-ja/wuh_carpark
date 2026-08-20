# Car Park Registration System — Walailak University Hospital

Public car park registration form (Next.js 14 App Router + Supabase), with a
basic password-protected admin area for approving/rejecting registrations.

## Stack

- Next.js 14 (App Router, TypeScript) — pinned to `14.2.35`, the latest
  patched release on the 14.x line
- Tailwind CSS
- react-hook-form + zod (shared schema in `lib/validation.ts`)
- @supabase/supabase-js (server-side only, via service role key)
- Cloudflare Turnstile (`components/TurnstileWidget.tsx` — falls back to a
  visible dev placeholder when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset)

## Project structure

```
app/
  page.tsx                 -> public registration form
  layout.tsx / globals.css
  admin/page.tsx            -> admin login + table (server component, checks session cookie)
  api/register/route.ts     -> POST: validate + rate-limit + turnstile + duplicate check + insert
  api/admin/route.ts        -> GET (list/export), POST (login/logout), PATCH (approve/reject)
lib/
  supabase.ts               -> service-role Supabase client (server-only)
  validation.ts              -> zod schemas shared by client + server
  admin-auth.ts              -> password check + signed session cookie helpers
  rate-limit.ts               -> in-memory per-IP rate limiter (see file for Upstash upgrade path)
  turnstile.ts                -> server-side Turnstile token verification
components/
  RegistrationForm.tsx
  TurnstileWidget.tsx
  AdminLoginForm.tsx
  AdminTable.tsx
supabase/migrations/001_init.sql
```

## Environment variables (Vercel)

Set these in **Vercel → Project → Settings → Environment Variables** before
deploying (copy from `.env.local.example` for local dev):

| Variable | Where to get it | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret | **No — server only** |
| `ADMIN_PASSWORD` | Choose a strong shared password for `/admin` | No |
| `TURNSTILE_SECRET_KEY` | Cloudflare dashboard → Turnstile → your widget | No |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare dashboard → Turnstile → your widget | Yes |

Without `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set, the
form still works end-to-end (a dev placeholder is shown instead of the real
widget) — set both before going to production so the anti-bot check is real.

## Database setup

Run `supabase/migrations/001_init.sql` against your Supabase project (via the
SQL editor, or `supabase db push` if you use the CLI). It creates the
`car_registrations` table, the unique index on `license_plate`, and enables
Row Level Security with policies scoped to the `service_role` only — the
`anon`/`authenticated` roles have no policies, so the browser can never read
or write this table directly; all access goes through the API routes.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in real values
npm run dev
```

## Notes / known limitations (documented, not hidden)

- **Rate limiting** (`lib/rate-limit.ts`) is in-memory per serverless
  instance — fine for a low-traffic hospital form, but resets on cold start
  and isn't shared across concurrent instances. Swap for Upstash Redis
  (instructions in the file) if abuse becomes a problem.
- **Admin auth** is a single shared password with a signed session cookie
  (HMAC, 8h expiry) — intentionally simple per the current requirements.
  `lib/admin-auth.ts` exposes three functions
  (`checkAdminPassword` / `createAdminSessionToken` / `verifyAdminSessionToken`)
  so it can be swapped for Supabase Auth later without touching callers.
- **License plate type dropdown** currently uses the placeholder Thai label
  list from the spec — confirm the final list before launch (see
  `LICENSE_PLATE_TYPE_OPTIONS` in `lib/validation.ts`).
- `npm audit` still reports a handful of unpatched Next.js 14.x advisories
  (fixes only landed on the 15.x line) — accepted per explicit instruction to
  stay on Next 14; revisit if the risk posture changes.
