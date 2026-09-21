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
// Lighter-touch than the hero transformation — this runs up to 3 times
// per site for free, so it intentionally uses a shorter duration to keep
// the real Higgsfield cost down: 5s at 2K on minimax_h3 = 10 credits per
// generation (checked live via generate_video get_cost:true), same model
// as the hero function since it was the cheapest option even for a
// single-photo animation (cheaper than grok_video_v15's 22.5 credits/5s).
const GALLERY_ANIMATION_DURATION_SECONDS = 5;
const GALLERY_ANIMATION_RESOLUTION = "2K";

export async function animatePhoto(imageUrl: string): Promise<{ videoUrl: string } | null> {
  if (!process.env.HIGGSFIELD_API_KEY) return null;

  // TODO: real Higgsfield API call goes here once credentials/docs exist —
  // model: minimax_h3, medias: start_image=imageUrl (single-photo, no
  // end_image — subtle motion rather than a transformation).
  console.warn(
    `Higgsfield integration not yet implemented — skipped animating ${imageUrl} ` +
      `(intended: ${GALLERY_ANIMATION_DURATION_SECONDS}s at ${GALLERY_ANIMATION_RESOLUTION}).`
  );
  return null;
}

// This runs exactly once per site (enforced in the hero-animation route,
// not here) — a single deliberate, premium generation rather than something
// regenerated repeatedly. That's the justification for spending more per
// generation than the single-photo animator: there's no "try again cheaper"
// path, so it should look as good as the model can produce the first time.
const HERO_TRANSFORMATION_DURATION_SECONDS = 10; // 20 credits on minimax_h3, vs. 10 for the 5s default — see cost note below.
const HERO_TRANSFORMATION_RESOLUTION = "2K";
// Target quality bar: a real "QuickSite" competitor ad the user shared —
// fixed camera angle on one property, morphing through the job's stages
// (e.g. overgrown -> landscaped -> furnished -> dusk with lighting on),
// polished real-estate/landscaping-ad quality, no jarring cuts.
const HERO_TRANSFORMATION_PROMPT =
  "A smooth, cinematic professional transformation of this exact property/job, shot from a single fixed camera angle that stays locked throughout — the framing must not shift or drift. Progress naturally through the supplied stage photos in order, as if time is passing on this one scene: consistent perspective and geometry throughout, with lighting evolving realistically stage to stage (including a shift toward golden-hour or dusk lighting with any exterior/feature lighting switching on if the final stage suggests evening). Photorealistic, polished real-estate/landscaping advertisement quality. No jarring cuts, no camera pans or zooms, no unrelated objects or people appearing.";

/**
 * Generates one transformation video across ordered stage photos (e.g.
 * before/during/after), rather than animating a single image. stageUrls
 * must be in chronological order — the intended real implementation maps
 * the first to start_image, the last to end_image, and any in between to
 * image_references, passes HERO_TRANSFORMATION_PROMPT as the prompt, and
 * requests HERO_TRANSFORMATION_DURATION_SECONDS at HERO_TRANSFORMATION_RESOLUTION.
 *
 * Recommended model: minimax_h3 — checked live via Higgsfield's own cost
 * preflight (generate_video get_cost:true), it's both the cheapest option
 * that supports start_image+end_image transformation AND cheaper than the
 * single-photo-only alternatives at the same duration: 10 credits per
 * 5s/2K generation (20 at the 10s duration used here), vs. 12.5
 * (minimax_h3_max), 22.5 (grok_video_v15, single-photo only), 27.5
 * (flux_3_video "storyboard"), or 35 (seedance_2_5) at 5s.
 */
export async function animateHeroTransformation(stageUrls: string[]): Promise<{ videoUrl: string } | null> {
  if (!process.env.HIGGSFIELD_API_KEY) return null;
  if (stageUrls.length < 2) return null;

  // TODO: real Higgsfield API call goes here once credentials/docs exist —
  // model: minimax_h3, medias: start_image=stageUrls[0], end_image=stageUrls[last],
  // image_references=stageUrls.slice(1,-1).
  console.warn(
    `Higgsfield integration not yet implemented — skipped hero transformation across ${stageUrls.length} stages ` +
      `(intended: ${HERO_TRANSFORMATION_DURATION_SECONDS}s at ${HERO_TRANSFORMATION_RESOLUTION}, prompt: "${HERO_TRANSFORMATION_PROMPT}").`
  );
  return null;
}
