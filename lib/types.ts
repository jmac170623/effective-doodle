// Shared domain types for the trade website generator.

export type ToneProfileId =
  | "friendly"
  | "no-nonsense"
  | "premium"
  | "approachable";

export interface ToneProfile {
  id: ToneProfileId;
  label: string;
  description: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  // Left optional for the future quoting/merchant module — unused in Phase 1.
  priceFrom?: number;
  unit?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
}

export interface QuizAnswers {
  feeling: string;
  phrase: string;
  oneWordDescriptor: string;
  priority: string;
}

export interface OnboardingData {
  // Basic info
  fullName: string;
  age?: number;
  trade: string;
  yearsExperience: number;
  businessName: string;
  areaCovered: string;

  // Contact
  phone: string;
  email: string;
  social: SocialLinks;

  // Services
  services: ServiceItem[];

  // About
  aboutText: string;

  // Personality quiz
  quiz: QuizAnswers;
}

export interface GalleryPlaceholder {
  id: string;
  label: string;
  kind: "before" | "after" | "featured";
}

export interface GeneratedCopy {
  heroHeadline: string;
  heroSubheadline: string;
  heroCta: string;
  aboutHeading: string;
  aboutBody: string;
  servicesHeading: string;
  servicesIntro: string;
  galleryHeading: string;
  galleryIntro: string;
  contactHeading: string;
  contactIntro: string;
  footerNote: string;
}

export interface StyleTokens {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorMuted: string;
  fontHeading: string;
  fontBody: string;
  radius: string;
  density: "compact" | "cozy" | "spacious";
}

export interface SectionEmphasis {
  gallery: number;
  services: number;
  about: number;
}

export interface GeneratedSite {
  toneProfile: ToneProfileId;
  copy: GeneratedCopy;
  style: StyleTokens;
  gallery: GalleryPlaceholder[];
  emphasis: SectionEmphasis;
}

export interface FeedbackRound {
  id: string;
  createdAt: string;
  message: string;
  adjustmentsSummary: string[];
}

export type SiteStatus = "draft" | "published";

export interface SiteRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SiteStatus;
  onboarding: OnboardingData;
  generated: GeneratedSite;
  feedbackHistory: FeedbackRound[];
}
