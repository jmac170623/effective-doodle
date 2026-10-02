import Anthropic from "@anthropic-ai/sdk";

/**
 * Looks at an actual stage/gallery photo and works out what physical
 * construction action would produce the exact result visible in it, so the
 * Higgsfield prompt describes that real action (render being chipped off,
 * mesh being bedded into a wall, joints being pointed, ...) instead of a
 * generic "subtle camera motion" line that doesn't fit any specific photo.
 * This has to work for any trade's photos, not just render/brickwork — the
 * model is given the photo itself and asked to infer the action, not a
 * fixed vocabulary.
 */

const MOTION_PROMPT_TOOL: Anthropic.Tool = {
  name: "describe_stage_motion",
  description: "Submit the motion description for animating this exact photo.",
  input_schema: {
    type: "object",
    properties: {
      motionPrompt: {
        type: "string",
        description:
          "2-3 imperative sentences describing the specific physical construction action to animate on this exact photo.",
      },
    },
    required: ["motionPrompt"],
    additionalProperties: false,
  },
  strict: true,
};

export function heroStageContextDescription(position: "start" | "middle" | "end"): string {
  if (position === "start") {
    return "the 'start' stage of a job — the state of this area before the work shown in later stages has begun";
  }
  if (position === "end") {
    return "the 'end' stage of a job — the finished, completed result";
  }
  return "a 'middle' stage of a job — work partway through, with new material or work visibly in progress";
}

export const GALLERY_PHOTO_CONTEXT_DESCRIPTION =
  "a photo from this business's project gallery, showing a job either in progress or its finished result";

/**
 * Returns a ready-to-use motion description for this exact photo, or null
 * on any failure (no API key, network error, refusal) so callers can fall
 * back to a generic prompt instead of breaking animation generation.
 */
export async function describeStageMotion(
  imageUrl: string,
  contextDescription: string,
  trade: string
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 500,
      tools: [MOTION_PROMPT_TOOL],
      tool_choice: { type: "tool", name: "describe_stage_motion" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text: `This photo is from a ${trade} business's website and shows ${contextDescription}. Look closely at exactly what's visible — the materials, surfaces and state of the work — and work out what physical construction action was just done, or is being done, to produce what's shown. Then write a short, concrete motion description (2-3 imperative sentences) instructing an AI video model to animate that exact physical process happening on this exact photo — for example material being chipped or stripped away and falling, a material being applied, pressed or spread onto a surface, joints being pointed or finished, a surface being smoothed, dust or debris settling, etc. — whatever genuinely matches what's in this specific photo. Only describe motion of things already visible in the photo; do not invent new people, tools or objects that aren't already implied by the scene. The description must keep the camera framing, geometry and every other part of the scene unchanged apart from the one physical action you describe.`,
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const input = toolUse?.input as { motionPrompt?: string } | undefined;
    const motionPrompt = input?.motionPrompt?.trim();
    return motionPrompt || null;
  } catch (error) {
    console.error("Hero stage motion analysis failed, falling back to generic prompt:", error);
    return null;
  }
}
