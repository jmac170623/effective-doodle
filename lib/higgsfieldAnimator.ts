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

// Each stage photo gets its own independent clip — subtle motion within
// just that single frame — rather than one AI-blended morph across all
// stages. This reuses the exact same proven single-image endpoint as
// animatePhoto above (an earlier attempt at a multi-image "keyframes" call
// on this same endpoint came back real Higgsfield validation errors —
// unconfirmed field names aren't worth the risk on what's meant to be a
// one-shot, premium generation). The clips are played back-to-back on the
// page (see components/site/HeroStageScrubVideo.tsx), which is what
// actually reproduces the reference ad's effect: each stage of the job
// visibly comes alive in turn, not one continuous invented transition.
const HERO_STAGE_DURATION_SECONDS = 5;
const HERO_STAGE_RESOLUTION = "2K";

function heroStagePrompt(position: "start" | "middle" | "end"): string {
  const base =
    "Subtle, realistic camera motion and natural ambient movement bringing this exact photo to life — consistent perspective and geometry, no narrative change to the scene, no unrelated objects or people, no text.";
  if (position === "start") {
    return `This is the starting point of a job, before the work shown in later stages has begun. ${base}`;
  }
  if (position === "end") {
    return `This is the finished, completed result of the job. ${base}`;
  }
  return `This is a work-in-progress stage midway through the job. ${base}`;
}

/**
 * Animates one hero stage photo in isolation. Called once per stage (see
 * the hero-animation route) rather than passing all stages into a single
 * multi-image call.
 */
export async function animateHeroStageClip(
  imageUrl: string,
  position: "start" | "middle" | "end"
): Promise<{ videoUrl: string } | null> {
  if (!process.env.HF_CREDENTIALS) return null;

  config({ credentials: process.env.HF_CREDENTIALS });
  const result = await higgsfield.subscribe("minimax/h3/image-to-video", {
    input: {
      prompt: heroStagePrompt(position),
      image_url: imageUrl,
      duration: HERO_STAGE_DURATION_SECONDS,
      resolution: HERO_STAGE_RESOLUTION,
      aspect_ratio: "auto",
      aigc_watermark: false,
    },
    withPolling: true,
  });

  if (result.status !== "completed" || !result.video?.url) {
    throw new Error(`Higgsfield hero stage animation did not complete (status: ${result.status}).`);
  }
  return { videoUrl: result.video.url };
}
