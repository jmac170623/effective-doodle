# Trade Website Generator (Phase 1 MVP)

Generates a custom, working website for a tradesperson from a short onboarding
questionnaire — including a "personality quiz" that drives the copy and visual
style of the generated site.

## What's implemented

- **Onboarding questionnaire** (`/onboarding`) — a multi-step wizard collecting
  basic info, contact details, a repeatable services list, a free-text "About"
  field, and a 4-question personality quiz.
- **Tone profile mapping** (`lib/toneProfiles.ts`) — scores quiz answers into
  one of four tone profiles: Friendly, No-Nonsense, Premium/Detail-Oriented,
  Approachable.
- **Site generation engine** (`lib/siteGenerator.ts`, `lib/styleTokens.ts`) —
  produces hero/about/services/gallery/contact copy and a distinct color/font/
  density style per tone profile.
- **Preview + feedback loop** (`/preview/[id]`) — renders the generated site
  and lets the owner describe what they don't like in plain English; a
  rule-based adjuster (`lib/feedback.ts`) shifts tone, colors, copy length, or
  section emphasis in response, across multiple rounds.
- **Publish** — freezes the site and exposes it at a clean public URL
  (`/site/[id]`) with no visible edit affordances.

Out of scope for this phase (follow-up prompts): the post-launch `/dashboard`
editing area, quoting tool, and merchant/materials integration. The data model
(`lib/types.ts`) leaves room for these — e.g. `ServiceItem.priceFrom`/`unit`
are defined but unused, and every generated site is keyed by a stable `siteId`
that a future quoting or merchant module can reference.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- SQLite (`better-sqlite3`) for storage — a single `sites` table holding the
  onboarding answers, generated content, and feedback history as JSON, plus a
  `leads` table for contact form submissions
- The contact form POSTs to a mock `/api/contact` endpoint that stores the
  lead locally (no real email/CRM delivery yet)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Build My
Website**, and walk through the questionnaire. The SQLite database is created
at `data/app.db` on first run (git-ignored).
