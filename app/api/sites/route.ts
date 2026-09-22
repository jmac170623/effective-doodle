import { NextRequest, NextResponse } from "next/server";
import { validateOnboarding } from "@/lib/validateOnboarding";
import { computeToneProfile } from "@/lib/toneProfiles";
import { generateSite } from "@/lib/siteGenerator";
import { correctOnboardingText } from "@/lib/textCleanup";
import { insertSite, updateSiteDomain } from "@/lib/db";
import { generateId } from "@/lib/idGen";
import { SiteRecord } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { addDomainToProject } from "@/lib/vercelDomains";

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

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

  const domainChoice = body?.domain?.choice;
  const domainValue = typeof body?.domain?.value === "string" ? normalizeDomain(body.domain.value) : "";
  const hasOwnDomain = domainChoice === "have" && DOMAIN_PATTERN.test(domainValue);
  const wantsToBuyDomain = domainChoice === "buy" && domainValue.length > 0;

  try {
    const cleanedOnboarding = await correctOnboardingText(result.data);
    const generated = await generateSite(cleanedOnboarding, toneProfile);
    const now = new Date().toISOString();

    const record: SiteRecord = {
      id: generateId("site"),
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
      status: "draft",
      onboarding: cleanedOnboarding,
      generated,
      feedbackHistory: [],
      billingStatus: "unpaid",
      animationCredits: 0,
      editCredits: 0,
      domainStatus: "none",
      desiredDomain: wantsToBuyDomain ? domainValue : undefined,
    };

    await insertSite(supabase, record);

    if (hasOwnDomain) {
      // Best-effort: connecting the domain shouldn't block the site the
      // owner just waited on being created — failures are visible and
      // retryable from the manage dashboard afterwards.
      try {
        const attach = await addDomainToProject(domainValue);
        await updateSiteDomain(supabase, {
          siteId: record.id,
          customDomain: domainValue,
          domainStatus: attach.verified ? "active" : "pending_dns",
          domainSource: "connected",
        });
      } catch (error) {
        console.error(`Failed to auto-connect domain ${domainValue} for new site ${record.id}:`, error);
      }
    }

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) {
    console.error("Site generation failed:", error);
    const message = error instanceof Error ? error.message : "Something went wrong generating your site.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
