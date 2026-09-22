import { NextRequest, NextResponse } from "next/server";
import { getSite, insertDomainPurchase } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkDomainAvailability, getDomainPrice } from "@/lib/vercelDomains";
import { buildDomainCheckoutLineItem, computeDomainRetailPriceUsd, getStripe } from "@/lib/stripe";
import { generateId } from "@/lib/idGen";
import { DomainRegistrantContact } from "@/lib/types";

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

function validateContact(input: unknown): { data: DomainRegistrantContact } | { error: string } {
  if (typeof input !== "object" || input === null) {
    return { error: "Registrant details are required to buy a domain." };
  }
  const c = input as Record<string, unknown>;
  const required = ["firstName", "lastName", "email", "phone", "address1", "city", "state", "zip", "country"] as const;
  for (const key of required) {
    if (typeof c[key] !== "string" || (c[key] as string).trim().length === 0) {
      return { error: `Missing registrant field: ${key}` };
    }
  }
  const country = (c.country as string).trim();
  if (country.length !== 2) {
    return { error: "Country must be a 2-letter code, e.g. GB." };
  }
  return {
    data: {
      firstName: (c.firstName as string).trim(),
      lastName: (c.lastName as string).trim(),
      email: (c.email as string).trim(),
      phone: (c.phone as string).trim(),
      address1: (c.address1 as string).trim(),
      city: (c.city as string).trim(),
      state: (c.state as string).trim(),
      zip: (c.zip as string).trim(),
      country: country.toUpperCase(),
    },
  };
}

// Real money: creates a pending domain_purchases record, then a Stripe
// Checkout session charging the customer (domain cost + markup, USD). The
// actual Vercel domain registration only happens once Stripe confirms
// payment — see the webhook handler, not here.
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
    return NextResponse.json({ error: "Enter a valid domain name, e.g. yourbusiness.com" }, { status: 400 });
  }
  const contactResult = validateContact(body?.contact);
  if ("error" in contactResult) {
    return NextResponse.json({ error: contactResult.error }, { status: 400 });
  }

  try {
    // Always re-check live availability/price server-side — never trust a
    // client-supplied price for what Stripe charges or what gets sent to
    // Vercel's buy endpoint.
    const available = await checkDomainAvailability(domain);
    if (!available) {
      return NextResponse.json({ error: "That domain isn't available anymore — try another." }, { status: 409 });
    }
    const price = await getDomainPrice(domain, 1);
    const retailPriceUsd = computeDomainRetailPriceUsd(price.purchasePriceUsd);

    const purchaseId = generateId("dompur");
    const origin = request.nextUrl.origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [buildDomainCheckoutLineItem(domain, retailPriceUsd)],
      success_url: `${origin}/manage/${id}?domainCheckout=success`,
      cancel_url: `${origin}/manage/${id}?domainCheckout=cancelled`,
      customer_email: user.email,
      metadata: { siteId: id, type: "domain_purchase", domainPurchaseId: purchaseId },
    });

    // Service-role client: this row holds registrant PII and needs to be
    // written and later read back by the webhook, which has no user session.
    const admin = createAdminClient();
    await insertDomainPurchase(admin, {
      id: purchaseId,
      siteId: id,
      domain,
      years: price.years,
      expectedPriceUsd: price.purchasePriceUsd,
      chargedPriceUsd: retailPriceUsd,
      contact: contactResult.data,
      stripeCheckoutSessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start domain purchase.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
