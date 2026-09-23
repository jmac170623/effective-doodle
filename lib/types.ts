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
  // Whether this round consumed a paid edit credit rather than a free one
  // (see lib/editLimits.ts). Absent on rounds created before this field existed.
  usedCredit?: boolean;
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
  // Paid AI-edit credits beyond the free-per-site cap (see lib/editLimits.ts).
  editCredits: number;
  // Attached by API routes that fetch it separately (site_images,
  // site_animations and site_hero_stages are their own tables) — absent
  // unless the caller populated them.
  images?: SiteImage[];
  animations?: SiteAnimation[];
  heroStages?: HeroStage[];

  // Custom domain — either connected (customer already owns it) or bought
  // through Vercel's Domain Registrar API (see lib/vercelDomains.ts).
  customDomain?: string;
  domainStatus: DomainStatus;
  domainSource?: DomainSource;
  // What the owner typed in onboarding when they said they'd like to buy a
  // domain but hadn't paid yet — prefills the manage dashboard's search box.
  desiredDomain?: string;
}

// ---- Custom domains ----

export type DomainStatus = "none" | "pending_dns" | "active" | "error";
export type DomainSource = "connected" | "purchased";

export type DomainPurchaseStatus = "pending_payment" | "purchasing" | "completed" | "failed" | "refunded";

export interface DomainRegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface DomainPurchase {
  id: string;
  siteId: string;
  domain: string;
  years: number;
  expectedPriceUsd: number;
  chargedPriceUsd: number;
  contact: DomainRegistrantContact;
  status: DomainPurchaseStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  vercelOrderId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Hero "main display image" + staged transformation ----
// Ordered before/during/after photos of one job, used both as the
// homepage's full-bleed background (the last stage) and as the input to a
// Higgsfield transformation video that morphs between them.

export interface HeroStage {
  id: string;
  siteId: string;
  url: string;
  stageOrder: number;
  createdAt: string;
  // This stage's own animated clip (subtle motion within just this photo),
  // generated once alongside the other stages' clips — see
  // lib/higgsfieldAnimator.ts#animateHeroStageClip.
  videoUrl?: string;
}

// ---- Higgsfield photo-to-video animations ----
// Each site gets a small number of free animations (see FREE_ANIMATION_CAP
// in lib/animationLimits.ts); beyond that, animating a photo consumes a
// purchased credit (one-time Stripe payment) instead. A hero transformation
// (isHero: true) animates the ordered HeroStage photos instead of a single
// gallery photo, so imageId is absent for those rows.

export type AnimationStatus = "processing" | "completed" | "failed";

export interface SiteAnimation {
  id: string;
  siteId: string;
  imageId?: string;
  isHero: boolean;
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

// Not every material in a job scales with the same measurement: tiles and
// paint scale with area, pipe/cable/trim with length, fixtures with count,
// and concrete/aggregate/screed with volume. "job" is for line items that
// are either included or not (e.g. skip hire) rather than scaling with any
// single dimension — its quantity is included once any section has a
// nonzero value, regardless of kind.
export type QuoteMeasureKind = "area" | "volume" | "length" | "count" | "job";

export interface Material {
  id: string;
  category: TradeCategory;
  name: string;
  unit: string;
  unitPrice: number;
  merchantLabel: string;
  measureKind: QuoteMeasureKind;
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

// A customer-entered measurement (e.g. "Kitchen floor", "Pipe run to
// garage", "New sockets") — the quote tool sums same-kind sections into
// totals per measurement type rather than forcing every job into a single
// square-metre figure, which doesn't hold for length- or count-driven work.
export interface QuoteSection {
  id: string;
  label: string;
  kind: QuoteMeasureKind;
  // The value in the kind's natural unit: area -> m², volume -> m³,
  // length -> linear metres, count -> whole units. Ignored for "job".
  value: number;
  // Volume sections are entered/edited as area (m²) x depth (mm) in the UI
  // — asking a customer to picture "cubic metres" directly isn't realistic
  // — kept here so the calculator can show the two real-world numbers
  // instead of just the derived m³ figure.
  areaSqm?: number;
  depthMm?: number;
}

export interface QuoteBreakdown {
  category: TradeCategory;
  sections: QuoteSection[];
  totals: Record<Exclude<QuoteMeasureKind, "job">, number>;
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
