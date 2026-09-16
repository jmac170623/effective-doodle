import { generateSite } from "./siteGenerator";
import { STYLE_TOKENS } from "./styleTokens";
import { GeneratedSite, OnboardingData, ToneProfileId } from "./types";

const TONE_SHIFT_WARMER: ToneProfileId[] = ["friendly", "approachable"];
const TONE_SHIFT_SERIOUS: ToneProfileId[] = ["premium", "no-nonsense"];

const COLOR_KEYWORDS: Record<string, string> = {
  blue: "#2f7ea3",
  green: "#2f8f6e",
  red: "#d62828",
  orange: "#e8734a",
  purple: "#6c4f9c",
  black: "#111318",
  navy: "#101828",
  gold: "#b08d57",
  yellow: "#f2b134",
  teal: "#1f7a72",
};

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

interface FeedbackResult {
  generated: GeneratedSite;
  toneProfile: ToneProfileId;
  summary: string[];
}

export function applyFeedback(
  onboarding: OnboardingData,
  currentGenerated: GeneratedSite,
  currentTone: ToneProfileId,
  message: string
): FeedbackResult {
  const text = message.toLowerCase();
  const summary: string[] = [];
  let nextTone = currentTone;

  // 1. Tone adjustments
  if (includesAny(text, ["too formal", "too stiff", "too cold", "boring", "more friendly", "friendlier", "warmer tone", "less serious"])) {
    if (!TONE_SHIFT_WARMER.includes(nextTone)) {
      nextTone = "friendly";
      summary.push("Shifted the copy tone to be warmer and friendlier.");
    }
  } else if (includesAny(text, ["too casual", "unprofessional", "more professional", "more serious", "too silly", "more formal"])) {
    if (!TONE_SHIFT_SERIOUS.includes(nextTone)) {
      nextTone = "premium";
      summary.push("Shifted the copy tone to be more professional and polished.");
    }
  } else if (includesAny(text, ["too soft", "more direct", "blunt", "no fluff", "get to the point"])) {
    if (nextTone !== "no-nonsense") {
      nextTone = "no-nonsense";
      summary.push("Made the copy more direct and to-the-point.");
    }
  }

  // Regenerate base copy/style if the tone changed.
  let generated =
    nextTone !== currentTone
      ? generateSite(onboarding, nextTone)
      : { ...currentGenerated, style: { ...currentGenerated.style } };

  // 2. Color overrides (explicit color name mentioned)
  const mentionedColor = Object.keys(COLOR_KEYWORDS).find((color) => text.includes(color));
  if (mentionedColor && includesAny(text, ["colour", "color"])) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: COLOR_KEYWORDS[mentionedColor],
      },
    };
    summary.push(`Updated the primary color to ${mentionedColor}.`);
  } else if (includesAny(text, ["darker", "bolder", "more contrast"])) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: STYLE_TOKENS["no-nonsense"].colorPrimary,
        colorAccent: STYLE_TOKENS["no-nonsense"].colorAccent,
      },
    };
    summary.push("Increased contrast with a bolder color palette.");
  } else if (includesAny(text, ["brighter", "more colourful", "more colorful", "more vibrant"])) {
    generated = { ...generated, style: { ...generated.style, colorPrimary: STYLE_TOKENS.approachable.colorPrimary, colorAccent: STYLE_TOKENS.approachable.colorAccent } };
    summary.push("Brightened up the color palette.");
  } else if (includesAny(text, ["warmer colour", "warmer color", "warmer palette"])) {
    generated = { ...generated, style: { ...generated.style, colorPrimary: STYLE_TOKENS.friendly.colorPrimary, colorAccent: STYLE_TOKENS.friendly.colorAccent } };
    summary.push("Warmed up the color palette.");
  }

  // 3. Length adjustments
  if (includesAny(text, ["too long", "shorter", "more concise", "trim it down"])) {
    generated = {
      ...generated,
      copy: {
        ...generated.copy,
        heroSubheadline: truncateToSentence(generated.copy.heroSubheadline),
        aboutBody: truncateToSentence(generated.copy.aboutBody),
      },
    };
    summary.push("Trimmed the copy to be more concise.");
  }

  // 4. Section emphasis
  let emphasis = { ...generated.emphasis };
  if (includesAny(text, ["bigger gallery", "more photos", "more pictures", "show more work", "show off"])) {
    emphasis = { ...emphasis, gallery: emphasis.gallery + 1 };
    summary.push("Gave the gallery more prominence.");
  }
  if (includesAny(text, ["focus on services", "more about services", "highlight services"])) {
    emphasis = { ...emphasis, services: emphasis.services + 1 };
    summary.push("Gave the services section more prominence.");
  }
  if (includesAny(text, ["shorten about", "less about", "smaller about"])) {
    emphasis = { ...emphasis, about: Math.max(0, emphasis.about - 1) };
    summary.push("Reduced emphasis on the about section.");
  }
  generated = { ...generated, emphasis };

  if (summary.length === 0) {
    summary.push("Noted your feedback — no automatic changes matched, but it's saved for the next revision.");
  }

  return { generated, toneProfile: nextTone, summary };
}

function truncateToSentence(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 1) return text;
  return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ");
}
