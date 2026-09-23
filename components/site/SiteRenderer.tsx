import { OnboardingData, GeneratedSite, HeroStage, SiteAnimation, SiteImage } from "@/lib/types";
import { ContactForm } from "./ContactForm";
import { ScrollReveal } from "./ScrollReveal";
import { HeroStageSlideshow } from "./HeroStageSlideshow";
import { HeroStageScrubVideo } from "./HeroStageScrubVideo";
import { LazyAutoplayVideo } from "./LazyAutoplayVideo";
import { QuoteCalculator } from "./QuoteCalculator";
import { matchTradeCategory, defaultDayRate } from "@/lib/quoteCategories";

interface SiteRendererProps {
  siteId: string;
  onboarding: OnboardingData;
  generated: GeneratedSite;
  images?: SiteImage[];
  animations?: SiteAnimation[];
  heroStages?: HeroStage[];
}

export function SiteRenderer({ siteId, onboarding, generated, images = [], animations = [], heroStages = [] }: SiteRendererProps) {
  const { style, copy, gallery, emphasis } = generated;

  const cssVars = {
    "--color-primary": style.colorPrimary,
    "--color-secondary": style.colorSecondary,
    "--color-accent": style.colorAccent,
    "--color-bg": style.colorBackground,
    "--color-surface": style.colorSurface,
    "--color-text": style.colorText,
    "--color-muted": style.colorMuted,
    "--font-heading": style.fontHeading,
    "--font-body": style.fontBody,
    "--radius": style.radius,
  } as React.CSSProperties;

  const sectionGapClass =
    style.density === "compact" ? "py-12" : style.density === "spacious" ? "py-20" : "py-16";

  return (
    <div
      style={{
        ...cssVars,
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
      className="min-h-screen"
    >
      <Nav businessName={onboarding.businessName} phone={onboarding.phone} />

      <Hero
        copy={copy}
        yearsExperience={onboarding.yearsExperience}
        areaCovered={onboarding.areaCovered}
        heroStages={heroStages}
        sectionGapClass={sectionGapClass}
      />

      <div className="flex flex-col">
        <div style={{ order: 10 - emphasis.services * 5 }}>
          <Reveal motion={style.motion}>
            <Services copy={copy} services={onboarding.services} sectionGapClass={sectionGapClass} />
          </Reveal>
        </div>

        <div style={{ order: 20 - emphasis.gallery * 5 }}>
          <Reveal motion={style.motion}>
            <Gallery copy={copy} gallery={gallery} images={images} animations={animations} sectionGapClass={sectionGapClass} />
          </Reveal>
        </div>

        <div style={{ order: 30 - emphasis.about * 5 }}>
          <Reveal motion={style.motion}>
            <About copy={copy} sectionGapClass={sectionGapClass} />
          </Reveal>
        </div>
      </div>

      <Reveal motion={style.motion}>
        <QuoteSection siteId={siteId} onboarding={onboarding} sectionGapClass={sectionGapClass} />
      </Reveal>

      <Reveal motion={style.motion}>
        <Contact siteId={siteId} copy={copy} onboarding={onboarding} sectionGapClass={sectionGapClass} />
      </Reveal>

      <Footer copy={copy} onboarding={onboarding} />
    </div>
  );
}

function Reveal({ motion, children }: { motion: GeneratedSite["style"]["motion"]; children: React.ReactNode }) {
  if (motion === "none") return <>{children}</>;
  return <ScrollReveal>{children}</ScrollReveal>;
}

// A small colored "eyebrow" label above the heading gives every section a
// second typographic level instead of one flat size repeated down the
// page, and puts the accent color to visible use — previously defined in
// every palette but never actually rendered anywhere.
function SectionHeading({
  eyebrow,
  heading,
  intro,
  light,
}: {
  eyebrow: string;
  heading: string;
  intro?: string;
  light?: boolean;
}) {
  return (
    <div>
      <span
        className={`text-xs font-bold uppercase tracking-[0.2em] ${light ? "text-white/80" : ""}`}
        style={light ? undefined : { color: "var(--color-accent)" }}
      >
        {eyebrow}
      </span>
      <h2
        className={`mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl ${light ? "text-white" : ""}`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {heading}
      </h2>
      {intro && (
        <p
          className={`mt-3 max-w-xl text-base ${light ? "text-white/80" : ""}`}
          style={light ? undefined : { color: "var(--color-muted)" }}
        >
          {intro}
        </p>
      )}
    </div>
  );
}

function Nav({ businessName, phone }: { businessName: string; phone: string }) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 backdrop-blur"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-bg) 85%, transparent)", borderBottom: "1px solid var(--color-secondary)" }}
    >
      <span className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {businessName}
      </span>
      <nav className="hidden gap-6 text-sm font-medium sm:flex">
        <a href="#about" className="hover:opacity-70">About</a>
        <a href="#services" className="hover:opacity-70">Services</a>
        <a href="#gallery" className="hover:opacity-70">Gallery</a>
        <a href="#quote" className="hover:opacity-70">Get a Quote</a>
        <a href="#contact" className="hover:opacity-70">Contact</a>
      </nav>
      <a
        href={`tel:${phone}`}
        className="rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        Call Now
      </a>
    </header>
  );
}

function Hero({
  copy,
  yearsExperience,
  areaCovered,
  heroStages,
  sectionGapClass,
}: {
  copy: GeneratedSite["copy"];
  yearsExperience: number;
  areaCovered: string;
  heroStages: HeroStage[];
  sectionGapClass: string;
}) {
  // The last stage (e.g. "after"/finished) is the compelling shot to lead
  // with once stage animations exist (they play in sequence as the visitor
  // scrolls). Without animations, multiple stages crossfade as a slideshow
  // instead of only ever showing the final photo — uploading a before/
  // during/after sequence should visibly do something even pre-animation.
  const backgroundImageUrl = heroStages.length > 0 ? heroStages[heroStages.length - 1].url : undefined;
  const stageUrls = heroStages.map((s) => s.url);
  // All-or-nothing, matching the hero-animation route's own guarantee — a
  // partially animated set never gets this far.
  const stageClips = heroStages.every((s) => s.videoUrl)
    ? heroStages.map((s) => ({ src: s.videoUrl! }))
    : null;

  return (
    <section
      className={`relative overflow-hidden px-6 text-center ${sectionGapClass} ${
        backgroundImageUrl ? "flex min-h-[78vh] flex-col items-center justify-center" : ""
      }`}
    >
      {backgroundImageUrl &&
        (stageClips ? (
          <HeroStageScrubVideo clips={stageClips} posterUrl={backgroundImageUrl} className="absolute inset-0" />
        ) : stageUrls.length > 1 ? (
          <HeroStageSlideshow urls={stageUrls} className="absolute inset-0" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ))}
      {backgroundImageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />}

      <div className="relative">
        <span
          className="inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.2em]"
          style={{
            backgroundColor: backgroundImageUrl ? "rgba(255,255,255,0.15)" : "var(--color-secondary)",
            color: backgroundImageUrl ? "#ffffff" : "var(--color-accent)",
          }}
        >
          {yearsExperience > 0 ? `${yearsExperience}+ Years Experience` : `Serving ${areaCovered}`}
        </span>
        <h1
          className={`mx-auto mt-5 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl ${backgroundImageUrl ? "text-white" : ""}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {copy.heroHeadline}
        </h1>
        <p
          className={`mx-auto mt-5 max-w-xl text-lg sm:text-xl ${backgroundImageUrl ? "text-white/90" : ""}`}
          style={backgroundImageUrl ? undefined : { color: "var(--color-muted)" }}
        >
          {copy.heroSubheadline}
        </p>
        <a
          href="#contact"
          className="mt-9 inline-block rounded-[var(--radius)] px-9 py-4 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] hover:opacity-90"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {copy.heroCta}
        </a>
      </div>
    </section>
  );
}

function About({ copy, sectionGapClass }: { copy: GeneratedSite["copy"]; sectionGapClass: string }) {
  return (
    <section id="about" className={`mx-auto max-w-3xl px-6 ${sectionGapClass}`}>
      <SectionHeading eyebrow="About Us" heading={copy.aboutHeading} />
      <p
        className="mt-6 whitespace-pre-line border-l-4 pl-5 text-lg leading-relaxed"
        style={{ color: "var(--color-muted)", borderColor: "var(--color-accent)" }}
      >
        {copy.aboutBody}
      </p>
    </section>
  );
}

function Services({
  copy,
  services,
  sectionGapClass,
}: {
  copy: GeneratedSite["copy"];
  services: OnboardingData["services"];
  sectionGapClass: string;
}) {
  return (
    <section id="services" className={`px-6 ${sectionGapClass}`} style={{ backgroundColor: "var(--color-secondary)" }}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="What We Offer" heading={copy.servicesHeading} intro={copy.servicesIntro} />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <div
              key={service.id}
              className="rounded-[var(--radius)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: "var(--color-surface)", borderTop: "3px solid var(--color-accent)" }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  {service.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({
  copy,
  gallery,
  images,
  animations,
  sectionGapClass,
}: {
  copy: GeneratedSite["copy"];
  gallery: GeneratedSite["gallery"];
  images: SiteImage[];
  animations: SiteAnimation[];
  sectionGapClass: string;
}) {
  const remainingSlots = Math.max(0, gallery.length - images.length);

  return (
    <section id="gallery" className={`px-6 ${sectionGapClass}`}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="Our Work" heading={copy.galleryHeading} intro={copy.galleryIntro} />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image) => {
            const animation = animations.find((a) => a.imageId === image.id && a.status === "completed" && a.videoUrl);
            if (animation?.videoUrl) {
              return (
                <LazyAutoplayVideo
                  key={image.id}
                  src={animation.videoUrl}
                  poster={image.url}
                  className="aspect-square rounded-[var(--radius)] object-cover"
                />
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.id}
                src={image.url}
                alt={image.caption || "Job photo"}
                loading="lazy"
                decoding="async"
                className="aspect-square rounded-[var(--radius)] object-cover"
              />
            );
          })}
          {gallery.slice(0, remainingSlots).map((slot) => (
            <div
              key={slot.id}
              className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed p-3 text-center"
              style={{ borderColor: "var(--color-muted)", color: "var(--color-muted)" }}
            >
              <span className="text-2xl" aria-hidden>🖼️</span>
              <span className="mt-2 text-xs font-medium uppercase tracking-wide">{slot.label}</span>
              <span className="mt-1 text-[10px] opacity-70">Photo slot — add later</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuoteSection({
  siteId,
  onboarding,
  sectionGapClass,
}: {
  siteId: string;
  onboarding: OnboardingData;
  sectionGapClass: string;
}) {
  const category = matchTradeCategory(onboarding.trade);
  const dayRate = onboarding.dayRate ?? defaultDayRate(category);

  return (
    <section id="quote" className={`px-6 ${sectionGapClass}`}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Instant Estimate"
          heading="Get a Quote"
          intro="Enter the details of the job for a real, itemized estimate — no waiting around for a callback."
        />
        <div className="mt-10">
          <QuoteCalculator
            siteId={siteId}
            category={category}
            dayRate={dayRate}
            services={onboarding.services}
          />
        </div>
      </div>
    </section>
  );
}

function Contact({
  siteId,
  copy,
  onboarding,
  sectionGapClass,
}: {
  siteId: string;
  copy: GeneratedSite["copy"];
  onboarding: OnboardingData;
  sectionGapClass: string;
}) {
  return (
    <section id="contact" className={`px-6 text-white ${sectionGapClass}`} style={{ backgroundColor: "var(--color-primary)" }}>
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Get In Touch" heading={copy.contactHeading} intro={copy.contactIntro} light />
          <dl className="mt-6 space-y-2 text-sm">
            <div>
              <dt className="inline font-semibold">Phone: </dt>
              <dd className="inline">
                <a href={`tel:${onboarding.phone}`} className="underline underline-offset-2">
                  {onboarding.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Email: </dt>
              <dd className="inline">
                <a href={`mailto:${onboarding.email}`} className="underline underline-offset-2">
                  {onboarding.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Area: </dt>
              <dd className="inline">{onboarding.areaCovered}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-4 text-sm">
            {onboarding.social.facebook && (
              <a href={onboarding.social.facebook} className="underline underline-offset-2" target="_blank" rel="noreferrer">Facebook</a>
            )}
            {onboarding.social.instagram && (
              <a href={onboarding.social.instagram} className="underline underline-offset-2" target="_blank" rel="noreferrer">Instagram</a>
            )}
            {onboarding.social.tiktok && (
              <a href={onboarding.social.tiktok} className="underline underline-offset-2" target="_blank" rel="noreferrer">TikTok</a>
            )}
            {onboarding.social.website && (
              <a href={onboarding.social.website} className="underline underline-offset-2" target="_blank" rel="noreferrer">Website</a>
            )}
          </div>
        </div>
        <ContactForm siteId={siteId} />
      </div>
    </section>
  );
}

function Footer({ copy, onboarding }: { copy: GeneratedSite["copy"]; onboarding: OnboardingData }) {
  return (
    <footer className="px-6 py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
      <p>{copy.footerNote}</p>
      <p className="mt-1">
        © {new Date().getFullYear()} {onboarding.businessName}. All rights reserved.
      </p>
    </footer>
  );
}
