import { NextRequest, NextResponse } from "next/server";
import { getSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getStripe, ANIMATION_CREDIT_PRICE_ID } from "@/lib/stripe";

// One-time payment for a single extra animation credit, bought once a
// site's free cap (see lib/animationLimits.ts) is used up.
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

  const origin = request.nextUrl.origin;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: ANIMATION_CREDIT_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/manage/${id}?animationCheckout=success`,
    cancel_url: `${origin}/manage/${id}?animationCheckout=cancelled`,
    customer_email: user.email,
    metadata: { siteId: id, type: "animation_credit", credits: "1" },
  });

  return NextResponse.json({ url: session.url });
}
