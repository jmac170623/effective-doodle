import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  consumeAnimationCredit,
  getSite,
  insertSiteAnimation,
  listHeroStages,
  listSiteAnimations,
  updateHeroStageVideo,
  updateSiteAnimationStatus,
} from "@/lib/db";
import { checkAnimationEligibility } from "@/lib/animationLimits";
import { animateHeroStageClip } from "@/lib/higgsfieldAnimator";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";
import { HeroStage } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Stage clips generate with limited concurrency (see MAX_CONCURRENT_HIGGSFIELD_JOBS
// below), each involving a real Higgsfield generation + polling that can
// take minutes. 300 is the Hobby plan's hard ceiling for maxDuration (higher
// values are rejected at deploy time, not just runtime) — see the ceiling
// comment in lib/higgsfieldAnimator.ts.
// Holding the HTTP response open for that long is itself unreliable:
// confirmed live as "Failed to fetch" — the browser/network drops a
// multi-minute silent connection well before any server-side timeout is
// even reached. The response now returns immediately; the actual work runs
// in the background via after() (Vercel's waitUntil), and the client polls
// site_hero_stages for the result instead of waiting on this request.
export const maxDuration = 300;

function stagePosition(index: number, total: number): "start" | "middle" | "end" {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
}

async function generateHeroClips(
  supabase: SupabaseClient,
  siteId: string,
  animationId: string,
  stages: HeroStage[],
  usesCredit: boolean,
  currentCredits: number,
  trade: string
) {
  // This account's real, confirmed ceiling is 2 concurrent minimax_h3 jobs —
  // tested live: submitting a 3rd generate_video call while 2 were still
  // in_progress returned 429 "rate_limit_reached" every time, repeatedly,
  // over more than a minute; it only succeeded the instant one of the two
  // finished and freed a slot. This — not prompt content, not credits — is
  // the actual cause behind this feature's long history of failures: it
  // always submitted all of a site's stage clips at once, and sites with 3+
  // stages always exceeded the cap. Individual generations are also fast in
  // practice (~2 minutes each here), so running at most 2 at a time and
  // starting the next the moment a slot frees up still comfortably fits the
  // 300s maxDuration ceiling — true sequential (1 at a time) would not.
  //
  // Promise.all would also surface only the first rejection and silently
  // discard the outcome of the other (possibly successful) generations —
  // on a real failure there'd be no way to tell which stage failed, or
  // whether it was one stage or all of them. This keeps every outcome.
  const MAX_CONCURRENT_HIGGSFIELD_JOBS = 2;

  async function generateOneClip(stage: HeroStage, index: number): Promise<{ stage: HeroStage; videoUrl: string }> {
    const result = await animateHeroStageClip(stage.url, stagePosition(index, stages.length), trade);
    if (!result) throw new Error("Higgsfield not configured (no HF_CREDENTIALS).");
    return { stage, videoUrl: result.videoUrl };
  }

  const results: PromiseSettledResult<{ stage: HeroStage; videoUrl: string }>[] = new Array(stages.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    const index = nextIndex++;
    if (index >= stages.length) return;
    try {
      results[index] = { status: "fulfilled", value: await generateOneClip(stages[index], index) };
    } catch (reason) {
      results[index] = { status: "rejected", reason };
    }
    return worker();
  }
  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT_HIGGSFIELD_JOBS, stages.length) }, () => worker())
  );
  const settled = results;

  const failedIndexes = settled
    .map((s, index) => ({ s, index }))
    .filter((r): r is { s: PromiseRejectedResult; index: number } => r.s.status === "rejected");
  if (failedIndexes.length > 0) {
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    failedIndexes.forEach(({ s, index }) =>
      console.error(`Hero stage animation failed for site ${siteId} (stage ${index} of ${stages.length}):`, s.reason)
    );
    return;
  }

  const completedClips = (settled as PromiseFulfilledResult<{ stage: HeroStage; videoUrl: string }>[]).map(
    (s) => s.value
  );
  try {
    await Promise.all(completedClips.map((c) => updateHeroStageVideo(supabase, c.stage.id, c.videoUrl)));
  } catch (error) {
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    console.error(`Failed to save hero stage clips for site ${siteId}:`, error);
    return;
  }

  await updateSiteAnimationStatus(supabase, { id: animationId, status: "completed" });
  if (usesCredit) {
    await consumeAnimationCredit(supabase, siteId, currentCredits);
  }
}

// Generates an independent animated clip for each of the site's ordered
// hero stage photos (see /api/sites/[id]/animations for the equivalent on
// a single gallery photo). All-or-nothing: if any stage's clip fails, none
// are saved — a hero animation half-populated with clips would look worse
// than the static fallback slideshow it replaces.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const stages = await listHeroStages(supabase, id);
  if (stages.length < 2) {
    return NextResponse.json({ error: "Add at least two stage photos (e.g. before and after) to generate a transformation." }, { status: 400 });
  }

  const existingAnimations = await listSiteAnimations(supabase, id);

  // One-shot by design: a hero transformation is a single deliberate,
  // premium generation per site, not something to regenerate on a whim (and
  // regenerating would burn a credit each time). Once one exists — even a
  // still-processing one — further requests are refused outright.
  const existingHero = existingAnimations.find((a) => a.isHero && a.status !== "failed");
  if (existingHero) {
    return NextResponse.json(
      { error: "This site's hero animation has already been generated — it can only be created once." },
      { status: 409 }
    );
  }

  const eligibility = checkAnimationEligibility(existingAnimations, site.animationCredits);
  if (!eligibility.allowed) {
    return NextResponse.json(
      { error: "You've used all your free animations for this site. Buy more to generate the hero transformation.", animationCapReached: true },
      { status: 402 }
    );
  }

  const animationId = generateId("anim");
  await insertSiteAnimation(supabase, { id: animationId, siteId: id, isHero: true, usedCredit: eligibility.usesCredit });

  after(() =>
    generateHeroClips(supabase, id, animationId, stages, eligibility.usesCredit, site.animationCredits, site.onboarding.trade)
  );

  return NextResponse.json({ ok: true, status: "processing", animationId });
}
