/**
 * Placeholder for the real Higgsfield photo-to-video integration.
 *
 * This is intentionally a stub, not a best-guess implementation: Higgsfield's
 * actual developer API (auth scheme, endpoint for submitting an
 * image-to-video job, how to poll for or receive the result) hasn't been
 * verified against real docs or a real API key yet. Faking a plausible-
 * looking request here would fail silently in production in a way that's
 * hard to distinguish from a real bug — an honest "not configured yet" is
 * safer than a guess.
 *
 * Once a HIGGSFIELD_API_KEY and the real API shape are available, replace
 * the body of this function with the actual request (see lib/aiCopywriter.ts
 * for the established pattern: try the real call, return null on any
 * failure so callers can degrade gracefully). Nothing elsewhere needs to
 * change — lib/animationLimits.ts, the site_animations table, and the
 * /api/sites/[id]/animations route are all already wired to call this.
 */
export async function animatePhoto(imageUrl: string): Promise<{ videoUrl: string } | null> {
  if (!process.env.HIGGSFIELD_API_KEY) return null;

  // TODO: real Higgsfield API call goes here once credentials/docs exist.
  console.warn(`Higgsfield integration not yet implemented — skipped animating ${imageUrl}.`);
  return null;
}
