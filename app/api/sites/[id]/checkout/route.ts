import { NextRequest, NextResponse } from "next/server";
import { getSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getStripe, SITE_RETAINER_PRICE_ID } from "@/lib/stripe";

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
  if (site.billingStatus === "active") {
    return NextResponse.json({ error: "This site's retainer is already active." }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: SITE_RETAINER_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/preview/${id}?checkout=success`,
      cancel_url: `${origin}/preview/${id}?checkout=cancelled`,
      customer_email: user.email,
      metadata: { siteId: id },
      subscription_data: { metadata: { siteId: id } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Never forward Stripe's raw error text to the client — it can include
    // internal detail (e.g. a misconfigured API key error literally names
    // the key and links to the Stripe dashboard) that has no business being
    // shown on a customer-facing page. Full detail stays server-side.
    console.error(`Failed to start checkout for site ${id}:`, error);
    return NextResponse.json({ error: "Failed to start checkout — please try again shortly." }, { status: 500 });
  }
}
