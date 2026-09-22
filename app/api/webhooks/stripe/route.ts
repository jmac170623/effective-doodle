import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, refundDomainPurchase } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  activateSiteBilling,
  addAnimationCredits,
  addEditCredits,
  getDomainPurchase,
  updateBillingStatusBySubscription,
  updateDomainPurchaseStatus,
  updateSiteDomain,
} from "@/lib/db";
import { addDomainToProject, buyDomain } from "@/lib/vercelDomains";
import { BillingStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Buys the domain for real via Vercel's registrar (the customer has
// already paid at this point) and attaches it to the project. If the
// Vercel purchase fails after a successful Stripe charge, refunds the
// customer automatically rather than leaving them paying for nothing —
// this is the one place real money can be lost if it's ever removed.
async function handleDomainPurchase(
  supabase: SupabaseClient,
  domainPurchaseId: string,
  paymentIntentId: string | undefined
): Promise<void> {
  const purchase = await getDomainPurchase(supabase, domainPurchaseId);
  // Already handled (webhook retry) or unknown — idempotent no-op.
  if (!purchase || purchase.status !== "pending_payment") return;

  await updateDomainPurchaseStatus(supabase, {
    id: domainPurchaseId,
    status: "purchasing",
    stripePaymentIntentId: paymentIntentId,
  });

  try {
    const order = await buyDomain({
      domain: purchase.domain,
      years: purchase.years,
      expectedPriceUsd: purchase.expectedPriceUsd,
      contact: purchase.contact,
    });

    const attach = await addDomainToProject(purchase.domain);

    await updateSiteDomain(supabase, {
      siteId: purchase.siteId,
      customDomain: purchase.domain,
      domainStatus: attach.verified ? "active" : "pending_dns",
      domainSource: "purchased",
    });

    await updateDomainPurchaseStatus(supabase, {
      id: domainPurchaseId,
      status: "completed",
      vercelOrderId: order.orderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Domain purchase failed.";
    console.error(`Domain purchase failed for ${purchase.domain} (purchase ${domainPurchaseId}):`, error);

    await updateDomainPurchaseStatus(supabase, { id: domainPurchaseId, status: "failed", errorMessage: message });

    if (paymentIntentId) {
      try {
        await refundDomainPurchase(paymentIntentId);
        await updateDomainPurchaseStatus(supabase, { id: domainPurchaseId, status: "refunded" });
      } catch (refundError) {
        console.error(`Failed to refund domain purchase ${domainPurchaseId} after Vercel purchase failure:`, refundError);
      }
    }
  }
}

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

      if (session.mode === "payment" && session.metadata?.type === "domain_purchase") {
        const domainPurchaseId = session.metadata.domainPurchaseId;
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (domainPurchaseId) {
          await handleDomainPurchase(supabase, domainPurchaseId, paymentIntentId);
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
