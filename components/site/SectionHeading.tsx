// A small colored "eyebrow" label above the heading gives every section a
// second typographic level instead of one flat size repeated down the
// page, and puts the accent color to visible use.
//
// Shared by every generated site's section (About, Services, Gallery,
// Contact, ...) — pulled out of SiteRenderer.tsx so ServicesSection.tsx
// (a client component, for the interactive services layouts) can reuse it
// without an import cycle back into SiteRenderer.tsx.
export function SectionHeading({
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
