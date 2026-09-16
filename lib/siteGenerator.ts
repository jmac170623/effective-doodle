import {
  GalleryPlaceholder,
  GeneratedCopy,
  GeneratedSite,
  OnboardingData,
  ToneProfileId,
} from "./types";
import { STYLE_TOKENS } from "./styleTokens";
import { generateId } from "./idGen";

function tradeNoun(trade: string): string {
  return trade.trim() || "tradesperson";
}

function polishAbout(rawText: string, businessName: string): string {
  let text = rawText.trim();
  if (!text) {
    return `${businessName} is committed to doing the job right, every time.`;
  }
  // Light polish only: fix spacing/capitalization, keep the owner's own words.
  text = text.replace(/\s+/g, " ");
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(text)) {
    text += ".";
  }
  return text;
}

function buildHeroCopy(
  tone: ToneProfileId,
  data: OnboardingData
): { headline: string; subheadline: string; cta: string } {
  const trade = tradeNoun(data.trade);
  const area = data.areaCovered.trim();
  const years = data.yearsExperience;

  switch (tone) {
    case "no-nonsense":
      return {
        headline: `${data.businessName}. ${capitalize(trade)} work, done right.`,
        subheadline: `${years}+ years serving ${area}. No callbacks, no excuses — just the job done properly.`,
        cta: "Get a Quote",
      };
    case "premium":
      return {
        headline: `Expert ${trade} craftsmanship in ${area}`,
        subheadline: `${data.businessName} brings ${years}+ years of precision and care to every project — the details make the difference.`,
        cta: "Request a Consultation",
      };
    case "approachable":
      return {
        headline: `Hi, we're ${data.businessName} — your local ${trade} team`,
        subheadline: `Been looking after ${area} for ${years}+ years. Friendly faces, honest work, no awkward jargon.`,
        cta: "Say Hello",
      };
    case "friendly":
    default:
      return {
        headline: `${data.businessName} — ${trade} you can trust in ${area}`,
        subheadline: `${years}+ years of happy customers. We treat your home like our own.`,
        cta: "Get in Touch",
      };
  }
}

function buildSectionCopy(tone: ToneProfileId, data: OnboardingData) {
  const trade = tradeNoun(data.trade);

  const templates: Record<
    ToneProfileId,
    {
      aboutHeading: string;
      servicesHeading: string;
      servicesIntro: string;
      galleryHeading: string;
      galleryIntro: string;
      contactHeading: string;
      contactIntro: string;
      footerNote: string;
    }
  > = {
    "no-nonsense": {
      aboutHeading: "Who We Are",
      servicesHeading: "What We Do",
      servicesIntro: `Straightforward ${trade} services, priced fairly and finished on time.`,
      galleryHeading: "The Work",
      galleryIntro: "Real jobs. Real results. Photos coming soon.",
      contactHeading: "Get In Touch",
      contactIntro: "Need it sorted? Send the details and we'll get back to you fast.",
      footerNote: `${data.businessName} — serving ${data.areaCovered}.`,
    },
    premium: {
      aboutHeading: "Our Story",
      servicesHeading: "Services",
      servicesIntro: `A considered range of ${trade} services, each delivered with meticulous attention to detail.`,
      galleryHeading: "Our Craftsmanship",
      galleryIntro: "A showcase of recent projects — before and after photography added as jobs complete.",
      contactHeading: "Start a Conversation",
      contactIntro: "Tell us about your project and we'll arrange a time to discuss it properly.",
      footerNote: `${data.businessName} · ${data.areaCovered} · Est. quality since day one.`,
    },
    approachable: {
      aboutHeading: "A Bit About Us",
      servicesHeading: "How We Can Help",
      servicesIntro: `Here's what our ${trade} team gets up to — get in touch if you don't see what you need.`,
      galleryHeading: "See Our Work",
      galleryIntro: "A few snaps from recent jobs — more going up soon!",
      contactHeading: "Let's Chat",
      contactIntro: "Drop us a message any time — we're always happy to help.",
      footerNote: `${data.businessName} — proudly serving ${data.areaCovered}.`,
    },
    friendly: {
      aboutHeading: "About Us",
      servicesHeading: "Our Services",
      servicesIntro: `Everything you need from a trusted ${trade}, all in one place.`,
      galleryHeading: "Recent Jobs",
      galleryIntro: "A look at some of our recent work — before and after photos added as we go.",
      contactHeading: "Get In Touch",
      contactIntro: "Have a question or want a quote? We'd love to hear from you.",
      footerNote: `${data.businessName} — happy to help in ${data.areaCovered}.`,
    },
  };

  return templates[tone];
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function buildGallery(data: OnboardingData): GalleryPlaceholder[] {
  const topServices = data.services.slice(0, 3);
  const slots: GalleryPlaceholder[] = [];

  const serviceNames = topServices.length > 0
    ? topServices.map((s) => s.name)
    : [tradeNoun(data.trade)];

  serviceNames.forEach((name) => {
    slots.push({
      id: generateId("gal"),
      label: `Before — ${name}`,
      kind: "before",
    });
    slots.push({
      id: generateId("gal"),
      label: `After — ${name}`,
      kind: "after",
    });
  });

  slots.push({
    id: generateId("gal"),
    label: "Featured project",
    kind: "featured",
  });

  return slots;
}

export function generateSite(
  onboarding: OnboardingData,
  toneProfile: ToneProfileId
): GeneratedSite {
  const hero = buildHeroCopy(toneProfile, onboarding);
  const sections = buildSectionCopy(toneProfile, onboarding);

  const copy: GeneratedCopy = {
    heroHeadline: hero.headline,
    heroSubheadline: hero.subheadline,
    heroCta: hero.cta,
    aboutHeading: sections.aboutHeading,
    aboutBody: polishAbout(onboarding.aboutText, onboarding.businessName),
    servicesHeading: sections.servicesHeading,
    servicesIntro: sections.servicesIntro,
    galleryHeading: sections.galleryHeading,
    galleryIntro: sections.galleryIntro,
    contactHeading: sections.contactHeading,
    contactIntro: sections.contactIntro,
    footerNote: sections.footerNote,
  };

  return {
    toneProfile,
    copy,
    style: STYLE_TOKENS[toneProfile],
    gallery: buildGallery(onboarding),
    emphasis: { gallery: 1, services: 1, about: 1 },
  };
}
