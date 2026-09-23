import { config, higgsfield } from "@higgsfield/client/v2";

/**
 * Real Higgsfield photo-to-video integration for single-photo animation.
 *
 * Verified against the installed @higgsfield/client v0.2.6 source (not just
 * the dashboard's docs sample, which showed a different response shape than
 * what the SDK actually returns — see node_modules/@higgsfield/client/dist/v2/client.js):
 *  - Auth: HF_CREDENTIALS env var, format "KEY_ID:KEY_SECRET".
 *  - higgsfield.subscribe(endpoint, { input, withPolling: true }) POSTs
 *    `input` directly to `/{endpoint}` and polls GET /requests/{id}/status
 *    until status is 'completed' | 'failed' | 'nsfw'.
 *  - Real response shape: { status, video?: { url } } — not the
 *    `result.isCompleted` / `result.jobs[0]` shape the dashboard's copy-paste
 *    example showed.
 *  - Endpoint "minimax/h3/image-to-video" with input
 *    { prompt, image_url, duration, resolution, aspect_ratio, aigc_watermark }
 *    is the confirmed single-photo shape (from the dashboard's own
 *    model-specific code sample for this exact model).
 */

// Lighter-touch than the hero transformation — this runs up to 3 times per
// site for free, so it intentionally uses a shorter duration to keep the
// real Higgsfield cost down. At $0.0715/s on minimax_h3 (45% off, checked
// live in the dashboard), 5s costs ~$0.36 per generation.
const GALLERY_ANIMATION_DURATION_SECONDS = 5;
const GALLERY_ANIMATION_RESOLUTION = "2K";
const GALLERY_ANIMATION_PROMPT =
  "Subtle, realistic camera motion and natural ambient movement bringing this photo to life — no narrative change to the scene, no unrelated objects or people, no text.";

export async function animatePhoto(imageUrl: string): Promise<{ videoUrl: string } | null> {
  if (!process.env.HF_CREDENTIALS) return null;

  config({ credentials: process.env.HF_CREDENTIALS });
  const result = await higgsfield.subscribe("minimax/h3/image-to-video", {
    input: {
      prompt: GALLERY_ANIMATION_PROMPT,
      image_url: imageUrl,
      duration: GALLERY_ANIMATION_DURATION_SECONDS,
      resolution: GALLERY_ANIMATION_RESOLUTION,
      aspect_ratio: "auto",
      aigc_watermark: false,
    },
    withPolling: true,
  });

  // "nsfw" happens on a real (if rare) misclassified trade photo — surfaced
  // to the caller like any other non-completion rather than masked as a
  // generic failure, since it's diagnosable and not a code bug.
  if (result.status !== "completed" || !result.video?.url) {
    throw new Error(`Higgsfield animation did not complete (status: ${result.status}).`);
  }
  return { videoUrl: result.video.url };
}

// This runs exactly once per site (enforced in the hero-animation route,
// not here) — a single deliberate, premium generation rather than something
// regenerated repeatedly. That's the justification for spending more per
// generation than the single-photo animator: there's no "try again cheaper"
// path, so it should look as good as the model can produce the first time.
//
// Duration is pinned to minimax_h3's actual maximum (15s), not a guessed
// middle value. Up to 4 stage photos can be supplied, and a shorter
// duration risks compressing each stage's transition into too little time
// to register — the reference ad the user targeted dwells on each of its
// ~4 stages for several real seconds. At $0.0715/s (45% off), 15s costs
// ~$1.07 per generation — a small price for a generation that only ever
// happens once per site.
const HERO_TRANSFORMATION_DURATION_SECONDS = 15;
const HERO_TRANSFORMATION_RESOLUTION = "2K";
// Target quality bar: a real "QuickSite" competitor ad the user shared —
// fixed camera angle on one property, morphing through the job's stages
// (e.g. overgrown -> landscaped -> furnished -> dusk with lighting on),
// polished real-estate/landscaping-ad quality, no jarring cuts.
const HERO_TRANSFORMATION_PROMPT =
  "A smooth, cinematic professional transformation of this exact property/job, shot from a single fixed camera angle that stays locked throughout — the framing must not shift or drift. Progress naturally through the supplied stage photos in order, as if time is passing on this one scene: consistent perspective and geometry throughout, with lighting evolving realistically stage to stage (including a shift toward golden-hour or dusk lighting with any exterior/feature lighting switching on if the final stage suggests evening). Photorealistic, polished real-estate/landscaping advertisement quality. No jarring cuts, no camera pans or zooms, no unrelated objects or people appearing.";

/**
 * Generates one transformation video across ordered stage photos (e.g.
 * before/during/after), rather than animating a single image.
 *
 * Endpoint prefix ("minimax/h3/...") and auth/polling/response handling are
 * verified (same as animatePhoto above). The multi-image input field names
 * below are the best-confirmed guess, not yet proven against a real call:
 * Higgsfield's own model catalog (minimax_h3) lists this model's supported
 * input roles as "start_image", "end_image", "image_references" (alongside
 * video/audio references not relevant here) — confirmed by querying the
 * live model catalog, not invented. Following the single-image endpoint's
 * own confirmed convention (`image_url` singular), the most likely REST
 * field names are `start_image_url` / `end_image_url` /
 * `image_reference_urls`. This throws a real error (not a silent null) on
 * failure so the first live attempt's actual Higgsfield error — if the
 * field names are wrong — tells us exactly what to fix instead of another
 * guess.
 */
export async function animateHeroTransformation(stageUrls: string[]): Promise<{ videoUrl: string } | null> {
  if (!process.env.HF_CREDENTIALS) return null;
  if (stageUrls.length < 2) return null;

  config({ credentials: process.env.HF_CREDENTIALS });

  const middleStages = stageUrls.slice(1, -1);

  const result = await higgsfield.subscribe("minimax/h3/image-to-video", {
    input: {
      prompt: HERO_TRANSFORMATION_PROMPT,
      start_image_url: stageUrls[0],
      end_image_url: stageUrls[stageUrls.length - 1],
      ...(middleStages.length > 0 ? { image_reference_urls: middleStages } : {}),
      duration: HERO_TRANSFORMATION_DURATION_SECONDS,
      resolution: HERO_TRANSFORMATION_RESOLUTION,
      aspect_ratio: "auto",
      aigc_watermark: false,
    },
    withPolling: true,
  });

  if (result.status !== "completed" || !result.video?.url) {
    throw new Error(`Higgsfield hero transformation did not complete (status: ${result.status}).`);
  }
  return { videoUrl: result.video.url };
}
