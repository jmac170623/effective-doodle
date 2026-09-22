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

// ---- Domain purchases ----
// Charged in USD regardless of the site retainer's currency: Vercel's
// registrar always quotes in USD, and applying a markup on top of that
// avoids guessing an FX rate for a GBP price. Percentage is configurable
// since the right margin depends on how much FX/registrar-price movement
// you want to absorb between quote time and the (rare) renewal.
const DOMAIN_MARKUP_PERCENT = Number(process.env.DOMAIN_MARKUP_PERCENT ?? "30");

export function computeDomainRetailPriceUsd(vercelPriceUsd: number): number {
  return Math.round(vercelPriceUsd * (1 + DOMAIN_MARKUP_PERCENT / 100) * 100) / 100;
}

// Domain prices vary per-domain, so this uses ad-hoc price_data rather than
// a preset Stripe Price (unlike the fixed animation/edit credit prices).
export function buildDomainCheckoutLineItem(domain: string, retailPriceUsd: number): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: Math.round(retailPriceUsd * 100),
      product_data: { name: `Domain registration: ${domain}` },
    },
  };
}

// Best-effort refund when a Stripe payment succeeded but the Vercel domain
// purchase that followed it failed — the customer should never be left
// paying for a domain they don't have.
export async function refundDomainPurchase(paymentIntentId: string): Promise<void> {
  await getStripe().refunds.create({ payment_intent: paymentIntentId });
}
