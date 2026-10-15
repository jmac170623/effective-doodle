import { NextRequest, NextResponse } from "next/server";
import { getSite, listHeroStages, updateHeroStageVideo } from "@/lib/db";
import { animateHeroStageClip, HERO_STAGE_DURATION_SECONDS } from "@/lib/higgsfieldAnimator";
import { qaCheckHeroClip } from "@/lib/heroStageQA";
import { createClient } from "@/lib/supabase/server";

// A single regeneration (~2 minutes) comfortably fits in one request —
// unlike the full hero-animation route, this never needs the
// background-job/poll dance, since it's only ever one stage at a time.
export const maxDuration = 280;

function stagePosition(index: number, total: number): "start" | "middle" | "end" {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
}

// Regenerates exactly one hero stage's clip — never charged, and only
// allowed when the automated quality check (lib/heroStageQA.ts) actually
// flagged this specific clip. A business owner wanting a different take on
// a clip that already passed is a different, not-yet-built feature; this
// one exists specifically to make good on "one free attempt" when our own
// generation fell short, not to offer unlimited free regenerations.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const stageId = typeof body?.stageId === "string" ? body.stageId : "";
  if (!stageId) {
    return NextResponse.json({ error: "Missing stageId." }, { status: 400 });
  }

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
  const index = stages.findIndex((s) => s.id === stageId);
  if (index === -1) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }
  const stage = stages[index];

  if (!stage.videoUrl) {
    return NextResponse.json({ error: "This stage doesn't have a clip yet." }, { status: 400 });
  }
  if (stage.qaPassed !== false) {
    return NextResponse.json(
      { error: "This stage's clip already passed its quality check — it isn't eligible for a free regeneration." },
      { status: 400 }
    );
  }

  try {
    const result = await animateHeroStageClip(stage.url, stagePosition(index, stages.length), site.onboarding.trade);
    if (!result) {
      return NextResponse.json({ error: "Higgsfield is not configured." }, { status: 500 });
    }
    const qa = await qaCheckHeroClip(result.videoUrl, stage.url, HERO_STAGE_DURATION_SECONDS);
    await updateHeroStageVideo(supabase, stage.id, { videoUrl: result.videoUrl, qaPassed: qa.passed, qaNote: qa.note });

    return NextResponse.json({
      ok: true,
      stage: { id: stage.id, videoUrl: result.videoUrl, qaPassed: qa.passed, qaNote: qa.note ?? null },
    });
  } catch (error) {
    console.error(`Hero stage regeneration failed for site ${id}, stage ${stageId}:`, error);
    return NextResponse.json({ error: "Regeneration failed — please try again." }, { status: 500 });
  }
}
