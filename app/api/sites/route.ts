import { NextRequest, NextResponse } from "next/server";
import { validateOnboarding } from "@/lib/validateOnboarding";
import { computeToneProfile } from "@/lib/toneProfiles";
import { generateSite } from "@/lib/siteGenerator";
import { insertSite } from "@/lib/db";
import { generateId } from "@/lib/idGen";
import { SiteRecord } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to build a website." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = validateOnboarding(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const toneProfile = computeToneProfile(result.data.quiz);

  try {
    const generated = await generateSite(result.data, toneProfile);
    const now = new Date().toISOString();

    const record: SiteRecord = {
      id: generateId("site"),
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
      status: "draft",
      onboarding: result.data,
      generated,
      feedbackHistory: [],
      billingStatus: "unpaid",
      animationCredits: 0,
      editCredits: 0,
    };

    await insertSite(supabase, record);

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) {
    console.error("Site generation failed:", error);
    const message = error instanceof Error ? error.message : "Something went wrong generating your site.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
