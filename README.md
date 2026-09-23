# Trade Website Generator

Generates a custom, working website for a tradesperson from a short onboarding
questionnaire — including a "personality quiz" that drives the copy and visual
style of the generated site.

## What's implemented

- **Accounts** (`/signup`, `/login`) — Supabase-backed email/password auth.
  Every generated site belongs to the account that created it.
- **Onboarding questionnaire** (`/onboarding`, signed-in only) — a multi-step
  wizard collecting basic info, contact details, a repeatable services list, a
  free-text "About" field, and a 4-question personality quiz.
- **Tone profile mapping** (`lib/toneProfiles.ts`) — scores quiz answers into
  one of four tone profiles: Friendly, No-Nonsense, Premium/Detail-Oriented,
  Approachable.
- **Site generation engine** (`lib/siteGenerator.ts`, `lib/styleTokens.ts`) —
  produces hero/about/services/gallery/contact copy and a distinct color/font/
  density style per tone profile. Copy is written by Claude
  (`lib/aiCopywriter.ts`) from the onboarding answers — including two optional
  "proud moment" / "unique fact" questions that give it real material to work
  with — so two businesses with the same tone read differently instead of
  filling in the same template. If `ANTHROPIC_API_KEY` isn't set or the call
  fails for any reason, generation falls back to the deterministic template
  copy automatically.
- **Answer proofreading** (`lib/textCleanup.ts`) — before a site is
  generated or a dashboard edit is regenerated, Claude corrects spelling,
  punctuation, and capitalization in the free-text onboarding answers
  (name, business name, trade, area, about text, proud moment/unique fact,
  service names/descriptions, one-word descriptor) — never their meaning,
  voice, or an intentionally stylized business name. Falls back to the
  answers as typed if `ANTHROPIC_API_KEY` isn't set or the call fails.
  Contact details and social links aren't touched by this — they're
  format-validated separately (`lib/validateOnboarding.ts`).
- **Preview + AI feedback loop** (`/preview/[id]`, owner-only) — renders the
  generated site and lets the owner describe what they don't like in plain
  English. Claude (`lib/aiFeedback.ts`) interprets the feedback and decides
  what to change — tone, colors, motion, section emphasis, or specific copy
  fields — across multiple rounds. Each site gets 5 free AI edits, then a
  one-time Stripe payment buys more (`lib/editLimits.ts`). If
  `ANTHROPIC_API_KEY` isn't set or the call fails, falls back to a rule-based
  keyword adjuster (`lib/feedback.ts`) so feedback never just does nothing.
- **My Sites** (`/sites`) — every account's dashboard-lite: lists their sites
  (draft or published) with links back into preview or the live page, and a
  **Delete** option (also available inside `/manage/[id]`'s danger zone).
  Deleting a site cancels its Stripe subscription first if one's active,
  removes its gallery/hero-stage photos from storage, then deletes the
  site row — everything else (images, hero stages, animations, quotes,
  leads) cascades in Postgres. Irreversible; confirmed before it runs.
- **Instant quote calculator** — every generated site gets a "Get an Instant
  Quote" section backed by a shared materials catalog (`materials` table,
  currently placeholder-branded pricing — see `lib/quoteCategories.ts` and
  `lib/quoteEngine.ts`). Not every job is a floor area: each section a
  visitor adds picks its own measurement — **area** (m²), **volume** (m³,
  entered as area × depth in mm since guessing cubic metres directly isn't
  realistic), **length** (linear metres, for pipe/cable/fencing runs), or
  **count** (fixtures/fittings) — and each material in the catalog is
  tagged with which of those it actually scales against
  (`materials.measure_kind`), so a plumbing quote is no longer estimated
  off a made-up room size. A visitor picks a service, adds a section per
  part of the job, and gets a real itemized estimate (materials + labour);
  requests are recomputed server-side and stored in `quotes`.
- **Publish is billing-gated** — publishing a site requires an active £35/mo
  Stripe subscription for that specific site (`lib/stripe.ts`,
  `app/api/webhooks/stripe/route.ts`). The Stripe webhook is the source of
  truth: it flips a site to `published` on successful checkout and back to
  `draft` if the subscription lapses.
- **Custom domains** — a real onboarding question ("Do you have a domain?")
  and a matching manage-dashboard section (`lib/vercelDomains.ts`, the
  `/api/sites/[id]/domain*` routes, `proxy.ts`) let an owner either connect
  a domain they already own, or buy a new one, using Vercel's real Domains
  Registrar REST API — not a placeholder. Once a domain is `active`,
  `proxy.ts` transparently rewrites requests on that hostname to the site's
  page (multi-tenant routing on a single deployment), and a request to an
  unrecognized custom domain gets a "not connected" page rather than
  accidentally serving this app's own marketing homepage.
  - **Connect a domain you own** — free; attaches it to the Vercel project
    (`addDomainToProject`) and shows the DNS record(s) to add if it isn't
    already verified.
  - **Buy a domain** (real money) — the customer pays via Stripe (domain
    cost + `DOMAIN_MARKUP_PERCENT`, default 30%, charged in USD since
    Vercel's registrar always quotes in USD), then the Stripe webhook buys
    the domain for real via Vercel's registrar and attaches it — see
    `handleDomainPurchase` in `app/api/webhooks/stripe/route.ts`. **The
    money flow**: the customer's Stripe payment goes to your own Stripe
    account; the actual domain purchase is a *separate* charge against
    whatever card is on file for the Vercel account `VERCEL_API_TOKEN`
    belongs to — i.e. buying a domain for a customer spends real money
    from your own Vercel account every time, and the markup is what you
    earn on top of that cost. If the Vercel purchase fails after the
    Stripe charge succeeds, the customer is refunded automatically
    (`refundDomainPurchase`) rather than left paying for nothing — verify
    that behavior with a real end-to-end test before relying on it.
    Domain registration legally requires WHOIS registrant details (name,
    address, email, phone), collected in the purchase form and sent
    straight to the registrar, not stored beyond the `domain_purchases`
    audit row. **Real constraint found during development**: Vercel's
    registrar doesn't support UK ccTLDs — `.uk` and `.co.uk` both return
    `tld_not_supported` — so a UK tradesperson wanting a `.co.uk` has to
    buy it elsewhere and use "connect a domain you own" instead; `.com`,
    `.net`, `.org` and most other endings work fine.
  - Needs `VERCEL_API_TOKEN` (a full-account token — domain purchases need
    more scope than project management alone), `VERCEL_PROJECT_ID`, and
    usually `VERCEL_TEAM_ID` (see `.env.example`) to do anything; without
    them, connect/purchase calls fail with a clear error rather than
    silently pretending to work.

- **Photo-to-video animation** — the manage dashboard has an "Animate this
  photo" button per uploaded photo, gated at 3 free animations per site then
  a one-time Stripe credit (`lib/animationLimits.ts`,
  `app/api/sites/[id]/animations`), and the public site renders a completed
  animation as a looping video instead of a static image. The Higgsfield API
  call (`lib/higgsfieldAnimator.ts#animatePhoto`) is real — it calls
  `minimax/h3/image-to-video` via the `@higgsfield/client` SDK and needs a
  real `HF_CREDENTIALS` value (see `.env.example`) to run; without it,
  generation is skipped gracefully and the static photo is kept.
- **Hero "main display image" + staged transformation (UI wired, animation
  still a placeholder)** — a dedicated onboarding question (and matching
  manage dashboard section) collects ordered "stage" photos (before/during/
  after) for one showcase job, stored in `site_hero_stages`. The last stage
  renders full-bleed as the homepage's hero background. `app/api/sites/[id]/
  hero-animation` uses the same animation cap/credits as gallery photos to
  generate one transformation video across the stages
  (`lib/higgsfieldAnimator.ts#animateHeroTransformation` — still a documented
  placeholder: the multi-image input field name for a `minimax/h3`-style
  multi-stage/keyframes call hasn't been confirmed against a real code
  sample yet, so it deliberately returns null rather than guess on a one-shot
  generation; `animatePhoto` above is fully implemented). Once a
  video exists, `HeroScrubVideo` binds its playback position to scroll
  progress, so scrolling visually advances through the job's phases instead
  of autoplaying. Checked live against Higgsfield's model catalog:
  `minimax_h3` is the cheapest model that supports start/end-frame
  transformation — **30 credits** per hero animation (15s at 2K, its
  actual maximum duration, since up to 4 stage photos need real time each
  to register and this only ever runs once per site) and **10 credits**
  per single gallery photo animation (5s at 2K, up to 3 free per site).
  Worst case, a single site using every free slot costs **60 credits**
  (1 hero + 3 gallery) — so the $19/mo Starter plan (270 credits) covers
  roughly 4-5 sites/month at full free-tier usage, not a large number once
  you have real customer volume; budget for Plus ($59/mo, 1,200 credits,
  ~20 sites/month at full usage) once traction picks up.

Out of scope for now (follow-up work): the full post-launch content-editing
dashboard. The data model (`lib/types.ts`) leaves room for it — every site
is keyed by a stable `siteId`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- **Supabase** for auth (email/password) and Postgres storage. Row Level
  Security enforces ownership at the database level: a signed-in user can only
  read/edit their own draft sites; published sites are publicly readable;
  anyone can submit a contact-form lead, but only the site's owner can read
  the leads it collected. See `supabase/migrations/0001_init.sql`.
- The contact form POSTs to a mock `/api/contact` endpoint that stores the
  lead in the `leads` table (no real email/CRM delivery yet).
- **Stripe** for the per-site publishing retainer (subscriptions, Checkout,
  webhooks). Not wired to a real product catalog beyond the one `Site
  Retainer` price.

## Setting it up (Supabase + local dev)

You'll need a free [Supabase](https://supabase.com) account — this project
has no account provisioned yet, so these steps are one-time setup.

1. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard/projects) (pick any name/region — the free tier is enough to run this).
2. **Run the schema migration.** In the Supabase dashboard, open **SQL Editor** → **New query**, paste the contents of `supabase/migrations/0001_init.sql`, and run it. This creates the `sites` and `leads` tables and their Row Level Security policies.
3. **Turn off email confirmation for faster local testing (optional).** In **Authentication → Providers → Email**, you can disable "Confirm email" so `signUp` logs the user in immediately instead of waiting on a confirmation email. Leave it on for production.
4. **Get your API keys.** In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
5. **Add them locally:**
   ```bash
   cp .env.example .env.local
   # then edit .env.local and paste in the two values from step 4
   ```
6. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000), sign up, and walk
through the questionnaire.

## Deploying (Vercel)

1. Push this repo to GitHub (already done if you're reading this from the
   repo) and import it into [Vercel](https://vercel.com/new).
2. In the Vercel project's **Settings → Environment Variables**, add the same
   two variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — they're safe to expose client-side, they
   are scoped by Row Level Security, not secrecy.
3. In Supabase, under **Authentication → URL Configuration**, add your Vercel
   deployment URL (and `https://your-domain.com/auth/callback` under Redirect
   URLs) so email confirmation links redirect back to the live site instead of
   `localhost`.
4. Deploy. No build configuration changes are needed — this is a standard
   Next.js app with no native dependencies, so it runs on Vercel's serverless
   functions without modification.

## Setting up Stripe billing

1. **Run the new migrations** (`0002_materials.sql` through `0008_hero_stages.sql`,
   in order, in the Supabase SQL editor) if you haven't already.
2. **Create a Price in Stripe**: Dashboard → Product catalog → add a product
   (e.g. "Site Retainer") with a recurring monthly price. Copy its Price ID
   (`price_...`).
3. **(Optional) Create two more one-off Prices** for the pay-as-you-go
   credits: "Extra AI Edit" and "Extra Animation" (each a one-time price, not
   recurring). Only needed once someone actually hits the free caps
   (`lib/editLimits.ts`, `lib/animationLimits.ts`) — safe to skip for now.
4. **Get your Stripe secret key**: Dashboard → Developers → API keys → copy
   the **Secret key** (`sk_...`).
5. **Get your Supabase service-role key**: Supabase → Project Settings → API
   → copy the **service_role** secret (not the anon/publishable one — this
   one bypasses Row Level Security and must never be exposed client-side).
6. **Add the env vars** (locally in `.env.local`, and in Vercel → Settings →
   Environment Variables): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET` (from the next step),
   and — if you created them in step 3 — `STRIPE_EDIT_PRICE_ID` and
   `STRIPE_ANIMATION_PRICE_ID`.
7. **Register the webhook**: Stripe Dashboard → Developers → Webhooks → add
   endpoint → URL `https://<your-domain>/api/webhooks/stripe` → listen for
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy the endpoint's **Signing secret**
   (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## Setting up AI-written copy (optional)

Without this, every site still gets real, working copy from the built-in
template system — this step just makes the copy unique per business instead
of filled into a template.

1. **Get an API key**: [console.anthropic.com](https://console.anthropic.com)
   → **API Keys** → **Create Key**. This requires a funded Anthropic Console
   account (pay-as-you-go billing, separate from a claude.ai subscription).
2. **Add one env var** (locally in `.env.local`, and in Vercel → Settings →
   Environment Variables): `ANTHROPIC_API_KEY`.
3. Redeploy (or restart `npm run dev`). New sites — and any existing site
   that's edited or regenerated via feedback — will now get AI-written copy.
   If the key is missing or a request fails, generation silently falls back
   to the template copy, so this is always safe to leave unset.
