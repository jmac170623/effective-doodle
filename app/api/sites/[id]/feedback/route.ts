import { NextRequest, NextResponse } from "next/server";
import { getSite, updateSite } from "@/lib/db";
import { applyFeedback } from "@/lib/feedback";
import { generateId } from "@/lib/idGen";
import { FeedbackRound } from "@/lib/types";
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
  if (site.status === "published") {
    return NextResponse.json({ error: "This site is already published." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
  }

  const { generated, toneProfile, summary } = applyFeedback(
    site.onboarding,
    site.generated,
    site.generated.toneProfile,
    message
  );

  const round: FeedbackRound = {
    id: generateId("fb"),
    createdAt: new Date().toISOString(),
    message,
    adjustmentsSummary: summary,
  };

  const updated = {
    ...site,
    generated: { ...generated, toneProfile },
    feedbackHistory: [...site.feedbackHistory, round],
    updatedAt: new Date().toISOString(),
  };

  await updateSite(supabase, updated);

  return NextResponse.json(updated);
}
