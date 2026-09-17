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
