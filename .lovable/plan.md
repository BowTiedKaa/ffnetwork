
# Promotion plan for FF Network

## Where you are today (from your data)

- **Traffic (last 30 days):** ~37 unique visitors, 214 pageviews. Spikes only on days you (or Substack) posted.
- **Sources:** Direct (34), formerfed.substack.com (1), Gmail (1). **Zero organic search traffic.**
- **Top page:** `/auth` (34 hits) — visitors are landing on a login wall, not a pitch.
- **SEO authority:** 2/100 (Semrush). 95 referring domains, but most are spammy auto-directories. Only one real referrer: **substack.com**.
- **No organic keywords ranking** — Google doesn't really know what your site is about yet.

**Translation:** You don't have a promotion problem yet — you have a *front door* problem. Almost every visitor hits a login screen, and search engines have nothing to index.

## Strategy (fits "under $500/mo, organic-first")

Three plays in priority order. Do #1 before spending a dollar on anything else.

### 1. Build a public marketing landing page (highest ROI, free)

Right now `/` redirects to `/auth`. That's why direct traffic doesn't convert and search engines see nothing.

Add a real public homepage at `/` that:
- Explains the Former Fed methodology (federal → revenue tech roles)
- Shows the Warm/Cooling/Cold contact system and Pitch Builder
- Has a clear "Start free — 5 contacts" CTA and a "See pricing" link
- Includes testimonials/social proof from your Substack audience
- Keeps `/auth` for sign-in only

This single change unlocks SEO indexing, social sharing previews, and ad landing pages.

### 2. SEO content engine on your Substack + a `/blog` (free, compounding)

Your Substack already drives your only non-direct referral. Lean into it.

- Publish 2 posts/month targeting search terms federal employees actually type:
  - "how to leave federal government for tech"
  - "federal to tech sales transition"
  - "best tech jobs for former government employees"
  - "schedule F layoff what to do"
- Cross-post to a `/blog` on `notify.theformerfed.com` so *your* domain earns the authority (right now Substack does).
- Each post links to FF Network with a clear CTA.

I can run Semrush keyword research to pick the exact terms with real volume and low difficulty before you write.

### 3. Distribution: communities + warm channels (free, this week)

Your audience is concentrated and reachable:
- **r/fednews, r/govfire, r/SecurityClearance** — share helpful posts, not links
- **LinkedIn:** post 2x/week from your personal profile about the methodology; pin FF Network in your bio
- **Federal-transition Slack/Discord groups** (e.g., Tech Ladies for Gov, Elevate, Partnership for Public Service alumni)
- **Substack cross-promotions** with 2–3 adjacent newsletters (career, gov, layoff recovery)

### 4. Optional paid (only if budget allows after #1 ships)

- **$200/mo LinkedIn Ads** targeting job titles like "Foreign Service Officer", "GS-13/14/15", "Schedule C" → drive to the new landing page
- **$100/mo Reddit promoted posts** in r/fednews

Skip Google Ads until you have a landing page and SEO basics in place.

## What I'd build in the app (if you want)

If you approve, the actionable code work is:

1. **New public `Landing.tsx` page** at `/`, with `/auth` reachable via a "Sign in" button. Redirect signed-in users to `/dashboard`.
2. **`/blog` index + post route** (MDX or pulling from Substack RSS) so posts live on your domain.
3. **SEO polish on the landing page:** unique title, meta description, OG image, FAQ JSON-LD, H1 with your primary keyword.
4. **Tracking:** add UTM-friendly CTAs so you can tell which channel converts.

## What I'd do outside the app (you, not me)

- Pick 5 keywords (I can run Semrush to suggest them)
- Write/repurpose 4 Substack posts → cross-post to `/blog`
- Make 8 LinkedIn posts in 30 days
- Post helpfully in 3 subreddits/week (no link-dropping)

## 90-day targets (realistic for your starting point)

| Metric | Today | Day 30 | Day 90 |
|---|---|---|---|
| Monthly visitors | ~37 | 200 | 800 |
| Organic search visits | 0 | 20 | 150 |
| Sign-ups (free tier) | — | 15 | 60 |
| Pro conversions | — | 1–2 | 5–8 |

## Recommended first step

Approve this plan and I'll start with **#1: the public landing page**, since it unblocks everything else. After that we can sequence the blog and keyword research.
