import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDomainAvailability, getDomainPrice } from "@/lib/vercelDomains";
import { computeDomainRetailPriceUsd } from "@/lib/stripe";

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

// Read-only lookup used by the manage dashboard's "search & buy a domain"
// panel — requires login only to keep it from being an open proxy for
// Vercel's registrar API, not because the result is sensitive.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain || !DOMAIN_PATTERN.test(domain)) {
    return NextResponse.json({ error: "Enter a valid domain name, e.g. yourbusiness.com" }, { status: 400 });
  }

  try {
    const available = await checkDomainAvailability(domain);
    if (!available) {
      return NextResponse.json({ domain, available: false });
    }
    const price = await getDomainPrice(domain, 1);
    return NextResponse.json({
      domain,
      available: true,
      years: price.years,
      retailPriceUsd: computeDomainRetailPriceUsd(price.purchasePriceUsd),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check domain availability.";
    // Vercel's registrar doesn't support every TLD (e.g. .uk/.co.uk aren't
    // supported at all) — surface that as a normal result, not a crash.
    return NextResponse.json({ domain, available: false, unsupported: true, message });
  }
}
