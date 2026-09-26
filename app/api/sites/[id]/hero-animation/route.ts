import { NextRequest, NextResponse } from "next/server";
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

// Three stage clips generate concurrently (see Promise.all below), each
// involving a real Higgsfield generation + polling — the route was hitting
// Vercel's default function timeout and getting killed mid-flight, leaving
// the animation row stuck in "processing" forever with no error surfaced.
// Matches animateHeroStageClip's own poll ceiling (480s, applies per clip
// but they run concurrently) plus headroom for the surrounding DB calls.
export const maxDuration = 520;

function stagePosition(index: number, total: number): "start" | "middle" | "end" {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
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

  let clips: ({ stage: HeroStage; videoUrl: string } | null)[];
  try {
    clips = await Promise.all(
      stages.map(async (stage, index) => {
        const result = await animateHeroStageClip(stage.url, stagePosition(index, stages.length));
        return result ? { stage, videoUrl: result.videoUrl } : null;
      })
    );
  } catch (error) {
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    console.error(`Hero stage animation failed for site ${id}:`, error);
    const message = error instanceof Error ? error.message : "Hero animation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (clips.some((c) => c === null)) {
    // Not configured (no HF_CREDENTIALS) — every clip resolves to null
    // together, never a mix, so this can only be the "not set up" case.
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    return NextResponse.json(
      { error: "Animation isn't set up yet — check back once this is configured." },
      { status: 503 }
    );
  }

  const completedClips = clips as { stage: HeroStage; videoUrl: string }[];
  await Promise.all(completedClips.map((c) => updateHeroStageVideo(supabase, c.stage.id, c.videoUrl)));
  await updateSiteAnimationStatus(supabase, { id: animationId, status: "completed" });
  if (eligibility.usesCredit) {
    await consumeAnimationCredit(supabase, id, site.animationCredits);
  }

  return NextResponse.json({
    ok: true,
    stages: completedClips.map((c) => ({ id: c.stage.id, videoUrl: c.videoUrl })),
  });
}
