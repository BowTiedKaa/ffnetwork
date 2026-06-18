# Former Fed Math — standalone tool

**Tagline:** How much can you earn on the outside?

A free, no-login calculator that takes a fed's GS grade + background and shows realistic private-sector tech salary ranges and matching roles. Lives in its own Lovable project so it can grow independently of FF Network.

## Why standalone
- Own brand and domain (e.g. `formerfedmath.com`) — feels like a product, not a feature
- Can go viral on Reddit/LinkedIn without coupling to FF Network's roadmap
- Two equal CTAs at the bottom of every result: **Join FF Network (free)** and **Get the Gumroad guide**

## v1 scope (instant result, no DB)

Single-page flow, no backend required:

1. **Landing / hero** — headline, one-line pitch, "Calculate my number" button
2. **4-question form**
   - Current GS grade + step
   - Agency type (Defense / Civilian / IC / Independent)
   - Years of federal service
   - Skill cluster (multi-select: acquisition, policy, data, cyber, PM, engineering, comms, legal)
3. **Result screen (same page, scroll-to)**
   - Big number: estimated private-sector total comp range (base + bonus + equity)
   - "How we got there" breakdown (locality, GS-to-market multiplier, skill premium)
   - Top 3 matching tech roles with company examples and salary bands
   - Revenue vs. cost-center note (Sales/BD roles flagged as highest-leverage, per FF Network methodology)
   - **Two equal CTAs side by side:** FF Network signup + Gumroad link
4. **Footer** — "Built by The Former Fed" with link back to FF Network

No accounts, no database, no shareable URLs in v1. Everything runs client-side from a static dataset.

## Files to create

- `src/lib/salaryMath.ts` — pure calculator: GS+step+locality → base market comp, plus skill multipliers and role matching against a static role dataset (~25 roles with GS equivalency, salary bands, hiring company examples)
- `src/pages/Index.tsx` — hero + form + inline result (replaces default landing)
- `src/components/CalculatorForm.tsx` — the 4-question form
- `src/components/ResultCard.tsx` — number, breakdown, role matches, dual CTA
- `src/components/Cta.tsx` — reusable split CTA (FF Network | Gumroad) with UTM params

## Branding
- Name: **Former Fed Math**
- Voice: blunt, numbers-first, no jargon ("Your GS-14 is worth $X on the outside")
- Visual: clean, calculator-feel, distinct from FF Network's palette so they look like sibling products not the same site

I'll ask for color/font direction once you approve this plan.

## Distribution (after launch)
- Reddit r/fednews post: "I built a calculator for what your GS is worth in tech"
- LinkedIn carousel with sample results
- Link from FF Network landing as a free tool
- Gumroad product description links here as a "try the free calculator first"

## Out of scope for v1 (revisit later)
- Saved/shareable result URLs (would need DB + per-result OG images)
- AI-generated personalized advice
- Email capture / lead magnet
- Auth

## Technical notes
- New Lovable project, React + Vite + Tailwind + shadcn (same stack as FF Network)
- No Lovable Cloud needed in v1 — fully static
- SEO: unique title/description, JSON-LD `WebApplication`, canonical, sitemap.xml with `/`
- UTMs on both CTAs: `?utm_source=formerfedmath&utm_medium=tool&utm_campaign=result`

## What I need from you before building
1. Create the new Lovable project (I can't spawn one from here — use "New project" in your workspace, then open this plan there or paste it in)
2. Your Gumroad product URL for the CTA
3. Confirm the role dataset can be hand-curated (~25 roles) vs. pulled from a source
