import { NextRequest, NextResponse } from "next/server";
import { consumeAnimationCredit, getSite, insertSiteAnimation, listHeroStages, listSiteAnimations, updateSiteAnimationStatus } from "@/lib/db";
import { checkAnimationEligibility } from "@/lib/animationLimits";
import { animateHeroTransformation } from "@/lib/higgsfieldAnimator";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";

// Generates one transformation video across the site's ordered hero stage
// photos (see /api/sites/[id]/animations for the single-photo equivalent).
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

  let result;
  try {
    result = await animateHeroTransformation(stages.map((s) => s.url));
  } catch (error) {
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    console.error(`Hero transformation failed for site ${id}:`, error);
    const message = error instanceof Error ? error.message : "Hero transformation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result) {
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    return NextResponse.json(
      { error: "Animation isn't set up yet — check back once this is configured." },
      { status: 503 }
    );
  }

  await updateSiteAnimationStatus(supabase, { id: animationId, status: "completed", videoUrl: result.videoUrl });
  if (eligibility.usesCredit) {
    await consumeAnimationCredit(supabase, id, site.animationCredits);
  }

  return NextResponse.json({ ok: true, videoUrl: result.videoUrl });
}
