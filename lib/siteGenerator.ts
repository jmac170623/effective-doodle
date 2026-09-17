import {
  GalleryPlaceholder,
  GeneratedCopy,
  GeneratedSite,
  OnboardingData,
  ToneProfileId,
} from "./types";
import { PALETTE_VARIANTS } from "./styleTokens";
import { TONE_PROFILES } from "./toneProfiles";
import { generateId } from "./idGen";
import { generateCopyWithAI } from "./aiCopywriter";

function tradeNoun(trade: string): string {
  return trade.trim() || "tradesperson";
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Deterministic per-business variant selection: the same business always
// regenerates the same copy, but different businesses of the same tone
// read differently instead of all sounding identical.
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickVariant<T>(variants: T[], seed: string): T {
  return variants[hashString(seed) % variants.length];
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

interface HeroCopy {
  headline: string;
  subheadline: string;
  cta: string;
}

const HERO_VARIANTS: Record<ToneProfileId, ((data: OnboardingData, trade: string, area: string) => HeroCopy)[]> = {
  "no-nonsense": [
    (data, trade, area) => ({
      headline: `${data.businessName}. ${capitalize(trade)} work, done right.`,
      subheadline: `${data.yearsExperience}+ years serving ${area}. No callbacks, no excuses — just the job done properly.`,
      cta: "Get a Quote",
    }),
    (data, trade, area) => ({
      headline: `${capitalize(trade)}s who show up and get it done`,
      subheadline: `${data.businessName} — ${data.yearsExperience}+ years, ${area}. Straight quotes, no hard sell.`,
      cta: "Request a Quote",
    }),
    (data, trade, area) => ({
      headline: `No-nonsense ${trade} work in ${area}`,
      subheadline: `${data.businessName} has been doing this for ${data.yearsExperience}+ years. Fair price, job done right, first time.`,
      cta: "Book the Job",
    }),
  ],
  premium: [
    (data, trade, area) => ({
      headline: `Expert ${trade} craftsmanship in ${area}`,
      subheadline: `${data.businessName} brings ${data.yearsExperience}+ years of precision and care to every project — the details make the difference.`,
      cta: "Request a Consultation",
    }),
    (data, trade, area) => ({
      headline: `${data.businessName} — precision ${trade} work, ${area}`,
      subheadline: `${data.yearsExperience}+ years perfecting the craft. Every project treated with the same meticulous care.`,
      cta: "Arrange a Consultation",
    }),
    (data, trade, area) => ({
      headline: `Considered, careful ${trade} work in ${area}`,
      subheadline: `With ${data.yearsExperience}+ years behind them, ${data.businessName} brings a level of finish that speaks for itself.`,
      cta: "Discuss Your Project",
    }),
  ],
  approachable: [
    (data, trade, area) => ({
      headline: `Hi, we're ${data.businessName} — your local ${trade} team`,
      subheadline: `Been looking after ${area} for ${data.yearsExperience}+ years. Friendly faces, honest work, no awkward jargon.`,
      cta: "Say Hello",
    }),
    (data, trade, area) => ({
      headline: `${data.businessName} — your friendly neighbourhood ${trade}`,
      subheadline: `${data.yearsExperience}+ years serving ${area}, one relaxed conversation at a time.`,
      cta: "Get In Touch",
    }),
    (data, trade, area) => ({
      headline: `${capitalize(trade)} help, without the hassle`,
      subheadline: `${data.businessName} has been the go-to in ${area} for ${data.yearsExperience}+ years — easy to talk to, easier to work with.`,
      cta: "Drop Us a Line",
    }),
  ],
  friendly: [
    (data, trade, area) => ({
      headline: `${data.businessName} — ${trade} you can trust in ${area}`,
      subheadline: `${data.yearsExperience}+ years of happy customers. We treat your home like our own.`,
      cta: "Get in Touch",
    }),
    (data, trade, area) => ({
      headline: `Trusted ${trade} services in ${area}`,
      subheadline: `${data.businessName} has been putting customers first for ${data.yearsExperience}+ years — friendly service, honest advice.`,
      cta: "Reach Out",
    }),
    (data, trade, area) => ({
      headline: `${data.businessName} — here to help in ${area}`,
      subheadline: `${data.yearsExperience}+ years of doing right by our customers. Come say hi.`,
      cta: "Get a Free Quote",
    }),
  ],
};

function buildHeroCopy(tone: ToneProfileId, data: OnboardingData): HeroCopy {
  const trade = tradeNoun(data.trade);
  const area = data.areaCovered.trim();
  const variant = pickVariant(HERO_VARIANTS[tone], `${data.businessName}|hero`);
  return variant(data, trade, area);
}

interface SectionCopy {
  aboutHeading: string;
  servicesHeading: string;
  servicesIntro: string;
  galleryHeading: string;
  galleryIntro: string;
  contactHeading: string;
  contactIntro: string;
  footerNote: string;
}

const SECTION_VARIANTS: Record<ToneProfileId, ((data: OnboardingData, trade: string) => SectionCopy)[]> = {
  "no-nonsense": [
    (data, trade) => ({
      aboutHeading: "Who We Are",
      servicesHeading: "What We Do",
      servicesIntro: `Straightforward ${trade} services, priced fairly and finished on time.`,
      galleryHeading: "The Work",
      galleryIntro: "Real jobs. Real results. Photos coming soon.",
      contactHeading: "Get In Touch",
      contactIntro: "Need it sorted? Send the details and we'll get back to you fast.",
      footerNote: `${data.businessName} — serving ${data.areaCovered}.`,
    }),
    (data, trade) => ({
      aboutHeading: "The Short Version",
      servicesHeading: "Services",
      servicesIntro: `${capitalize(trade)} work, done properly. Here's what's on offer.`,
      galleryHeading: "Recent Jobs",
      galleryIntro: "No filler. Just the work.",
      contactHeading: "Get A Quote",
      contactIntro: "Tell us what you need and we'll get back to you fast — no waiting around.",
      footerNote: `${data.businessName} · ${data.areaCovered}`,
    }),
  ],
  premium: [
    (data, trade) => ({
      aboutHeading: "Our Story",
      servicesHeading: "Services",
      servicesIntro: `A considered range of ${trade} services, each delivered with meticulous attention to detail.`,
      galleryHeading: "Our Craftsmanship",
      galleryIntro: "A showcase of recent projects — before and after photography added as jobs complete.",
      contactHeading: "Start a Conversation",
      contactIntro: "Tell us about your project and we'll arrange a time to discuss it properly.",
      footerNote: `${data.businessName} · ${data.areaCovered} · Est. quality since day one.`,
    }),
    (data, trade) => ({
      aboutHeading: "About",
      servicesHeading: "What We Offer",
      servicesIntro: `Every ${trade} service is approached with the same care and attention to detail.`,
      galleryHeading: "Selected Work",
      galleryIntro: "A curated look at recent projects, added as they're completed.",
      contactHeading: "Enquire",
      contactIntro: "Share a few details about your project and we'll be in touch to discuss it.",
      footerNote: `${data.businessName} — ${data.areaCovered}`,
    }),
  ],
  approachable: [
    (data, trade) => ({
      aboutHeading: "A Bit About Us",
      servicesHeading: "How We Can Help",
      servicesIntro: `Here's what our ${trade} team gets up to — get in touch if you don't see what you need.`,
      galleryHeading: "See Our Work",
      galleryIntro: "A few snaps from recent jobs — more going up soon!",
      contactHeading: "Let's Chat",
      contactIntro: "Drop us a message any time — we're always happy to help.",
      footerNote: `${data.businessName} — proudly serving ${data.areaCovered}.`,
    }),
    (data, trade) => ({
      aboutHeading: "Meet the Team",
      servicesHeading: "What We Do",
      servicesIntro: `A friendly ${trade} team ready to help — just ask if you need something else.`,
      galleryHeading: "Our Work",
      galleryIntro: "A peek at some recent jobs — check back for more!",
      contactHeading: "Say Hi",
      contactIntro: "Whatever you need, drop us a line — we don't bite.",
      footerNote: `${data.businessName} — ${data.areaCovered} and around.`,
    }),
  ],
  friendly: [
    (data, trade) => ({
      aboutHeading: "About Us",
      servicesHeading: "Our Services",
      servicesIntro: `Everything you need from a trusted ${trade}, all in one place.`,
      galleryHeading: "Recent Jobs",
      galleryIntro: "A look at some of our recent work — before and after photos added as we go.",
      contactHeading: "Get In Touch",
      contactIntro: "Have a question or want a quote? We'd love to hear from you.",
      footerNote: `${data.businessName} — happy to help in ${data.areaCovered}.`,
    }),
    (data, trade) => ({
      aboutHeading: "Who We Are",
      servicesHeading: "What We Offer",
      servicesIntro: `A full range of ${trade} services, delivered with a smile.`,
      galleryHeading: "Our Recent Work",
      galleryIntro: "A few highlights from jobs we've loved working on.",
      contactHeading: "Reach Out",
      contactIntro: "We're always happy to chat through what you need — get in touch any time.",
      footerNote: `${data.businessName} — serving ${data.areaCovered} with a smile.`,
    }),
  ],
};

function buildSectionCopy(tone: ToneProfileId, data: OnboardingData): SectionCopy {
  const trade = tradeNoun(data.trade);
  const variant = pickVariant(SECTION_VARIANTS[tone], `${data.businessName}|sections`);
  return variant(data, trade);
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

function buildTemplateCopy(onboarding: OnboardingData, toneProfile: ToneProfileId): GeneratedCopy {
  const hero = buildHeroCopy(toneProfile, onboarding);
  const sections = buildSectionCopy(toneProfile, onboarding);

  return {
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
}

export async function generateSite(
  onboarding: OnboardingData,
  toneProfile: ToneProfileId
): Promise<GeneratedSite> {
  const copy =
    (await generateCopyWithAI(onboarding, TONE_PROFILES[toneProfile])) ??
    buildTemplateCopy(onboarding, toneProfile);

  return {
    toneProfile,
    copy,
    style: pickVariant(PALETTE_VARIANTS[toneProfile], `${onboarding.businessName}|palette`),
    gallery: buildGallery(onboarding),
    emphasis: { gallery: 1, services: 1, about: 1 },
  };
}
