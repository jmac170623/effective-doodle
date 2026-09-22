import { NextRequest, NextResponse } from "next/server";
import { deleteSite, getSite, listHeroStages, listSiteAnimations, listSiteImages, updateSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOnboardingPatch } from "@/lib/validateOnboarding";
import { generateSite } from "@/lib/siteGenerator";
import { correctOnboardingText } from "@/lib/textCleanup";
import { cancelSiteSubscription } from "@/lib/stripe";
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
  const [images, animations, heroStages] = await Promise.all([
    listSiteImages(supabase, id),
    listSiteAnimations(supabase, id),
    listHeroStages(supabase, id),
  ]);
  return NextResponse.json({ ...site, images, animations, heroStages });
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

  const mergedOnboarding = { ...site.onboarding, ...result.data };
  const updatedOnboarding = await correctOnboardingText(mergedOnboarding);
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

export async function DELETE(
  _request: NextRequest,
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

  // Stop billing before anything else — a deleted site should never keep
  // charging the customer.
  if (site.stripeSubscriptionId && (site.billingStatus === "active" || site.billingStatus === "past_due")) {
    try {
      await cancelSiteSubscription(site.stripeSubscriptionId);
    } catch (error) {
      console.error("Failed to cancel Stripe subscription before deleting site:", error);
      return NextResponse.json(
        { error: "Couldn't cancel this site's subscription. Please try again, or contact support." },
        { status: 500 }
      );
    }
  }

  // Use the service-role client for the actual deletion: storage RLS for
  // gallery photos checks site ownership via a join against the sites
  // table, which would already be gone by the time cascade deletes fire if
  // we deleted with the caller's own session instead.
  const admin = createAdminClient();

  try {
    const { data: files } = await admin.storage.from("gallery").list(id);
    if (files && files.length > 0) {
      await admin.storage.from("gallery").remove(files.map((f) => `${id}/${f.name}`));
    }
  } catch (error) {
    // Best-effort — an orphaned storage object shouldn't block deleting the site record.
    console.error("Failed to clean up storage for deleted site:", error);
  }

  try {
    await deleteSite(admin, id);
  } catch (error) {
    console.error(`Failed to delete site ${id}:`, error);
    const message = error instanceof Error ? error.message : "Failed to delete this site.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
