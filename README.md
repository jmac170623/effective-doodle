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
  density style per tone profile.
- **Preview + feedback loop** (`/preview/[id]`, owner-only) — renders the
  generated site and lets the owner describe what they don't like in plain
  English; a rule-based adjuster (`lib/feedback.ts`) shifts tone, colors, copy
  length, or section emphasis in response, across multiple rounds.
- **My Sites** (`/sites`) — every account's dashboard-lite: lists their sites
  (draft or published) with links back into preview or the live page.
- **Publish** — freezes the site and exposes it at a clean public URL
  (`/site/[id]`) with no visible edit affordances.

Out of scope for now (follow-up work): the full post-launch content-editing
dashboard, quoting tool, and merchant/materials integration. The data model
(`lib/types.ts`) leaves room for these — e.g. `ServiceItem.priceFrom`/`unit`
are defined but unused, and every site is keyed by a stable `siteId` a future
quoting or merchant module can reference.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- **Supabase** for auth (email/password) and Postgres storage. Row Level
  Security enforces ownership at the database level: a signed-in user can only
  read/edit their own draft sites; published sites are publicly readable;
  anyone can submit a contact-form lead, but only the site's owner can read
  the leads it collected. See `supabase/migrations/0001_init.sql`.
- The contact form POSTs to a mock `/api/contact` endpoint that stores the
  lead in the `leads` table (no real email/CRM delivery yet).

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
