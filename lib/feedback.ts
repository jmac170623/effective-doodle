import { generateSite } from "./siteGenerator";
import { STYLE_TOKENS } from "./styleTokens";
import { GeneratedSite, OnboardingData, ToneProfileId } from "./types";

const TONE_SHIFT_WARMER: ToneProfileId[] = ["friendly", "approachable"];
const TONE_SHIFT_SERIOUS: ToneProfileId[] = ["premium", "no-nonsense"];

const NAMED_COLORS: Record<string, string> = {
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
  pink: "#d1477a",
};

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

const COLOR_MENTION = /colou?r/;

interface FeedbackResult {
  generated: GeneratedSite;
  toneProfile: ToneProfileId;
  summary: string[];
}

export async function applyFeedback(
  onboarding: OnboardingData,
  currentGenerated: GeneratedSite,
  currentTone: ToneProfileId,
  message: string
): Promise<FeedbackResult> {
  const text = message.toLowerCase();
  const summary: string[] = [];
  let nextTone = currentTone;

  // 1. Tone adjustments — broad, forgiving phrasing rather than exact strings.
  const wantsWarmer = includesAny(text, [
    "too formal",
    "too stiff",
    "too cold",
    "too corporate",
    "too clinical",
    "too robotic",
    "boring",
    "more friendly",
    "friendlier",
    "warmer tone",
    "less serious",
    "feels flat",
    "lifeless",
  ]);
  const wantsSerious = includesAny(text, [
    "too casual",
    "unprofessional",
    "more professional",
    "more serious",
    "too silly",
    "more formal",
    "too chatty",
    "more polished",
    "more premium",
    "more upmarket",
    "sounds cheap",
  ]);
  const wantsDirect = includesAny(text, [
    "too soft",
    "more direct",
    "blunt",
    "no fluff",
    "get to the point",
    "too wordy",
    "less fluff",
    "straight to the point",
  ]);

  if (wantsWarmer && !TONE_SHIFT_WARMER.includes(nextTone)) {
    nextTone = "friendly";
    summary.push("Shifted the copy tone to be warmer and friendlier.");
  } else if (wantsSerious && !TONE_SHIFT_SERIOUS.includes(nextTone)) {
    nextTone = "premium";
    summary.push("Shifted the copy tone to be more professional and polished.");
  } else if (wantsDirect && nextTone !== "no-nonsense") {
    nextTone = "no-nonsense";
    summary.push("Made the copy more direct and to-the-point.");
  }

  // Regenerate base copy/style if the tone changed.
  let generated =
    nextTone !== currentTone
      ? await generateSite(onboarding, nextTone)
      : { ...currentGenerated, style: { ...currentGenerated.style } };

  // 2. Color adjustments.
  const mentionsColor = COLOR_MENTION.test(text);
  const mentionedColorName = Object.keys(NAMED_COLORS).find((color) => text.includes(color));

  const wantsMoreColor = includesAny(text, [
    "bland",
    "dull",
    "plain",
    "lifeless",
    "washed out",
    "not enough colour",
    "not enough color",
    "needs more colour",
    "needs more color",
    "add some colour",
    "add some color",
    "add colour",
    "add color",
    "lacking colour",
    "lacking color",
  ]);
  const wantsLessColor = includesAny(text, [
    "too much colour",
    "too much color",
    "too colourful",
    "too colorful",
    "overwhelming",
    "garish",
    "loud colours",
    "loud colors",
    "too busy",
  ]);
  const wantsBolder = includesAny(text, ["darker", "bolder", "more contrast", "too pastel", "too soft looking"]);
  const wantsBrighter = includesAny(text, ["brighter", "more vibrant", "more colourful", "more colorful", "pop more", "stand out more"]);
  const wantsWarmerPalette = includesAny(text, ["warmer colour", "warmer color", "warmer palette", "too cold looking", "too clinical looking"]);

  if (mentionedColorName && (mentionsColor || wantsMoreColor || wantsBrighter)) {
    generated = {
      ...generated,
      style: { ...generated.style, colorPrimary: NAMED_COLORS[mentionedColorName] },
    };
    summary.push(`Updated the primary color to ${mentionedColorName}.`);
  } else if (wantsMoreColor) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: STYLE_TOKENS.approachable.colorPrimary,
        colorAccent: STYLE_TOKENS.approachable.colorAccent,
      },
    };
    summary.push("Added more color — the palette felt flat, so we brightened it up.");
  } else if (wantsLessColor) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: STYLE_TOKENS.premium.colorPrimary,
        colorAccent: STYLE_TOKENS.premium.colorAccent,
      },
    };
    summary.push("Toned the palette down to something calmer and more restrained.");
  } else if (wantsBolder) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: STYLE_TOKENS["no-nonsense"].colorPrimary,
        colorAccent: STYLE_TOKENS["no-nonsense"].colorAccent,
      },
    };
    summary.push("Increased contrast with a bolder color palette.");
  } else if (wantsBrighter) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: STYLE_TOKENS.approachable.colorPrimary,
        colorAccent: STYLE_TOKENS.approachable.colorAccent,
      },
    };
    summary.push("Brightened up the color palette.");
  } else if (wantsWarmerPalette) {
    generated = {
      ...generated,
      style: {
        ...generated.style,
        colorPrimary: STYLE_TOKENS.friendly.colorPrimary,
        colorAccent: STYLE_TOKENS.friendly.colorAccent,
      },
    };
    summary.push("Warmed up the color palette.");
  }

  // 3. Motion / animation.
  const wantsMotion = includesAny(text, [
    "animation",
    "animations",
    "animated",
    "scroll effect",
    "scrolling effect",
    "while scrolling",
    "add movement",
    "add some life",
    "feels static",
    "too static",
    "more dynamic",
    "more lively",
  ]);
  const wantsLessMotion = includesAny(text, [
    "too much movement",
    "too much motion",
    "distracting animation",
    "stop moving",
    "too busy scrolling",
    "remove animation",
    "remove the animation",
    "dizzying",
  ]);

  if (wantsMotion) {
    generated = { ...generated, style: { ...generated.style, motion: "subtle" } };
    summary.push("Turned on subtle scroll animations to make the page feel less static.");
  } else if (wantsLessMotion) {
    generated = { ...generated, style: { ...generated.style, motion: "none" } };
    summary.push("Turned off scroll animations for a calmer, more static feel.");
  }

  // 4. Length adjustments.
  if (includesAny(text, ["too long", "shorter", "more concise", "trim it down", "cut it down", "condense", "less text"])) {
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

  // 5. Section emphasis.
  let emphasis = { ...generated.emphasis };
  if (
    includesAny(text, [
      "bigger gallery",
      "more photos",
      "more pictures",
      "more images",
      "show more work",
      "show off",
      "showcase more",
      "highlight gallery",
      "bigger portfolio",
    ])
  ) {
    emphasis = { ...emphasis, gallery: emphasis.gallery + 1 };
    summary.push("Gave the gallery more prominence.");
  }
  if (
    includesAny(text, [
      "focus on services",
      "more about services",
      "highlight services",
      "more info on services",
      "bigger services section",
    ])
  ) {
    emphasis = { ...emphasis, services: emphasis.services + 1 };
    summary.push("Gave the services section more prominence.");
  }
  if (includesAny(text, ["shorten about", "less about", "smaller about", "trim the about"])) {
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
