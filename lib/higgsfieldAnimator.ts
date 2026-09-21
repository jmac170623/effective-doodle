/**
 * Placeholder for the real Higgsfield photo-to-video integration.
 *
 * This is intentionally a stub, not a best-guess implementation: Higgsfield's
 * actual developer REST API (auth scheme, endpoint for submitting a job, how
 * to poll for or receive the result) hasn't been verified against real docs
 * or a real API key yet. Faking a plausible-looking request here would fail
 * silently in production in a way that's hard to distinguish from a real
 * bug — an honest "not configured yet" is safer than a guess.
 *
 * What HAS been verified (via Higgsfield's own model catalog, models_explore
 * with input=image/type=video): there is no mode that invents a plausible
 * build history from a single finished photo. What's real:
 *  - Single-photo animation (subtle motion/camera movement, no narrative) —
 *    e.g. models tagged "image-to-video" with just a start_image role, such
 *    as Grok Video 1.5 or Seedance 2.5's omni_reference mode.
 *  - Multi-photo transformation — models like minimax_h3, minimax_h3_max
 *    and flux_3_video accept medias with roles start_image + end_image (and
 *    flux_3_video is explicitly tagged "storyboard" for more than two), and
 *    generate one video that genuinely transitions between the supplied
 *    stage photos. This is what powers animateHeroTransformation below.
 *
 * Once a HIGGSFIELD_API_KEY and the real REST API shape are available,
 * replace the bodies of these functions with the actual requests (see
 * lib/aiCopywriter.ts for the established pattern: try the real call,
 * return null on any failure so callers can degrade gracefully). Nothing
 * elsewhere needs to change — lib/animationLimits.ts, the site_animations
 * table, and the /api/sites/[id]/animations + /hero-animation routes are
 * all already wired to call these.
 */
export async function animatePhoto(imageUrl: string): Promise<{ videoUrl: string } | null> {
  if (!process.env.HIGGSFIELD_API_KEY) return null;

  // TODO: real Higgsfield API call goes here once credentials/docs exist.
  console.warn(`Higgsfield integration not yet implemented — skipped animating ${imageUrl}.`);
  return null;
}

/**
 * Generates one transformation video across ordered stage photos (e.g.
 * before/during/after), rather than animating a single image. stageUrls
 * must be in chronological order — the intended real implementation maps
 * the first to start_image, the last to end_image, and any in between to
 * image_references.
 *
 * Recommended model: minimax_h3 — checked live via Higgsfield's own cost
 * preflight (generate_video get_cost:true), it's both the cheapest option
 * that supports start_image+end_image transformation AND cheaper than the
 * single-photo-only alternatives: 10 credits per 5s/2K generation, vs.
 * 12.5 (minimax_h3_max), 22.5 (grok_video_v15, single-photo only), 27.5
 * (flux_3_video "storyboard"), or 35 (seedance_2_5).
 */
export async function animateHeroTransformation(stageUrls: string[]): Promise<{ videoUrl: string } | null> {
  if (!process.env.HIGGSFIELD_API_KEY) return null;
  if (stageUrls.length < 2) return null;

  // TODO: real Higgsfield API call goes here once credentials/docs exist.
  console.warn(`Higgsfield integration not yet implemented — skipped hero transformation across ${stageUrls.length} stages.`);
  return null;
}
