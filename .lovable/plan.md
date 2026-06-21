## Goal

Passively track anonymous visitors across the marketing/app surface, capture UTM + behavior signals, segment them into archetypes (e.g. revenue-curious, policy-curious, returning-considerer, code-redeemer, paying), and expose a live breakdown at `/admin/archetypes`. No extra steps for the visitor.

## 1. Database (single migration)

Two new tables in `public`, both writable by anonymous visitors but only readable by admins.

`visitors`
- `id uuid pk` (generated client-side, stored in `localStorage` as the stable visitor id)
- `first_seen_at`, `last_seen_at timestamptz`
- `first_utm_source / medium / campaign / term / content text`
- `first_referrer text`, `first_landing_path text`
- `last_path text`
- `user_id uuid null` (set once the visitor signs in; links to `auth.users`)
- `archetype text null` (computed, see section 4)
- `archetype_updated_at timestamptz`
- `session_count int default 1`, `event_count int default 0`
- `country text null`, `user_agent text null`

`visitor_events`
- `id bigserial pk`
- `visitor_id uuid references visitors(id) on delete cascade`
- `event_name text` (`page_view`, `signup_started`, `signup_completed`, `code_redeemed`, `pricing_view`, `checkout_started`, `checkout_completed`, `cta_click`, `form_submit`)
- `path text`, `referrer text`
- `metadata jsonb default '{}'`
- `occurred_at timestamptz default now()`
- index on `(visitor_id, occurred_at desc)` and `(event_name, occurred_at desc)`

RLS + GRANTs (in same migration):
- `GRANT INSERT, SELECT, UPDATE ON visitors TO anon, authenticated` (select needed so an anon visitor can upsert by id; UPDATE limited by policy)
- `GRANT INSERT ON visitor_events TO anon, authenticated`
- `GRANT ALL ON both TO service_role`
- Policies:
  - Anyone (anon + authenticated) can `INSERT` a row in `visitors` and `visitor_events`.
  - Anon can `SELECT` / `UPDATE` only the `visitors` row whose `id` is supplied in the request (we treat the client-generated UUID as the bearer; acceptable because the data is non-sensitive analytics). Authenticated users can also update their own row by matching `user_id = auth.uid()`.
  - Admins (`public.has_role(auth.uid(), 'admin')`) can `SELECT` everything on both tables.
  - Nobody but `service_role` + admins can `DELETE`.
- `archetype` column is only writable by `service_role` (enforced via a `BEFORE UPDATE` trigger that resets `NEW.archetype` to `OLD.archetype` unless `auth.role() = 'service_role'` or the caller is admin).

## 2. Client tracker

New module `src/lib/tracking/visitor.ts`:
- On first import: read/create `ff_visitor_id` in `localStorage`. Parse `window.location.search` for `utm_*` and store first-touch values in `localStorage` (`ff_first_touch`).
- `initVisitor()` upserts the `visitors` row (insert on miss, update `last_seen_at` + `last_path` + `session_count` on revisit) using the anon Supabase client.
- `track(eventName, metadata?)` inserts into `visitor_events` and increments `event_count` on the visitor row (best-effort, fire-and-forget, never blocks UI).
- `attachUser(userId)` runs after sign-in to set `visitors.user_id` so we can join sessions to the authenticated profile.

Wire-up:
- Call `initVisitor()` once from `src/main.tsx`.
- Add a tiny `RouteTracker` component mounted inside `<BrowserRouter>` in `src/App.tsx` that calls `track('page_view', { path })` on every location change.
- Call `attachUser(user.id)` from the existing auth state listener (likely in `src/hooks/useAuth*` or `Layout`).
- Fire targeted events from existing flows: `cta_click` on Landing primary CTAs, `signup_started` / `signup_completed` in `Auth.tsx`, `code_redeemed` after access-code redemption, `pricing_view` on `Pricing.tsx` mount, `checkout_started` when calling the checkout edge function, `checkout_completed` in `CheckoutReturn.tsx`.

All inserts are non-blocking and swallow errors so tracking failures never break the app.

## 3. Baseline pull from existing analytics

Before the new tracker has data, surface what we already have so the admin view isn't empty on day one:
- Use the existing `analytics--read_project_analytics` data source (production analytics) for the last 30 days and render it as a "baseline traffic" card in the admin view (page views per day, top paths). This is read-only fetch on page mount via a small wrapper edge function `analytics-baseline` if a client call isn't available, otherwise rendered from a static snapshot taken at build time. (I'll choose the edge function route to keep it live.)

## 4. Archetype computation

Derived, not user-selected. Computed in a Postgres function `public.compute_visitor_archetype(_visitor_id uuid)` that reads the visitor row + recent events and returns one label. Rules, evaluated top-down:

1. `paying` - has a `checkout_completed` event or linked `user_id` has an active subscription.
2. `code_redeemer` - has a `code_redeemed` event.
3. `signup_in_progress` - `signup_started` without `signup_completed` in last 7 days.
4. `pricing_considerer` - 2+ `pricing_view` events or `checkout_started` without completion.
5. `revenue_curious` - first_utm_campaign or landing path matches `/sales|/bd|/revenue/i`, OR clicked a Sales/BD-tagged CTA.
6. `policy_curious` - matches `/policy|/legal/i` on landing or CTA.
7. `returning_browser` - `session_count >= 3` and none of the above.
8. `new_visitor` - default.

Recompute paths:
- Trigger on `visitor_events` insert calls `compute_visitor_archetype` and writes back to `visitors.archetype` (SECURITY DEFINER, runs as service_role so the write-protection trigger lets it through).
- One-time backfill at the end of the migration.

## 5. Admin view `/admin/archetypes`

New page `src/pages/AdminArchetypes.tsx`, lazy-loaded, mounted at `/admin/archetypes` inside `<Layout requireAdmin>`. Add a link in `Admin.tsx`.

Contents:
- KPI row: total visitors, last 24h, last 7d, signed-in conversion rate.
- Archetype breakdown: bar chart + table with count, % of total, 7d delta per archetype (uses existing `recharts`).
- Top sources: grouped by `first_utm_source` / `first_referrer`.
- Top landing paths.
- Baseline analytics card from section 3.
- Recent events stream (last 50, auto-refresh every 30s).

All data via direct Supabase queries gated by the admin RLS policies.

## 6. Out of scope

- No visitor-facing UI. No cookie banner changes; we store only a random UUID + first-touch UTM in `localStorage`, which is functional analytics, not advertising.
- No PII capture (no IP, no email beyond the linked `user_id`).
- No edits to existing analytics dashboards beyond surfacing the baseline card.

## Technical notes

- Files added: `supabase/migrations/<ts>_archetype_tracking.sql`, `src/lib/tracking/visitor.ts`, `src/components/RouteTracker.tsx`, `src/pages/AdminArchetypes.tsx`, optional `supabase/functions/analytics-baseline/index.ts`.
- Files touched: `src/main.tsx`, `src/App.tsx`, `src/pages/Auth.tsx`, `src/pages/Pricing.tsx`, `src/pages/CheckoutReturn.tsx`, `src/pages/Landing.tsx` (CTA event), access-code redemption hook, `src/pages/Admin.tsx` (nav link).
- Tracking is best-effort: every call wrapped in try/catch, no awaits block render.
