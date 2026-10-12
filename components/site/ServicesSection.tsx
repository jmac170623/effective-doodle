"use client";

import { useState } from "react";
import { GeneratedSite, OnboardingData } from "@/lib/types";
import {
  pickServicesVariant,
  ServicesAccentId,
  ServicesMarkerId,
  ServicesSurfaceId,
  ServicesVariant,
} from "@/lib/servicesLayout";
import { SectionHeading } from "./SectionHeading";

type Services = OnboardingData["services"];

function formatGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

function accentVar(accent: ServicesAccentId): string {
  if (accent === "primary") return "var(--color-primary)";
  if (accent === "accent") return "var(--color-accent)";
  return "var(--color-secondary)";
}

// "flat" deliberately returns no background override — the point of a flat
// surface is that it has no visible container of its own, just the
// section's own background showing through.
function surfaceClass(surface: ServicesSurfaceId): string {
  if (surface === "shadow") return "shadow-sm";
  if (surface === "border") return "border";
  return "";
}

function surfaceStyle(surface: ServicesSurfaceId): React.CSSProperties {
  if (surface === "border") return { backgroundColor: "var(--color-surface)", borderColor: "var(--color-muted)" };
  if (surface === "shadow") return { backgroundColor: "var(--color-surface)" };
  return {};
}

function Marker({
  marker,
  index,
  accent,
  compact,
}: {
  marker: ServicesMarkerId;
  index: number;
  accent: ServicesAccentId;
  compact?: boolean;
}) {
  if (marker === "number") {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${compact ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm"}`}
        style={{ backgroundColor: accentVar(accent) }}
      >
        {index + 1}
      </span>
    );
  }
  if (marker === "dot") {
    return (
      <span
        className={`shrink-0 rounded-full ${compact ? "mt-1.5 h-2.5 w-2.5" : "mt-2 h-3 w-3"}`}
        style={{ backgroundColor: accentVar(accent) }}
      />
    );
  }
  if (marker === "chevron") {
    return (
      <span className={`shrink-0 font-black leading-none ${compact ? "text-base" : "text-xl"}`} style={{ color: accentVar(accent) }}>
        ›
      </span>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-full ${compact ? "mt-2.5 h-0.5 w-4" : "mt-3 h-1 w-6"}`}
      style={{ backgroundColor: accentVar(accent) }}
    />
  );
}

interface LayoutProps {
  services: Services;
  accent: ServicesAccentId;
  marker: ServicesMarkerId;
  surface: ServicesSurfaceId;
}

// 1. The original: cards in a grid, numbered badge top-left.
function ServicesGrid({ services, accent, marker, surface }: LayoutProps) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service, i) => (
        <div
          key={service.id}
          className={`rounded-[var(--radius)] p-6 transition hover:-translate-y-1 ${surfaceClass(surface)}`}
          style={surfaceStyle(surface)}
        >
          <Marker marker={marker} index={i} accent={accent} />
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
  );
}

// 2. Vertical stacked rows, marker on the left, divider lines between.
function ServicesIconList({ services, accent, marker }: LayoutProps) {
  return (
    <div className="mt-10">
      {services.map((service, i) => (
        <div key={service.id} className="flex items-start gap-4 border-b py-5" style={{ borderColor: "var(--color-muted)" }}>
          <Marker marker={marker} index={i} accent={accent} />
          <div>
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {service.name}
            </h3>
            {service.description && (
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {service.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// 3. Alternating full-width rows with a large faint number behind the text.
function ServicesSpotlight({ services, accent }: LayoutProps) {
  return (
    <div className="mt-10 space-y-6">
      {services.map((service, i) => {
        const rightAligned = i % 2 === 1;
        return (
          <div
            key={service.id}
            className="relative overflow-hidden rounded-[var(--radius)] p-8"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <span
              className={`pointer-events-none absolute -top-4 select-none text-8xl font-black opacity-10 ${rightAligned ? "right-4" : "left-4"}`}
              style={{ color: accentVar(accent) }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className={`relative ${rightAligned ? "sm:text-right" : ""}`}>
              <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                {service.name}
              </h3>
              {service.description && (
                <p
                  className={`mt-2 max-w-xl text-sm leading-relaxed ${rightAligned ? "sm:ml-auto" : ""}`}
                  style={{ color: "var(--color-muted)" }}
                >
                  {service.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. Checklist rows — surfaces the priceFrom/unit fields nothing else shows.
function ServicesChecklist({ services, accent, marker, surface }: LayoutProps) {
  return (
    <div className="mt-10 space-y-2">
      {services.map((service, i) => (
        <div
          key={service.id}
          className={`flex items-start justify-between gap-4 rounded-[var(--radius)] p-4 ${surfaceClass(surface)}`}
          style={surfaceStyle(surface)}
        >
          <div className="flex items-start gap-3">
            <Marker marker={marker} index={i} accent={accent} compact />
            <div>
              <h3 className="font-bold">{service.name}</h3>
              {service.description && (
                <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
                  {service.description}
                </p>
              )}
            </div>
          </div>
          {service.priceFrom != null && (
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold" style={{ color: accentVar(accent) }}>
              from {formatGBP(service.priceFrom)}
              {service.unit ? ` /${service.unit}` : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// 5. Service names down the left, detail panel on the right.
function ServicesTabs({ services, accent }: LayoutProps) {
  const [active, setActive] = useState(0);
  const current = services[active] ?? services[0];
  if (!current) return null;

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-[220px_1fr] sm:gap-6">
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
        {services.map((service, i) => {
          const isActive = i === active;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActive(i)}
              className="shrink-0 rounded-[var(--radius)] px-4 py-2 text-left text-sm font-semibold transition"
              style={
                isActive
                  ? { backgroundColor: accentVar(accent), color: "#fff" }
                  : { backgroundColor: "var(--color-surface)", color: "var(--color-text)" }
              }
            >
              {service.name}
            </button>
          );
        })}
      </div>
      <div className="rounded-[var(--radius)] p-6" style={{ backgroundColor: "var(--color-surface)" }}>
        <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {current.name}
        </h3>
        {current.description && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {current.description}
          </p>
        )}
      </div>
    </div>
  );
}

// 6. Collapsed list — tap a service to expand its description.
function ServicesAccordion({ services, accent, marker }: LayoutProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mt-10 space-y-2">
      {services.map((service, i) => {
        const isOpen = open === i;
        return (
          <div key={service.id} className="overflow-hidden rounded-[var(--radius)]" style={{ backgroundColor: "var(--color-surface)" }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3 font-bold">
                <Marker marker={marker} index={i} accent={accent} compact />
                {service.name}
              </span>
              <span className="text-lg" style={{ color: accentVar(accent) }}>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && service.description && (
              <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {service.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 7. A swipeable row of cards — app-like on mobile, no JS needed.
function ServicesScroll({ services, accent, marker, surface }: LayoutProps) {
  return (
    <div className="mt-10 -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2">
      {services.map((service, i) => (
        <div
          key={service.id}
          className={`w-64 shrink-0 snap-start rounded-[var(--radius)] p-6 ${surfaceClass(surface)}`}
          style={surfaceStyle(surface)}
        >
          <Marker marker={marker} index={i} accent={accent} />
          <h3 className="mt-4 font-bold" style={{ fontFamily: "var(--font-heading)" }}>
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
  );
}

// 8. One flagship service shown big, the rest in a smaller row below.
function ServicesFeatureBand({ services, accent, marker, surface }: LayoutProps) {
  const [flagship, ...rest] = services;
  if (!flagship) return null;

  return (
    <div className="mt-10 space-y-6">
      <div className="rounded-[var(--radius)] p-8" style={{ backgroundColor: accentVar(accent) }}>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Our Specialty</span>
        <h3 className="mt-2 text-2xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          {flagship.name}
        </h3>
        {flagship.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90">{flagship.description}</p>}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((service, i) => (
            <div key={service.id} className={`rounded-[var(--radius)] p-5 ${surfaceClass(surface)}`} style={surfaceStyle(surface)}>
              <Marker marker={marker} index={i + 1} accent={accent} compact />
              <h4 className="mt-3 font-bold">{service.name}</h4>
              {service.description && (
                <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                  {service.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 9. Bold names stacked; description tucked behind a native <details> tap
// (keyboard/touch accessible with no JS state — same pattern already used
// for QuoteCalculator's "View materials list").
function ServicesMinimalList({ services, accent }: LayoutProps) {
  return (
    <div className="mt-10">
      {services.map((service) => (
        <details key={service.id} className="group border-b py-4" style={{ borderColor: "var(--color-muted)" }}>
          <summary
            className="flex cursor-pointer list-none items-center justify-between text-xl font-bold [&::-webkit-details-marker]:hidden"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {service.name}
            <span className="ml-4 shrink-0 text-base font-normal transition-transform group-open:rotate-180" style={{ color: accentVar(accent) }}>
              ▾
            </span>
          </summary>
          {service.description && (
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {service.description}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}

// 10. Services as rounded pill chips wrapped together — tap one to reveal
// its detail underneath, also via native <details>.
function ServicesBadgeCloud({ services, accent, surface }: LayoutProps) {
  return (
    <div className="mt-10 flex flex-wrap gap-3">
      {services.map((service) => (
        <details key={service.id}>
          <summary
            className={`cursor-pointer list-none rounded-full px-5 py-2 text-sm font-semibold transition [&::-webkit-details-marker]:hidden ${surfaceClass(surface)}`}
            style={{ ...surfaceStyle(surface), color: accentVar(accent) }}
          >
            {service.name}
          </summary>
          {service.description && (
            <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {service.description}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}

function ServicesLayout({ services, variant }: { services: Services; variant: ServicesVariant }) {
  const props: LayoutProps = { services, accent: variant.accent, marker: variant.marker, surface: variant.surface };
  switch (variant.layout) {
    case "icon-list":
      return <ServicesIconList {...props} />;
    case "spotlight":
      return <ServicesSpotlight {...props} />;
    case "checklist":
      return <ServicesChecklist {...props} />;
    case "tabs":
      return <ServicesTabs {...props} />;
    case "accordion":
      return <ServicesAccordion {...props} />;
    case "scroll":
      return <ServicesScroll {...props} />;
    case "feature-band":
      return <ServicesFeatureBand {...props} />;
    case "minimal-list":
      return <ServicesMinimalList {...props} />;
    case "badge-cloud":
      return <ServicesBadgeCloud {...props} />;
    case "grid":
    default:
      return <ServicesGrid {...props} />;
  }
}

// Deterministically picks one of 10 structural layouts (plus accent/marker/
// surface treatments layered on top) from the business's own name — see
// lib/servicesLayout.ts. Same business always renders the same way; two
// different businesses only collide by chance, and a chance that's small
// precisely because layout/accent/marker/surface are each picked
// independently rather than as one combined choice.
export function ServicesSection({
  copy,
  services,
  businessName,
  sectionGapClass,
}: {
  copy: GeneratedSite["copy"];
  services: Services;
  businessName: string;
  sectionGapClass: string;
}) {
  const variant = pickServicesVariant(businessName);

  return (
    <section id="services" className={`px-6 ${sectionGapClass}`} style={{ backgroundColor: "var(--color-secondary)" }}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="What We Offer" heading={copy.servicesHeading} intro={copy.servicesIntro} />
        <ServicesLayout services={services} variant={variant} />
      </div>
    </section>
  );
}
