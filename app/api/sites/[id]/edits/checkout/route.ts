import { NextRequest, NextResponse } from "next/server";
import { getSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getStripe, EDIT_CREDIT_PRICE_ID } from "@/lib/stripe";

// One-time payment for a single extra AI-edit credit, bought once a
// site's free cap (see lib/editLimits.ts) is used up.
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
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: EDIT_CREDIT_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/preview/${id}?editCheckout=success`,
      cancel_url: `${origin}/preview/${id}?editCheckout=cancelled`,
      customer_email: user.email,
      metadata: { siteId: id, type: "edit_credit", credits: "1" },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Same reasoning as the site checkout route: never forward a raw
    // Stripe error message to the client, only log it server-side.
    console.error(`Failed to start edit-credit checkout for site ${id}:`, error);
    return NextResponse.json({ error: "Failed to start checkout — please try again shortly." }, { status: 500 });
  }
}
