import { NextRequest, NextResponse } from "next/server";
import { getSite, listSiteAnimations, listSiteImages, updateSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { validateOnboardingPatch } from "@/lib/validateOnboarding";
import { generateSite } from "@/lib/siteGenerator";
import { ToneProfileId } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS scopes this to the caller's own sites plus any published site.
  const site = await getSite(supabase, id);
  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  const [images, animations] = await Promise.all([
    listSiteImages(supabase, id),
    listSiteAnimations(supabase, id),
  ]);
  return NextResponse.json({ ...site, images, animations });
}

const VALID_TONES: ToneProfileId[] = ["friendly", "no-nonsense", "premium", "approachable"];

export async function PATCH(
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
  const result = validateOnboardingPatch(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const requestedTone = body?.toneProfile;
  const toneProfile: ToneProfileId = VALID_TONES.includes(requestedTone)
    ? requestedTone
    : site.generated.toneProfile;

  const updatedOnboarding = { ...site.onboarding, ...result.data };
  const regenerated = await generateSite(updatedOnboarding, toneProfile);

  const updated = {
    ...site,
    onboarding: updatedOnboarding,
    generated: {
      ...regenerated,
      // Preserve prior feedback-driven customizations across a content edit.
      style: { ...regenerated.style, motion: site.generated.style.motion },
      emphasis: site.generated.emphasis,
    },
    updatedAt: new Date().toISOString(),
  };

  await updateSite(supabase, updated);

  return NextResponse.json(updated);
}
