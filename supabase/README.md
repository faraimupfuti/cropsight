# Supabase setup

CropSight runs on in-memory demo data with zero setup. This guide is for
turning on **live mode** — a real, multi-tenant Postgres backend with
authentication, Row Level Security, and persistent image storage.

## 1. Create a project

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, note down:
   - **Project URL** → this is both `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ this key bypasses
     Row Level Security entirely — it's used only server-side, in Netlify
     Functions, and must never be prefixed with `VITE_` or shipped to the
     browser)

## 2. Run the migrations

In the Supabase dashboard's **SQL Editor**, run each file in
`supabase/migrations/` **in order**:

1. `0001_schema.sql` — tables, enums, indexes, triggers
2. `0002_rls_policies.sql` — Row Level Security, enabled on every table
3. `0003_seed_reference_data.sql` — the Maize crop + three disease classes
   (Cercospora Leaf Spot, Common Rust, Northern Leaf Blight) + their
   knowledge base content
4. `0004_bootstrap_org.sql` — the self-serve "create your organization" function
5. `0005_storage.sql` — the private `observation-images` storage bucket + policies

Or, with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref your-project-ref
supabase db push
```

**These migrations were validated by actually running them against a real
local Postgres 16 instance** (with a stub of Supabase's `auth`/`storage`
schemas) during development — including a live test that created two
separate organizations and confirmed one cannot read or write the other's
data. They should apply cleanly to a real Supabase project as-is. The CI
workflow (`.github/workflows/ci.yml`) re-validates this on every push.

## 3. Configure environment variables

**Locally:** copy `.env.example` to `.env` and fill in the values from
step 1.

**On Netlify:** Site configuration → Environment variables → add the same
six variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus your `ML_SERVICE_URL` /
`ML_API_KEY` from the main README). Redeploy.

## 4. Try it

1. Visit `/login` — you'll now see real sign-in/sign-up instead of the demo
   role picker.
2. Sign up with an email + password.
3. If your Supabase project has email confirmation enabled (the default),
   confirm via the email you receive, then sign in.
4. You'll land on `/onboarding` — create your organization. This calls the
   `bootstrap_organization` function, which atomically creates your
   organization and makes you its first admin (or farmer, if you choose
   that account type).
5. You're in — but there's no data yet. As a `company_admin`, you'd
   typically provision farmer accounts (see §5) and they'd add farms/fields
   and start uploading. The Farmer/Agronomist/Company/Researcher/Admin UI
   itself doesn't change between demo and live mode — only where the data
   comes from.

## 5. Provisioning additional users

Self-serve sign-up only creates `company_admin` or `farmer` accounts (see
`bootstrap_organization`'s guard). To add agronomists, researchers, or
additional farmers to an existing organization:

- **Simplest for now:** an admin creates the user in the Supabase dashboard
  (Authentication → Users → Add user), then inserts a matching row into
  `profiles` with the right `organization_id` and `role` via the SQL editor.
- **Better, not yet built:** an invite-link flow (generate a signed token
  tied to an org+role, new user redeems it on sign-up). This is a natural
  next feature — the schema already supports it, it just needs a function
  + UI.

## 6. What's genuinely tested vs. what needs your verification

**Verified in this environment**, against a real local Postgres instance:
- Every migration applies cleanly, in order, with zero errors
- RLS actually blocks cross-organization reads and writes (not just
  "policies exist" — an actual two-tenant test was run)
- The `bootstrap_organization` function works, including its "only once"
  guard

**Not verified here** (no live Supabase project was available in this
environment) — please smoke-test these against your real project before
going live:
- The exact PostgREST embedded-select syntax in `src/lib/api/liveData.ts`
  (nested `.select()` calls with foreign-key joins) — Supabase's embedding
  conventions are consistent, but a live query is the only way to be 100%
  sure of the relationship names it infers
- Storage upload/signed-URL behavior end-to-end from the Netlify Function
- Auth email templates / confirmation flow (Supabase's defaults will work,
  but you'll likely want to customize them)
