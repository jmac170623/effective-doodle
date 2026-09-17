import { OnboardingData, GeneratedSite, SiteImage } from "@/lib/types";
import { ContactForm } from "./ContactForm";
import { ScrollReveal } from "./ScrollReveal";
import { QuoteCalculator } from "./QuoteCalculator";
import { matchTradeCategory, defaultDayRate } from "@/lib/quoteCategories";

interface SiteRendererProps {
  siteId: string;
  onboarding: OnboardingData;
  generated: GeneratedSite;
  images?: SiteImage[];
}

export function SiteRenderer({ siteId, onboarding, generated, images = [] }: SiteRendererProps) {
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
    style.density === "compact" ? "py-12" : style.density === "spacious" ? "py-24" : "py-16";

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

      <Hero copy={copy} sectionGapClass={sectionGapClass} />

      <div className="flex flex-col">
        <div style={{ order: 10 - emphasis.services * 5 }}>
          <Reveal motion={style.motion}>
            <Services copy={copy} services={onboarding.services} sectionGapClass={sectionGapClass} />
          </Reveal>
        </div>

        <div style={{ order: 20 - emphasis.gallery * 5 }}>
          <Reveal motion={style.motion}>
            <Gallery copy={copy} gallery={gallery} images={images} sectionGapClass={sectionGapClass} />
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

function Hero({ copy, sectionGapClass }: { copy: GeneratedSite["copy"]; sectionGapClass: string }) {
  return (
    <section className={`px-6 text-center ${sectionGapClass}`}>
      <h1
        className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {copy.heroHeadline}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg" style={{ color: "var(--color-muted)" }}>
        {copy.heroSubheadline}
      </p>
      <a
        href="#contact"
        className="mt-8 inline-block rounded-[var(--radius)] px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {copy.heroCta}
      </a>
    </section>
  );
}

function About({ copy, sectionGapClass }: { copy: GeneratedSite["copy"]; sectionGapClass: string }) {
  return (
    <section id="about" className={`mx-auto max-w-3xl px-6 ${sectionGapClass}`}>
      <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
        {copy.aboutHeading}
      </h2>
      <p className="mt-4 whitespace-pre-line text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
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
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          {copy.servicesHeading}
        </h2>
        <p className="mt-2 max-w-xl" style={{ color: "var(--color-muted)" }}>
          {copy.servicesIntro}
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-[var(--radius)] p-5 shadow-sm"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <h3 className="font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
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
  sectionGapClass,
}: {
  copy: GeneratedSite["copy"];
  gallery: GeneratedSite["gallery"];
  images: SiteImage[];
  sectionGapClass: string;
}) {
  const remainingSlots = Math.max(0, gallery.length - images.length);

  return (
    <section id="gallery" className={`px-6 ${sectionGapClass}`}>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          {copy.galleryHeading}
        </h2>
        <p className="mt-2 max-w-xl" style={{ color: "var(--color-muted)" }}>
          {copy.galleryIntro}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.id}
              src={image.url}
              alt={image.caption || "Job photo"}
              className="aspect-square rounded-[var(--radius)] object-cover"
            />
          ))}
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
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          Get an Instant Quote
        </h2>
        <p className="mt-2 max-w-xl" style={{ color: "var(--color-muted)" }}>
          Pick a service and job size for a real, itemized estimate — no waiting around for a callback.
        </p>
        <div className="mt-8">
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
    <section id="contact" className={`px-6 ${sectionGapClass}`} style={{ backgroundColor: "var(--color-secondary)" }}>
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            {copy.contactHeading}
          </h2>
          <p className="mt-2 max-w-md" style={{ color: "var(--color-muted)" }}>
            {copy.contactIntro}
          </p>
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
