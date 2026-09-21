import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateSiteBilling, addAnimationCredits, addEditCredits, updateBillingStatusBySubscription } from "@/lib/db";
import { BillingStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const siteId = session.metadata?.siteId;

      if (session.mode === "payment" && session.metadata?.type === "animation_credit") {
        const credits = Number.parseInt(session.metadata.credits ?? "1", 10);
        if (siteId && credits > 0) {
          await addAnimationCredits(supabase, siteId, credits);
        }
        break;
      }

      if (session.mode === "payment" && session.metadata?.type === "edit_credit") {
        const credits = Number.parseInt(session.metadata.credits ?? "1", 10);
        if (siteId && credits > 0) {
          await addEditCredits(supabase, siteId, credits);
        }
        break;
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (siteId && customerId && subscriptionId) {
        await activateSiteBilling(supabase, {
          siteId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      let billingStatus: BillingStatus;
      let unpublish = false;

      if (subscription.status === "active" || subscription.status === "trialing") {
        billingStatus = "active";
      } else if (subscription.status === "past_due") {
        // Grace period — keep the site live while Stripe retries payment.
        billingStatus = "past_due";
      } else {
        billingStatus = "canceled";
        unpublish = true;
      }

      await updateBillingStatusBySubscription(supabase, {
        stripeSubscriptionId: subscription.id,
        billingStatus,
        unpublish,
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
