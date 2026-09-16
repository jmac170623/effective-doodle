import { NextRequest, NextResponse } from "next/server";
import { validateOnboarding } from "@/lib/validateOnboarding";
import { computeToneProfile } from "@/lib/toneProfiles";
import { generateSite } from "@/lib/siteGenerator";
import { insertSite } from "@/lib/db";
import { generateId } from "@/lib/idGen";
import { SiteRecord } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const result = validateOnboarding(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const toneProfile = computeToneProfile(result.data.quiz);
  const generated = generateSite(result.data, toneProfile);
  const now = new Date().toISOString();

  const record: SiteRecord = {
    id: generateId("site"),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    onboarding: result.data,
    generated,
    feedbackHistory: [],
  };

  insertSite(record);

  return NextResponse.json({ id: record.id }, { status: 201 });
}
