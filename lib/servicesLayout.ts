import { pickVariant } from "./variantPicker";

// Ten genuinely different structural shapes for a generated site's
// Services section (components/site/ServicesSection.tsx renders each),
// instead of every site using the same numbered-card grid. Shared across
// tones rather than tone-specific — a business's tone already governs its
// colour palette, fonts and density, so layering a tone-independent layout
// choice on top multiplies the real variety instead of narrowing it.
export const SERVICES_LAYOUTS = [
  "grid",
  "icon-list",
  "spotlight",
  "checklist",
  "tabs",
  "accordion",
  "scroll",
  "feature-band",
  "minimal-list",
  "badge-cloud",
] as const;
export type ServicesLayoutId = (typeof SERVICES_LAYOUTS)[number];

// Three more small, independent axes layered on top of whichever layout
// gets picked — each hashed off its own seed suffix so it lands
// independently of the layout choice. A handful of small lists composed
// together multiplies out to far more real combinations than any one list's
// own size, which is what actually pushes two sites looking identical from
// "every ~4 sites" out to a number you won't hit generating a normal batch
// of demo sites.
export const SERVICES_ACCENTS = ["primary", "accent", "secondary"] as const;
export type ServicesAccentId = (typeof SERVICES_ACCENTS)[number];

export const SERVICES_MARKERS = ["number", "dot", "chevron", "dash"] as const;
export type ServicesMarkerId = (typeof SERVICES_MARKERS)[number];

export const SERVICES_SURFACES = ["shadow", "border", "flat"] as const;
export type ServicesSurfaceId = (typeof SERVICES_SURFACES)[number];

export interface ServicesVariant {
  layout: ServicesLayoutId;
  accent: ServicesAccentId;
  marker: ServicesMarkerId;
  surface: ServicesSurfaceId;
}

export function pickServicesVariant(businessName: string): ServicesVariant {
  return {
    layout: pickVariant([...SERVICES_LAYOUTS], `${businessName}|servicesLayout`),
    accent: pickVariant([...SERVICES_ACCENTS], `${businessName}|servicesAccent`),
    marker: pickVariant([...SERVICES_MARKERS], `${businessName}|servicesMarker`),
    surface: pickVariant([...SERVICES_SURFACES], `${businessName}|servicesSurface`),
  };
}
