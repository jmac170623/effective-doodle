import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

export const SITE_RETAINER_PRICE_ID = process.env.STRIPE_PRICE_ID!;

// One-time payment for an extra Higgsfield animation, purchased after a
// site's 3 free animations are used up (see lib/animationLimits.ts).
export const ANIMATION_CREDIT_PRICE_ID = process.env.STRIPE_ANIMATION_PRICE_ID!;

// One-time payment for an extra AI-powered feedback edit, purchased after a
// site's 5 free edits are used up (see lib/editLimits.ts).
export const EDIT_CREDIT_PRICE_ID = process.env.STRIPE_EDIT_PRICE_ID!;

// Called when a site is deleted — stops the £35/mo retainer immediately
// rather than leaving the customer billed for a site that no longer
// exists. Treats "already canceled" as success since deletion should be
// idempotent (e.g. a retry after a partial failure).
export async function cancelSiteSubscription(subscriptionId: string): Promise<void> {
  try {
    await getStripe().subscriptions.cancel(subscriptionId);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("already canceled") || message.includes("no such subscription")) {
      return;
    }
    throw error;
  }
}
