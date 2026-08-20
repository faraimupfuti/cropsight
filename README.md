# CropSight (Web)

AI-assisted maize crop health intelligence for Zimbabwe / Southern Africa —
a React + TypeScript app deployable to **Netlify via GitHub**, with real
authentication, a real multi-tenant Postgres backend (Supabase), a live
GIS map, and a proxied inference integration that never exposes your API
key to the browser.

CropSight is not a diagnostic authority. Every AI prediction is labelled
"pending agronomist verification" and is never presented as confirmed.

---

## 1. Two modes, one codebase

- **Demo mode** (default, zero setup): all data lives in memory in the
  browser. Perfect for evaluating the product or running a sales demo —
  `npm install && npm run dev` and you're in.
- **Live mode** (once you configure Supabase — see `supabase/README.md`):
  the exact same UI, backed by a real Postgres database with Row Level
  Security enforcing multi-tenant isolation, real authentication, and
  persistent image storage.

The app detects which mode to run in from whether `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` are set. No code changes needed to switch.

## 2. Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Routing:** React Router
- **State:** Zustand — bridges demo (in-memory) and live (Supabase) data behind one API
- **Charts:** Recharts
- **GIS:** Leaflet + react-leaflet + OpenStreetMap tiles (no API key needed), with marker clustering
- **Backend:** Supabase — Postgres, Auth, Storage, Row Level Security
- **Inference proxy:** Netlify Functions (`netlify/functions/predict.ts`, `detect-outbreaks-scheduled.ts`)
- **Testing:** Vitest + React Testing Library
- **CI:** GitHub Actions — typecheck, build, test, and SQL migration validation on every push
- **Deployment:** Netlify, built from GitHub on every push

## 3. Project structure

```
cropsight-web/
├── .github/workflows/ci.yml       # typecheck + test + build + migration validation
├── netlify/functions/
│   ├── predict.ts                 # ML proxy + (in live mode) authorized persistence
│   └── detect-outbreaks-scheduled.ts  # cron job, server-side outbreak detection
├── netlify.toml                   # build command, SPA redirects, security headers incl. CSP
├── supabase/
│   ├── migrations/                # schema, RLS, seed data, storage — see supabase/README.md
│   └── README.md                  # how to provision and verify a real backend
├── .env.example                   # every env var, explained
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── auth.ts            # Supabase Auth wrappers + role mapping
│   │   │   └── liveData.ts        # org-scoped fetches/mutations against Postgres
│   │   ├── supabaseClient.ts      # client singleton + isSupabaseConfigured flag
│   │   ├── diseaseData.ts         # disease classes + knowledge base (Cercospora, Rust, NLB)
│   │   ├── mlClient.ts            # calls the Netlify Function; client-side image validation
│   │   ├── mockData.ts            # seeded demo dataset generator
│   │   ├── store.ts               # Zustand store: demo/live session + data + actions
│   │   ├── format.ts              # date/percent/CSV helpers
│   │   └── *.test.ts              # unit tests
│   ├── components/
│   │   ├── AppShell.tsx, ErrorBoundary.tsx, ToastHost.tsx
│   │   ├── DiseaseMap.tsx         # Leaflet GIS map with clustering
│   │   └── charts/Charts.tsx      # Recharts wrappers
│   └── pages/
│       ├── Landing.tsx, Login.tsx, Onboarding.tsx, Privacy.tsx, Terms.tsx, NotFound.tsx
│       ├── farmer/    (Dashboard, Upload, Fields, FieldDetail, History)
│       ├── agronomist/(Queue, ReviewDetail, Trends)
│       ├── company/   (Overview, MapView, Outbreaks, Agronomists, Reports)
│       ├── researcher/(Explorer)
│       └── admin/     (Overview, Users, Diseases, Models, Thresholds)
```

## 4. Run locally

```bash
npm install
npm run dev        # http://localhost:5173, demo mode unless .env has Supabase vars
npm test           # 37 unit tests — logic, formatting, validation, a component test
npm run build       # production build (tsc -b && vite build)
```

To exercise the real Netlify Function locally (needed for live-mode
persistence to work, not just demo-mode mock predictions):

```bash
npm install -g netlify-cli
netlify dev
```

## 5. Deploy: GitHub → Netlify

1. Push this project to a new GitHub repository. **Never commit a real
   `.env`** — `.env.example` is the template; real secrets only ever go
   into Netlify's dashboard.
2. In Netlify: **Add new site → Import an existing project → GitHub** →
   select the repo. `netlify.toml` configures the build automatically.
3. In **Site configuration → Environment variables**, add:
   - `ML_SERVICE_URL`, `ML_API_KEY` — your inference workflow (§6)
   - `MAX_UPLOAD_BYTES` — optional, defaults to 8,000,000
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
     `SUPABASE_SERVICE_ROLE_KEY` — optional, for live mode (§7)
   - `VITE_PLAUSIBLE_DOMAIN` — optional, privacy-friendly analytics (§9)
4. Deploy. Every push to your default branch redeploys automatically —
   `.github/workflows/ci.yml` also runs typecheck/test/build/migration
   validation on every push and PR, independent of Netlify's own build.

## 6. Wiring up your real inference endpoint

Confirmed endpoint: `https://serverless.roboflow.com/faraimupfuti/workflows/cropsight-model`
— Roboflow's hosted serverless URL, publicly reachable, so it works
correctly from a Netlify Function (unlike the `localhost:9001` address
from a local `inference` server, which only ever works on the machine
running it). Set this as `ML_SERVICE_URL` in `.env` / Netlify's
environment variables — it's already the default in `.env.example`.

Until `ML_SERVICE_URL` + `ML_API_KEY` are both set, or if the endpoint is
briefly unreachable, `predict.ts` serves a clearly-labelled mock
prediction automatically — the upload flow never breaks. **Class label
mapping:** your model's real output class names probably won't exactly
match `"Cercospora Leaf Spot"` etc. — `CLASS_LABEL_MAP` near the top of
`netlify/functions/predict.ts` is the one place to adjust once you've
confirmed your model's actual labels from a real prediction response.

**Security note — this matters more now, not less:** the same API key has
now been posted in plain text in this chat twice. Whatever I do in the
code, that key should be treated as compromised. Rotate it in your
Roboflow account (Settings → API Keys) before relying on this in
production, and only ever paste the *new* key into `.env` / Netlify's
dashboard — never into a chat message or committed file.
what's in the code.

## 7. Live mode: real backend, real auth, real multi-tenancy

See **`supabase/README.md`** for full setup steps. Summary of what's
actually implemented and tested:

- **Schema** (`supabase/migrations/0001_schema.sql`): 16 tables — organizations,
  profiles, farms, fields, crops, crop_diseases, disease_knowledge,
  recommendations, images, observations, predictions, agronomist_reviews,
  model_versions, outbreak_thresholds, outbreaks, audit_log. UUID keys,
  indexes on every foreign key and filter column, `updated_at` triggers.
- **Row Level Security** (`0002_rls_policies.sql`): enabled on every
  table, no exceptions. Organization isolation is enforced at the
  database layer — **this was behaviorally tested**, not just written: a
  two-tenant scenario was set up locally, confirming Farmer A cannot read
  Farm B's data and a cross-org insert is rejected outright by Postgres.
- **Self-serve organization bootstrap** (`0004_bootstrap_org.sql`): a
  `SECURITY DEFINER` function that atomically creates an org + the
  caller's profile on first sign-up, with a tested guard against being
  called twice.
- **Private, org-scoped image storage** (`0005_storage.sql`).
- **Server-side authorization in the Netlify Function**: `predict.ts`
  independently re-verifies the caller's session and that they're allowed
  to write to the target field — before touching the database, using the
  service-role key. This is defense-in-depth on top of RLS, not a
  replacement for it, per the "never rely on frontend alone" principle.
- **Scheduled outbreak detection**: `detect-outbreaks-scheduled.ts` runs
  every 6 hours via Netlify's cron scheduling and writes to the
  `outbreaks` table, rather than recomputing on every dashboard load.

**Honesty about what's *not* independently verified:** the SQL and RLS
logic were tested against a real local Postgres instance in this
environment. The TypeScript data-fetching layer
(`src/lib/api/liveData.ts`) was written to Supabase's documented
PostgREST conventions but — since no live hosted Supabase project was
available to test against here — hasn't been exercised against a real
project. Smoke-test it against yours; `supabase/README.md` §6 has the
details of exactly what to check.

## 8. Testing & CI

```bash
npm test
```

37 tests covering: outbreak-detection logic (thresholds, time windows,
region/disease separation, edge cases), disease-knowledge-base integrity
(every severity-capable disease has a complete KB entry), CSV/date
formatting, client-side image validation, JPEG EXIF stripping (happy
path, non-JPEG passthrough, malformed-buffer safety, and correctly
leaving non-EXIF APP1 data like XMP untouched), the live-mode review
confirm/correct/uncertain logic (with a regression test that fails
against the original buggy version and passes against the fix — verified
both ways), farm/field creation (region-based coordinate assignment,
different regions producing meaningfully different coordinates), and a
component render test.

`.github/workflows/ci.yml` runs on every push and PR: typecheck + build,
Netlify Function typecheck, the full test suite, and — using a real
Postgres 16 service container — applies every SQL migration in order to
catch schema regressions before they reach main.

**What's not covered yet:** end-to-end tests (Playwright) exercising full
user flows in a browser, and integration tests against a real Supabase
project. Both are natural next additions.

## 9. Security & hardening notes

- **Content-Security-Policy** set in `netlify.toml`, scoped to exactly the
  external origins the app actually uses (OpenStreetMap tiles, Google
  Fonts, Supabase, optional Plausible) — no wildcard, no `unsafe-inline`
  for scripts.
- **Rate limiting** on `predict.ts` is a simple in-memory per-instance
  limiter — a real speed bump, but not a distributed guarantee across
  concurrent function instances. For that, back it with Upstash Redis or
  similar; noted inline in the code.
- **Image validation**: client-side (fast feedback: type/size) and
  server-side (magic-byte check, size cap) — the server check is the real
  boundary, the client one is just UX.
- **EXIF stripping**: uploaded JPEGs have their EXIF metadata (which can
  include GPS coordinates embedded by the phone that took the photo)
  removed server-side before storage — see `netlify/functions/lib/stripExif.ts`.
  Currently JPEG-only; PNG/WebP are not stripped (§10).
- **Analytics**: off by default. Setting `VITE_PLAUSIBLE_DOMAIN` loads
  Plausible (cookie-free, no personal data) — nothing loads otherwise.
- **Privacy/Terms pages** (`/privacy`, `/terms`) are product-level drafts,
  clearly marked as such, linked from the pilot-request form with a
  consent checkbox. They are not legal advice — have them reviewed before
  handling real farmer data.

## 10. Remaining work — the honest list

- [ ] Smoke-test `src/lib/api/liveData.ts`'s embedded queries against a real Supabase project (§7)
- [ ] Invite-link flow for provisioning agronomist/researcher/additional-farmer accounts (currently manual — see `supabase/README.md` §5)
- [ ] Per-disease outbreak thresholds (schema already supports `crop_disease_id` on `outbreak_thresholds`; the UI only edits the org-wide default)
- [ ] End-to-end tests (Playwright) for the core flows
- [ ] Distributed rate limiting (Upstash Redis) if usage grows past what the in-memory limiter can reasonably bound
- [ ] EXIF stripping currently covers JPEG only (§10 below) — PNG/WebP metadata is not stripped; documented as a known gap since it's a much less common source of GPS leakage from phone photos
- [ ] Real legal review of `/privacy` and `/terms`
- [ ] Explainability in the AI result card (currently explicitly labelled as not implemented, rather than faked)
- [ ] Confirm the real model's class labels and update `CLASS_LABEL_MAP` in `predict.ts` (§6) — and if your workflow can output a real severity value, wire it into `parseWorkflowResponse` so severity stops being derived from confidence as a fallback (see `severity_source` in the prediction response)
- [ ] Error tracking service (Sentry or similar) wired into `ErrorBoundary.tsx`'s `componentDidCatch`
- [ ] Audit log (`audit_log` table) is written to on every observation/org-bootstrap action but has no admin UI to read it yet

### Fixed since the initial live-mode build (verified, not just claimed)

- **Farmers could not add farms or fields.** The original MVP spec explicitly called for this ("Farmers can create: Farm → Fields"), and it had never actually been built — `Fields.tsx` only ever listed pre-existing data. Fixed: farmers can now create a new farm (or add to an existing one) and add fields to it, with region-based approximate GPS coordinates auto-assigned so new fields show up sensibly on the GIS map without requiring the farmer to know their coordinates. Works in both demo mode (in-memory) and live mode (real Supabase inserts, respecting RLS). Covered by 4 new unit tests, plus a full browser test of the actual add-farm-and-field flow.
- **Mobile navigation was broken for farmers — the one role the spec calls "mobile-first."** Checked directly with a mobile-viewport screenshot: the sidebar was hidden below the `md` breakpoint with no replacement, so a farmer on a phone had no way to reach My Fields or Observation History once they navigated away from the dashboard — only "Check My Crop" and "Log out" were reachable. Fixed with a proper hamburger menu in the mobile topbar exposing the same nav links as desktop; verified with a real tap-through test (open menu → tap "My Fields" → confirm it navigates and the menu closes).
- **Confirming a review used to silently drop the diagnosis.** `submitReviewLive` only recorded a final disease/severity when an agronomist *corrected* a prediction — clicking "Confirm" left both fields `null` in the database. Fixed to carry over the AI's own prediction on confirm, with a regression test (`src/lib/api/liveData.test.ts`) that fails against the old logic and passes against the fix — verified both ways, not just written.
- **Uploaded PNG/WebP images were stored with the wrong content-type and `.jpg` extension.** `predict.ts` now detects the real format from the image's magic bytes and uses it consistently for the storage upload, the file extension, and the `images.mime_type` column.
- **Severity was silently derived from model confidence**, conflating "how sure the model is" with "how bad the disease is." `predict.ts` now only uses that heuristic as an explicit fallback (tagged `severity_source: "confidence_heuristic"` in the response), prefers a real severity value from the workflow if one is present, and the farmer-facing result card shows a plain-language caveat whenever the heuristic was used.
- **Uploaded JPEGs retained EXIF metadata**, which commonly includes GPS coordinates from the phone that took the photo — a privacy exposure independent of the field's own registered location. `netlify/functions/lib/stripExif.ts` is a small, dependency-free JPEG segment parser that removes the EXIF (APP1) segment before the image is stored, with 6 unit tests covering the happy path, non-JPEG passthrough, "no EXIF present," "don't strip non-EXIF APP1 data like XMP," and malformed-buffer safety (it bails out and returns the original buffer rather than risk corrupting the image).
