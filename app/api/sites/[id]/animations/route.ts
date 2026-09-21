import { NextRequest, NextResponse } from "next/server";
import { consumeAnimationCredit, getSite, insertSiteAnimation, listSiteAnimations, listSiteImages, updateSiteAnimationStatus } from "@/lib/db";
import { checkAnimationEligibility } from "@/lib/animationLimits";
import { animatePhoto } from "@/lib/higgsfieldAnimator";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";

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

  const body = await request.json().catch(() => null);
  const imageId = typeof body?.imageId === "string" ? body.imageId : "";
  const images = await listSiteImages(supabase, id);
  const image = images.find((i) => i.id === imageId);
  if (!image) {
    return NextResponse.json({ error: "Photo not found." }, { status: 400 });
  }

  const existingAnimations = await listSiteAnimations(supabase, id);
  const eligibility = checkAnimationEligibility(existingAnimations, site.animationCredits);
  if (!eligibility.allowed) {
    return NextResponse.json(
      { error: "You've used all your free animations for this site. Buy more to animate another photo.", animationCapReached: true },
      { status: 402 }
    );
  }

  const animationId = generateId("anim");
  await insertSiteAnimation(supabase, { id: animationId, siteId: id, imageId, usedCredit: eligibility.usesCredit });

  const result = await animatePhoto(image.url);

  if (!result) {
    // Not a customer-facing failure — Higgsfield isn't wired up yet. Don't
    // charge a credit for an attempt that could never have succeeded.
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
