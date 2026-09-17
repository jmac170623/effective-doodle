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
}
