import Anthropic from "@anthropic-ai/sdk";
import { GeneratedCopy, OnboardingData, ToneProfile } from "./types";

const COPY_FIELDS = [
  "heroHeadline",
  "heroSubheadline",
  "heroCta",
  "aboutHeading",
  "aboutBody",
  "servicesHeading",
  "servicesIntro",
  "galleryHeading",
  "galleryIntro",
  "contactHeading",
  "contactIntro",
  "footerNote",
] as const;

const WRITE_COPY_TOOL: Anthropic.Tool = {
  name: "write_site_copy",
  description: "Submit the finished website copy for this tradesperson's site.",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(
      COPY_FIELDS.map((field) => [field, { type: "string", description: `The ${field} field.` }])
    ),
    required: [...COPY_FIELDS],
    additionalProperties: false,
  },
  strict: true,
};

function buildPrompt(onboarding: OnboardingData, tone: ToneProfile): string {
  const lines: string[] = [
    `Business name: ${onboarding.businessName}`,
    `Trade: ${onboarding.trade}`,
    `Owner's name: ${onboarding.fullName}`,
    `Years of experience: ${onboarding.yearsExperience}`,
    `Area covered: ${onboarding.areaCovered}`,
    `Services offered: ${onboarding.services.map((s) => s.name + (s.description ? ` (${s.description})` : "")).join("; ")}`,
    ``,
    `In their own words, how they'd describe their business:`,
    `"${onboarding.aboutText}"`,
  ];

  if (onboarding.proudMoment) {
    lines.push(``, `A job or customer moment they're proud of:`, `"${onboarding.proudMoment}"`);
  }
  if (onboarding.uniqueFact) {
    lines.push(``, `Something distinctive about them or the business:`, `"${onboarding.uniqueFact}"`);
  }

  lines.push(
    ``,
    `Target tone: ${tone.label} — ${tone.description}`,
    ``,
    `Write copy that could only belong to this specific business — weave in the concrete details above rather than writing generically about "a trusted tradesperson." Match the target tone precisely. For aboutBody specifically, stay grounded in their own words above: lightly polish grammar and flow but keep it recognizably their voice, don't rewrite it into generic marketing copy. UK English. Plain text only, no markdown formatting, no emoji.`
  );

  return lines.join("\n");
}

/**
 * Returns AI-written copy for this specific business, or null on any
 * failure (no API key, network error, malformed response) so callers can
 * fall back to the template-based generator without breaking site generation.
 */
export async function generateCopyWithAI(
  onboarding: OnboardingData,
  tone: ToneProfile
): Promise<GeneratedCopy | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      tools: [WRITE_COPY_TOOL],
      tool_choice: { type: "tool", name: "write_site_copy" },
      messages: [{ role: "user", content: buildPrompt(onboarding, tone) }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) return null;

    const input = toolUse.input as Record<string, unknown>;
    for (const field of COPY_FIELDS) {
      if (typeof input[field] !== "string" || !input[field]) return null;
    }

    return input as unknown as GeneratedCopy;
  } catch (error) {
    console.error("AI copywriter failed, falling back to templates:", error);
    return null;
  }
}
