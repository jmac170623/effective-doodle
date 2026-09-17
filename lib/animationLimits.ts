import { SiteAnimation } from "./types";

// Every site gets this many Higgsfield animations for free; beyond that,
// each additional animation consumes a purchased credit.
export const FREE_ANIMATION_CAP = 3;

interface AnimationEligibility {
  allowed: boolean;
  usesCredit: boolean;
  freeUsed: number;
  freeRemaining: number;
}

// Only processing/completed animations count against the cap — a failed
// attempt (e.g. Higgsfield call errored) shouldn't cost the site a slot.
export function checkAnimationEligibility(
  existingAnimations: SiteAnimation[],
  animationCredits: number
): AnimationEligibility {
  const countingTowardCap = existingAnimations.filter((a) => a.status !== "failed");
  const freeUsed = Math.min(countingTowardCap.length, FREE_ANIMATION_CAP);
  const freeRemaining = Math.max(0, FREE_ANIMATION_CAP - countingTowardCap.length);

  if (freeRemaining > 0) {
    return { allowed: true, usesCredit: false, freeUsed, freeRemaining };
  }
  if (animationCredits > 0) {
    return { allowed: true, usesCredit: true, freeUsed, freeRemaining: 0 };
  }
  return { allowed: false, usesCredit: false, freeUsed, freeRemaining: 0 };
}
