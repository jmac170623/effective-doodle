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
  // Optional day rate used by the quote calculator; a trade-based default
  // is used when left blank.
  dayRate?: number;

  // Contact
  phone: string;
  email: string;
  social: SocialLinks;

  // Services
  services: ServiceItem[];

  // About
  aboutText: string;
  // Optional richer material for the AI copywriter to draw on — a specific
  // story rather than generic self-description.
  proudMoment?: string;
  uniqueFact?: string;

  // Personality quiz
  quiz: QuizAnswers;
}

export interface GalleryPlaceholder {
  id: string;
  label: string;
  kind: "before" | "after" | "featured";
}

export interface SiteImage {
  id: string;
  siteId: string;
  url: string;
  caption?: string;
  sortOrder: number;
  createdAt: string;
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
  motion: "none" | "subtle";
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

export type BillingStatus = "unpaid" | "active" | "past_due" | "canceled";

export interface SiteRecord {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  status: SiteStatus;
  onboarding: OnboardingData;
  generated: GeneratedSite;
  feedbackHistory: FeedbackRound[];
  billingStatus: BillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Paid animation credits beyond the free-per-site cap (see lib/animationLimits.ts).
  animationCredits: number;
  // Attached by API routes that fetch it separately (site_images is its own
  // table, not a column on sites) — absent unless the caller populated it.
  images?: SiteImage[];
}

// ---- Higgsfield photo-to-video animations ----
// Each site gets a small number of free animations (see FREE_ANIMATION_CAP
// in lib/animationLimits.ts); beyond that, animating a photo consumes a
// purchased credit (one-time Stripe payment) instead.

export type AnimationStatus = "processing" | "completed" | "failed";

export interface SiteAnimation {
  id: string;
  siteId: string;
  imageId: string;
  status: AnimationStatus;
  videoUrl?: string;
  usedCredit: boolean;
  createdAt: string;
}

// ---- Quote tool ----
// Materials are a shared catalog (not owned per-site) so the same merchant
// pricing feed can power every generated site at once — the "advertise
// your prices across every tradesperson site we generate" pitch.

export type TradeCategory = "plumbing" | "electrical" | "tiling" | "painting" | "general";

export type JobSize = "small" | "medium" | "large";

export interface Material {
  id: string;
  category: TradeCategory;
  name: string;
  unit: string;
  unitPrice: number;
  merchantLabel: string;
  suggestedQty: Record<JobSize, number>;
}

export interface QuoteLineItem {
  materialId: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  merchantLabel: string;
}

// A customer-entered area (e.g. "Kitchen", "Hallway") — the quote tool sums
// these into a total area rather than asking the customer to pick a
// materials quantity or a coarse small/medium/large size themselves.
export interface QuoteSection {
  id: string;
  label: string;
  areaSqm: number;
}

export interface QuoteBreakdown {
  category: TradeCategory;
  sections: QuoteSection[];
  areaSqm: number;
  lineItems: QuoteLineItem[];
  materialsTotal: number;
  labourDays: number;
  labourRate: number;
  labourTotal: number;
  grandTotalLow: number;
  grandTotalHigh: number;
}

export interface QuoteRequest {
  id: string;
  siteId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  breakdown: QuoteBreakdown;
}
