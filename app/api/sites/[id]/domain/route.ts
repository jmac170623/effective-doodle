import { NextRequest, NextResponse } from "next/server";
import { getSite, updateSiteDomain } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { addDomainToProject, getDomainConfig } from "@/lib/vercelDomains";

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

// "I already have a domain" — attaches it to the Vercel project. Doesn't
// cost anything; the customer keeps owning/paying for the domain at
// whatever registrar they already use.
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
  const domain = typeof body?.domain === "string" ? normalizeDomain(body.domain) : "";
  if (!DOMAIN_PATTERN.test(domain)) {
    return NextResponse.json({ error: "Enter a valid domain name, e.g. yourbusiness.co.uk" }, { status: 400 });
  }

  try {
    const result = await addDomainToProject(domain);
    await updateSiteDomain(supabase, {
      siteId: id,
      customDomain: domain,
      domainStatus: result.verified ? "active" : "pending_dns",
      domainSource: "connected",
    });
    return NextResponse.json({ domain, verified: result.verified, verification: result.verification ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect this domain.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// Re-checks DNS/verification status against Vercel — used by a "Check
// status" button in the dashboard since there's no webhook for DNS
// propagation completing.
export async function GET(
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

  if (!site.customDomain) {
    return NextResponse.json({ domain: null, status: "none" });
  }

  try {
    const config = await getDomainConfig(site.customDomain);
    const domainStatus = config.misconfigured ? "pending_dns" : "active";
    if (domainStatus !== site.domainStatus) {
      await updateSiteDomain(supabase, {
        siteId: id,
        customDomain: site.customDomain,
        domainStatus,
        domainSource: site.domainSource ?? "connected",
      });
    }
    return NextResponse.json({ domain: site.customDomain, status: domainStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check domain status.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
