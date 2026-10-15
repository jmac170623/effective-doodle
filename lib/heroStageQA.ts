import Anthropic from "@anthropic-ai/sdk";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Automated quality check on a generated hero stage clip.
 *
 * Higgsfield's own "completed" status says nothing about whether the clip
 * actually looks right — real generations have come back under that exact
 * status while looking frozen for the full duration, or showing a hand
 * visibly doing the work (both problems found and fixed in
 * lib/heroStageVision.ts's prompt rules, but the model can still slip up
 * on a given generation). Since a real client only gets one free hero
 * animation, this runs right after each clip generates and flags anything
 * that looks wrong — see app/api/sites/[id]/hero-animation/route.ts and
 * the regenerate-stage route, which use the result to unlock one free,
 * targeted regeneration for just that stage.
 *
 * Deliberately NOT a retry loop: each Higgsfield generation already takes
 * ~2 minutes and the route has a 300s hard ceiling (Vercel Hobby plan), so
 * an automatic "regenerate until it passes" loop doesn't fit the time
 * budget. This only checks and reports; regenerating is a separate,
 * explicit, human-triggered action.
 */

export interface HeroClipQAResult {
  // null = the check didn't actually run (no API key, a download/ffmpeg
  // failure, ...) — deliberately distinct from false, which means the
  // check ran and found a real problem. A transient infra hiccup should
  // never flag an otherwise-fine clip for the business owner to worry about.
  passed: boolean | null;
  note?: string;
}

const QA_TOOL: Anthropic.Tool = {
  name: "report_clip_quality",
  description: "Report whether this generated clip is good enough to show a real client.",
  input_schema: {
    type: "object",
    properties: {
      passed: {
        type: "boolean",
        description: "True only if the clip shows real, continuous motion and has none of the listed defects.",
      },
      reason: {
        type: "string",
        description: "If passed is false, a short (one sentence) plain-English reason a human could act on.",
      },
    },
    required: ["passed"],
    additionalProperties: false,
  },
  strict: true,
};

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg-static binary not found for this platform"));
      return;
    }
    const proc = spawn(ffmpegPath, args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

// Samples 3 frames spread across the real clip duration (not hardcoded
// timestamps) so this stays correct if HERO_STAGE_DURATION_SECONDS ever
// changes. Returns base64-encoded JPEGs, or null if extraction failed for
// any reason (download, ffmpeg, disk) — treated as "couldn't check", never
// as a failure of the clip itself.
async function extractFrames(videoUrl: string, durationSeconds: number): Promise<string[] | null> {
  let dir: string | null = null;
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Failed to download clip for QA (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    dir = await mkdtemp(path.join(tmpdir(), "hero-qa-"));
    const videoPath = path.join(dir, "clip.mp4");
    await writeFile(videoPath, buffer);

    const fractions = [0.1, 0.5, 0.85];
    const frames: string[] = [];
    for (let i = 0; i < fractions.length; i++) {
      const framePath = path.join(dir, `frame${i}.jpg`);
      const timestamp = Math.max(0, fractions[i] * durationSeconds).toFixed(2);
      await runFfmpeg(["-ss", timestamp, "-i", videoPath, "-frames:v", "1", "-q:v", "3", "-y", framePath]);
      frames.push((await readFile(framePath)).toString("base64"));
    }
    return frames;
  } catch (error) {
    console.error(`Hero clip frame extraction failed for QA (${videoUrl}):`, error);
    return null;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function qaCheckHeroClip(
  videoUrl: string,
  sourcePhotoUrl: string,
  durationSeconds: number
): Promise<HeroClipQAResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { passed: null };

  const frames = await extractFrames(videoUrl, durationSeconds);
  if (!frames || frames.length === 0) return { passed: null };

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 400,
      tools: [QA_TOOL],
      tool_choice: { type: "tool", name: "report_clip_quality" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "This is the original source photo, before any animation:" },
            { type: "image", source: { type: "url", url: sourcePhotoUrl } },
            { type: "text", text: `These are ${frames.length} frames sampled across the animated clip generated from that photo, in order:` },
            ...frames.map((data) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
            })),
            {
              type: "text",
              text: `Check this clip against these specific failure modes — each one has actually happened with this exact pipeline before:
1. No real motion — the frames look essentially identical (frozen/static), not a continuously animating clip.
2. A visible human hand, arm, or tool caught in the act of performing the work (even partially, even just entering frame).
3. A permanent architectural feature visible untouched in the source photo (e.g. a brick coping, corner post, stone trim) is covered or altered in these frames.
4. The underlying structure or geometry of the scene has visibly changed beyond the described surface-level transformation — it no longer reads as the same real place shown in the source photo.

Report passed: true only if NONE of these apply. If any apply, passed: false with a one-sentence reason.`,
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const input = toolUse?.input as { passed?: boolean; reason?: string } | undefined;
    if (typeof input?.passed !== "boolean") return { passed: null };
    return { passed: input.passed, note: input.passed ? undefined : input.reason };
  } catch (error) {
    console.error(`Hero clip QA vision check failed (${videoUrl}):`, error);
    return { passed: null };
  }
}
