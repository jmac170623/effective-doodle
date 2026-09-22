import Anthropic from "@anthropic-ai/sdk";
import { OnboardingData } from "./types";

/**
 * Proofreads the free-text answers from onboarding — spelling, punctuation,
 * capitalization only — before they're used to generate (or regenerate) a
 * site. Tradespeople often fill this in quickly on a phone; typos and
 * missing punctuation in the business name, trade, area, or about text
 * would otherwise go straight onto the live site verbatim. Never touches
 * phone/email/social links (format-validated separately) or the quiz's
 * multiple-choice answers.
 */

const CLEANUP_TOOL: Anthropic.Tool = {
  name: "correct_onboarding_text",
  description:
    "Return corrected versions of this tradesperson's onboarding answers, fixing only genuine spelling, punctuation, and capitalization errors.",
  input_schema: {
    type: "object",
    properties: {
      fullName: { type: "string" },
      businessName: { type: "string" },
      trade: { type: "string" },
      areaCovered: { type: "string" },
      aboutText: { type: "string" },
      proudMoment: { type: "string", description: "Empty string if not provided." },
      uniqueFact: { type: "string", description: "Empty string if not provided." },
      oneWordDescriptor: { type: "string" },
      services: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string", description: "Empty string if not provided." },
          },
          required: ["name", "description"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "fullName",
      "businessName",
      "trade",
      "areaCovered",
      "aboutText",
      "proudMoment",
      "uniqueFact",
      "oneWordDescriptor",
      "services",
    ],
    additionalProperties: false,
  },
  strict: true,
};

function buildPrompt(data: OnboardingData): string {
  return [
    `These are raw answers a tradesperson typed into a website-builder form, often quickly on a phone. Correct spelling, punctuation, and capitalization mistakes only.`,
    ``,
    `Do NOT: rewrite phrasing, change meaning, add or remove information, fix things that are already correct, or "improve" wording stylistically. Do NOT alter an unconventional business name, brand name, or stylized spelling (e.g. "KwikFix", "AJ's") even if it looks unusual — only fix things that are clearly accidental errors (missing capital letters, double spaces, missing full stops, misspelled ordinary words).`,
    ``,
    `Full name: ${data.fullName}`,
    `Business name: ${data.businessName}`,
    `Trade: ${data.trade}`,
    `Area covered: ${data.areaCovered}`,
    `About text: ${data.aboutText}`,
    `Proud moment: ${data.proudMoment ?? ""}`,
    `Unique fact: ${data.uniqueFact ?? ""}`,
    `One-word descriptor: ${data.quiz.oneWordDescriptor}`,
    `Services: ${JSON.stringify(data.services.map((s) => ({ name: s.name, description: s.description ?? "" })))}`,
  ].join("\n");
}

/**
 * Returns a corrected copy of the onboarding data, or the original data
 * unchanged on any failure (no API key, network error, malformed response)
 * so a proofreading hiccup never blocks site generation.
 */
export async function correctOnboardingText(data: OnboardingData): Promise<OnboardingData> {
  if (!process.env.ANTHROPIC_API_KEY) return data;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      tools: [CLEANUP_TOOL],
      tool_choice: { type: "tool", name: "correct_onboarding_text" },
      messages: [{ role: "user", content: buildPrompt(data) }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) return data;

    const input = toolUse.input as {
      fullName: string;
      businessName: string;
      trade: string;
      areaCovered: string;
      aboutText: string;
      proudMoment: string;
      uniqueFact: string;
      oneWordDescriptor: string;
      services: { name: string; description: string }[];
    };

    if (input.services.length !== data.services.length) return data;

    return {
      ...data,
      fullName: input.fullName || data.fullName,
      businessName: input.businessName || data.businessName,
      trade: input.trade || data.trade,
      areaCovered: input.areaCovered || data.areaCovered,
      aboutText: input.aboutText || data.aboutText,
      proudMoment: data.proudMoment ? input.proudMoment || data.proudMoment : undefined,
      uniqueFact: data.uniqueFact ? input.uniqueFact || data.uniqueFact : undefined,
      quiz: { ...data.quiz, oneWordDescriptor: input.oneWordDescriptor || data.quiz.oneWordDescriptor },
      services: data.services.map((s, i) => ({
        ...s,
        name: input.services[i]?.name || s.name,
        description: s.description ? input.services[i]?.description || s.description : undefined,
      })),
    };
  } catch (error) {
    console.error("Onboarding text cleanup failed, using answers as typed:", error);
    return data;
  }
}
