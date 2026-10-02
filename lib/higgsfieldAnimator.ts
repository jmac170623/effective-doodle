import { config, higgsfield } from "@higgsfield/client/v2";
import {
  describeStageMotion,
  GALLERY_PHOTO_CONTEXT_DESCRIPTION,
  heroStageContextDescription,
} from "./heroStageVision";

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
 *
 * NOT using the SDK's own `withPolling: true` — read its source
 * (dist/v2/client.js#pollV2Request): its catch block only tolerates axios
 * errors with an HTTP response whose status is >= 500. A raw connection
 * reset (ECONNRESET, no HTTP response at all) falls through and rethrows,
 * aborting the whole poll loop on the very first network hiccup — during a
 * loop that can legitimately run for minutes. Confirmed live: two separate
 * generations both failed with exactly "read ECONNRESET". subscribeResilient
 * below submits the job via the SDK (reusing its own retry-protected POST)
 * but polls status manually, tolerating any transient failure.
 */
interface HFV2Response {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw";
  request_id?: string;
  status_url?: string;
  video?: { url: string };
}

// The SDK's own V2Response type (dist/v2/types.d.ts) carries no error/reason
// field at all for a "failed" status — request_id and status_url are the
// only things that let a failure actually be looked up afterwards instead
// of just saying "it failed" with no way to find out why.
function describeFailure(result: HFV2Response): string {
  const parts = [`status: ${result.status}`];
  if (result.request_id) parts.push(`request_id: ${result.request_id}`);
  if (result.status_url) parts.push(`status_url: ${result.status_url}`);
  return parts.join(", ");
}

const HF_API_BASE_URL = "https://api.higgsfield.ai";
const HF_POLL_INTERVAL_MS = 2000;
// Hard-capped below 300s: Vercel's Hobby plan rejects any Serverless
// Function maxDuration above 300 outright at deploy time (confirmed live —
// an earlier 520s value made the whole deployment fail with
// "invalid_max_duration" before any code even ran). 260s leaves ~40s of
// headroom inside the route's own 300s maxDuration for the surrounding DB
// calls. If hero generation (3 concurrent clips) still doesn't reliably
// finish inside this, the real fix is a Pro plan (up to 900s) or moving to
// a webhook-based async flow instead of holding the request open.
const HF_MAX_POLL_TIME_MS = 260000;

async function subscribeResilient(endpoint: string, input: Record<string, unknown>): Promise<HFV2Response> {
  const submitted = (await higgsfield.subscribe(endpoint, { input, withPolling: false })) as HFV2Response;
  if (!submitted.request_id) return submitted;

  const startTime = Date.now();
  while (true) {
    if (Date.now() - startTime > HF_MAX_POLL_TIME_MS) {
      throw new Error(`Higgsfield polling exceeded ${HF_MAX_POLL_TIME_MS}ms.`);
    }
    try {
      const res = await fetch(`${HF_API_BASE_URL}/requests/${submitted.request_id}/status`, {
        headers: { Authorization: `Key ${process.env.HF_CREDENTIALS}` },
      });
      if (res.ok) {
        const data = (await res.json()) as HFV2Response;
        if (data.status === "completed" || data.status === "failed" || data.status === "nsfw") {
          return data;
        }
      }
      // Non-ok (including 5xx) — transient, keep polling.
    } catch {
      // Network-level error (ECONNRESET etc.) — also transient.
    }
    await new Promise((resolve) => setTimeout(resolve, HF_POLL_INTERVAL_MS));
  }
}

// Lighter-touch than the hero transformation — this runs up to 3 times per
// site for free, so it intentionally uses a shorter duration to keep the
// real Higgsfield cost down. At $0.0715/s on minimax_h3 (45% off, checked
// live in the dashboard), 5s costs ~$0.36 per generation.
const GALLERY_ANIMATION_DURATION_SECONDS = 5;
const GALLERY_ANIMATION_RESOLUTION = "2K";
// Fallback only, used when vision analysis of the actual photo (below) is
// unavailable or fails. Earlier wording asked for "subtle" motion, and real
// generated clips came back visually indistinguishable from a frozen photo
// for the full duration — "subtle" is no longer in this prompt on purpose.
const GENERIC_FALLBACK_MOTION_PROMPT =
  "Animate this exact photo with continuous, clearly visible camera movement for the entire duration — a slow cinematic push-in combined with gentle parallax drift across the scene's depth. The motion must be obvious to a viewer, not a static or freeze-frame shot.";
const MOTION_SAFETY_SUFFIX =
  " Keep perspective, geometry and every object in the scene completely unchanged apart from the one physical action described above — no unrelated objects or people, no text.";

/**
 * Looks at the actual photo and describes the real physical construction
 * action that produced what's visible in it (render being chipped off,
 * mesh being bedded into a wall, joints being pointed, ...), so the motion
 * animates something true to that specific photo instead of a generic
 * camera-drift effect that fits no photo in particular. Falls back to the
 * generic prompt above when vision analysis isn't configured or fails.
 */
async function buildMotionPrompt(imageUrl: string, contextDescription: string, trade: string): Promise<string> {
  const motion = await describeStageMotion(imageUrl, contextDescription, trade);
  return `${motion ?? GENERIC_FALLBACK_MOTION_PROMPT}${MOTION_SAFETY_SUFFIX}`;
}

export async function animatePhoto(imageUrl: string, trade: string): Promise<{ videoUrl: string } | null> {
  if (!process.env.HF_CREDENTIALS) return null;

  const prompt = await buildMotionPrompt(imageUrl, GALLERY_PHOTO_CONTEXT_DESCRIPTION, trade);
  config({ credentials: process.env.HF_CREDENTIALS });
  const result = await subscribeResilient("minimax/h3/image-to-video", {
    prompt,
    image_url: imageUrl,
    duration: GALLERY_ANIMATION_DURATION_SECONDS,
    resolution: GALLERY_ANIMATION_RESOLUTION,
    aspect_ratio: "auto",
    aigc_watermark: false,
  });

  // "nsfw" happens on a real (if rare) misclassified trade photo — surfaced
  // to the caller like any other non-completion rather than masked as a
  // generic failure, since it's diagnosable and not a code bug.
  if (result.status !== "completed" || !result.video?.url) {
    throw new Error(`Higgsfield animation did not complete (${describeFailure(result)}).`);
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

/**
 * Animates one hero stage photo in isolation. Called once per stage (see
 * the hero-animation route) rather than passing all stages into a single
 * multi-image call. The motion itself comes from actually looking at this
 * photo (buildMotionPrompt, via describeStageMotion) — e.g. render being
 * chipped off a bare wall at the start stage, mesh being bedded in partway
 * through, joints being pointed on the finished wall — rather than a
 * generic "work in progress" line that doesn't describe anything specific
 * to what's in the photo.
 */
export async function animateHeroStageClip(
  imageUrl: string,
  position: "start" | "middle" | "end",
  trade: string
): Promise<{ videoUrl: string } | null> {
  if (!process.env.HF_CREDENTIALS) return null;

  const prompt = await buildMotionPrompt(imageUrl, heroStageContextDescription(position), trade);
  config({ credentials: process.env.HF_CREDENTIALS });
  const result = await subscribeResilient("minimax/h3/image-to-video", {
    prompt,
    image_url: imageUrl,
    duration: HERO_STAGE_DURATION_SECONDS,
    resolution: HERO_STAGE_RESOLUTION,
    aspect_ratio: "auto",
    aigc_watermark: false,
  });

  if (result.status !== "completed" || !result.video?.url) {
    throw new Error(`Higgsfield hero stage animation did not complete (${describeFailure(result)}).`);
  }
  return { videoUrl: result.video.url };
}
