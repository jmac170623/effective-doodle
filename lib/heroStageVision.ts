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
              text: `This photo is from a ${trade} business's website and shows ${contextDescription}. Look very carefully at exactly what is already visible in THIS specific photo — the materials, surfaces, and the precise current state of the work — before deciding what to animate.

Critical rules, because this clip sits between other stage photos and any mismatch will be obvious:
1. Never invent removal or addition of structural material (bricks, blocks, large sections of a wall or surface) that isn't plausible given the photo and its stage. If the surface is already a clean, modern finished material with nothing old or worn about it, don't invent further material being stripped away or appearing — that would contradict what the photo shows.
2. An "old/weathered/worn" surface in a "start" stage photo is itself evidence that old material was just removed to reach this state — you don't need to see loose debris or a tool in frame for that. In that case, animate a thin layer of that old material still breaking apart and flaking/falling away, settling into exactly the state shown by the end of the clip. Likewise, any photo (start, middle, or end) that shows clear signs of work actively mid-process — a wet surface, a tool mid-use, debris still settling — should have that exact process continuing.
3. Identify any part of the frame that is a permanent, never-worked architectural feature distinct from the surface being worked on — a brick coping or cap along the top, a brick pier or corner post, stone trim, a different material border. These never change in ANY stage of this job (they are not being rendered, chipped, or touched at all) — the described motion must leave them completely untouched in every single frame, even though it should otherwise cover the FULL extent of the surface that genuinely is being worked on. Covering a permanent feature like this is wrong even for a moment partway through the clip, not just at the end.
4. If nothing above applies and the photo shows a plain, static, settled state, describe only ambient, true-to-life motion instead — dust or light shifting, very subtle settling movement, a slow camera move. Whatever motion you describe, it must engage the full extent of the actual working surface, not just a small corner or isolated patch of it.
5. Never change the underlying structure, layout, or materials of what's shown — the result must still visually match this exact photo in every frame, at every point in the clip.
6. For an "end"/finished stage specifically, consider a cinematic finishing touch where it's plausible for the material shown: a freshly applied material (render, paint, sealant, concrete) visibly settling, drying or curing with its color subtly shifting as it does, or natural light itself shifting — e.g. a slow timelapse-style transition toward evening, with shadows lengthening and the light warming and dimming. Only do this if it suits the material and stage; don't force it onto a photo where it wouldn't make sense (e.g. a material that doesn't visibly dry or cure).

Write a short, concrete motion description (2-3 imperative sentences) for an AI video model to animate this exact photo accordingly. Only describe motion of things already visible in the photo; do not invent new people, tools, or objects. Keep the camera framing, geometry and every other part of the scene unchanged apart from the motion you describe.`,
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
