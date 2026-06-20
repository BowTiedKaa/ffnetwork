# Fix: "See pricing" should work without logging in

## Problem
The landing page's "See pricing" button and footer link both point to `/pricing`. That route is wrapped in `Layout`, which force-redirects unauthenticated visitors to `/auth`. So clicking "See pricing" from the landing page bounces people to the login screen.

The Pricing page itself already handles signed-out users (the subscribe button degrades to "Sign in to subscribe"), so the only thing blocking public access is the Layout auth gate.

## Goal
- Visitors arriving from the landing page can read the full pricing details without signing in.
- Signed-in users still see Pricing inside the normal app chrome (sidebar, billing portal button, "You have Pro" banner, etc.) exactly as today.
- Clicking a plan when signed out routes the user to `/auth` and returns them to `/pricing` after login.

## Changes

1. **`src/components/Layout.tsx`** - add an `allowAnonymous` prop.
   - When `true` and there is no session, do not redirect to `/auth`. Instead render a lightweight public shell: top bar with the Former Fed logo, a "Sign in" button, and the page content; minimal footer matching Landing. No sidebar.
   - When a session exists, behavior is unchanged (full authenticated chrome).
   - `requireAdmin` keeps precedence; `allowAnonymous` is ignored if `requireAdmin` is set.

2. **`src/App.tsx`** - pass `allowAnonymous` on the `/pricing` route only.
   ```tsx
   <Route path="/pricing" element={<Layout allowAnonymous><Pricing /></Layout>} />
   ```

3. **`src/pages/Pricing.tsx`** - small CTA tweak so signed-out users have a path forward.
   - Change the disabled "Sign in to subscribe" button to an enabled button that does `navigate("/auth?redirect=/pricing")`.
   - No other content changes; the plans, features list, and JSON-LD stay exactly as they are.

4. **Auth redirect support** (only if not already wired): confirm `/auth` honors a `?redirect=` query param and sends the user there after successful sign-in. If it doesn't, add that small bit so the flow lands back on `/pricing`.

## Out of scope
- No pricing copy/design changes.
- No changes to Stripe checkout, billing portal, or Pro detection logic.
- No new routes; `/pricing` remains the single source of truth.

## Verification
- Signed out: click "See pricing" on landing -> `/pricing` renders with plans visible, public top bar, no redirect to `/auth`.
- Signed out: click a plan -> lands on `/auth`, sign in, returns to `/pricing` with the authed chrome and embedded checkout.
- Signed in: `/pricing` looks identical to today (sidebar, Pro banner if applicable, Subscribe button works).
