import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { consumeAnimationCredit, getSite, insertSiteAnimation, listSiteAnimations, listSiteImages, updateSiteAnimationStatus } from "@/lib/db";
import { checkAnimationEligibility } from "@/lib/animationLimits";
import { animatePhoto } from "@/lib/higgsfieldAnimator";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Real Higgsfield generation + polling can run for minutes. 300 is the
// Hobby plan's hard ceiling for maxDuration (higher values are rejected at
// deploy time, not just runtime). Holding the HTTP response open that long
// is itself unreliable — confirmed live as "Failed to fetch": the browser/
// network drops a multi-minute silent connection well before any
// server-side timeout is reached. The response now returns immediately;
// the real work runs in the background via after() (Vercel's waitUntil),
// and the client polls for the result instead of waiting on this request.
export const maxDuration = 300;

async function generatePhotoAnimation(
  supabase: SupabaseClient,
  siteId: string,
  imageId: string,
  animationId: string,
  imageUrl: string,
  usesCredit: boolean,
  currentCredits: number
) {
  let result;
  try {
    result = await animatePhoto(imageUrl);
  } catch (error) {
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    console.error(`Animation failed for site ${siteId}, image ${imageId}:`, error);
    return;
  }

  if (!result) {
    // Not a customer-facing failure — Higgsfield isn't wired up yet (no
    // HF_CREDENTIALS configured). Don't charge a credit for an attempt that
    // could never have succeeded.
    await updateSiteAnimationStatus(supabase, { id: animationId, status: "failed" });
    return;
  }

  await updateSiteAnimationStatus(supabase, { id: animationId, status: "completed", videoUrl: result.videoUrl });
  if (usesCredit) {
    await consumeAnimationCredit(supabase, siteId, currentCredits);
  }
}

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

  after(() =>
    generatePhotoAnimation(supabase, id, imageId, animationId, image.url, eligibility.usesCredit, site.animationCredits)
  );

  return NextResponse.json({ ok: true, status: "processing", animationId });
}
