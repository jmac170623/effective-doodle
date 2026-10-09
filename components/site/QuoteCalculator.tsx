"use client";

import { useEffect, useMemo, useState } from "react";
import { buildQuoteBreakdown, volumeFromAreaAndDepth } from "@/lib/quoteEngine";
import { matchTradeCategory } from "@/lib/quoteCategories";
import { generateId } from "@/lib/idGen";
import { Material, OnboardingData, QuoteMeasureKind, QuoteSection, TradeCategory } from "@/lib/types";

function formatGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

const KIND_OPTIONS: { value: QuoteMeasureKind; label: string; unitLabel: string }[] = [
  { value: "area", label: "Area", unitLabel: "m²" },
  { value: "volume", label: "Volume (e.g. concrete, screed)", unitLabel: "m³" },
  { value: "length", label: "Length (e.g. pipe run, fencing)", unitLabel: "m" },
  { value: "count", label: "Number of fixtures/fittings", unitLabel: "" },
];

const SLIDER_CONFIG: Record<Exclude<QuoteMeasureKind, "job">, { max: number; step: number }> = {
  area: { max: 80, step: 0.5 },
  volume: { max: 40, step: 0.5 }, // applies to the area half of the area×depth input
  length: { max: 100, step: 0.5 },
  count: { max: 30, step: 1 },
};

// Which measurement kind a fresh section defaults to, based on how this
// trade is typically quoted — plumbers/electricians are usually quoting
// fixtures first, tilers/decorators a floor or wall area. "general" covers
// too many different trades to guess, so it defaults to area but the
// customer can change it per section either way.
function defaultKindForCategory(category: TradeCategory): QuoteMeasureKind {
  if (category === "plumbing" || category === "electrical") return "count";
  return "area";
}

function newSection(serviceName: string): QuoteSection {
  const category = matchTradeCategory(serviceName);
  return { id: generateId("section"), label: "", serviceName, kind: defaultKindForCategory(category), value: 0 };
}

export function QuoteCalculator({
  siteId,
  dayRate,
  services,
}: {
  siteId: string;
  dayRate: number;
  services: OnboardingData["services"];
}) {
  const defaultServiceName = services[0]?.name ?? "General work";
  const [sections, setSections] = useState<QuoteSection[]>([newSection(defaultServiceName)]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculated, setCalculated] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    // Fetches the whole catalog once: sections can each pick a different
    // service, so which categories are actually needed can change as the
    // customer edits the form rather than being fixed up front.
    fetch(`/api/materials`)
      .then((res) => res.json())
      .then((data: { materials: Material[] }) => {
        if (cancelled) return;
        setMaterials(data.materials ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyValue = useMemo(() => sections.some((s) => s.value > 0), [sections]);

  const breakdown = useMemo(
    () => buildQuoteBreakdown(sections, materials, dayRate),
    [sections, materials, dayRate]
  );

  function updateSection(id: string, patch: Partial<QuoteSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function changeSectionService(id: string, serviceName: string) {
    updateSection(id, { serviceName, kind: defaultKindForCategory(matchTradeCategory(serviceName)), value: 0, areaSqm: undefined, depthMm: undefined });
  }

  function changeSectionKind(id: string, kind: QuoteMeasureKind) {
    updateSection(id, { kind, value: 0, areaSqm: undefined, depthMm: undefined });
  }

  function updateVolumeSection(id: string, areaSqm: number, depthMm: number) {
    updateSection(id, { areaSqm, depthMm, value: volumeFromAreaAndDepth(areaSqm, depthMm) });
  }

  function addSection() {
    setSections((prev) => [...prev, newSection(defaultServiceName)]);
  }

  function removeSection(id: string) {
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch(`/api/sites/${siteId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined,
          sections,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-[var(--radius)] p-6 text-center" style={{ backgroundColor: "var(--color-surface)" }}>
        <p className="font-semibold">Thanks — your quote request has been sent!</p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          Estimated total: {formatGBP(breakdown.grandTotalLow)} – {formatGBP(breakdown.grandTotalHigh)}. We&apos;ll be in touch to confirm the details.
        </p>
      </div>
    );
  }

  const totalsSummary = [
    breakdown.totals.area > 0 && `${breakdown.totals.area} m²`,
    breakdown.totals.volume > 0 && `${breakdown.totals.volume} m³`,
    breakdown.totals.length > 0 && `${breakdown.totals.length} m`,
    breakdown.totals.count > 0 && `${breakdown.totals.count} item${breakdown.totals.count === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <div className="space-y-6 rounded-[var(--radius)] p-6" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="space-y-4">
        <p className="text-sm font-medium">
          Add a section for each part of the job, pick which service it&apos;s for and how it&apos;s measured — a job can
          mix more than one service, and not everything is a floor area.
        </p>
        {sections.map((section, i) => (
          <QuoteSectionRow
            key={section.id}
            section={section}
            index={i}
            services={services}
            onLabelChange={(label) => updateSection(section.id, { label })}
            onServiceChange={(sv) => changeSectionService(section.id, sv)}
            onKindChange={(kind) => changeSectionKind(section.id, kind)}
            onValueChange={(value) => updateSection(section.id, { value })}
            onVolumeChange={(areaSqm, depthMm) => updateVolumeSection(section.id, areaSqm, depthMm)}
            onRemove={sections.length > 1 ? () => removeSection(section.id) : undefined}
          />
        ))}
        <button
          type="button"
          onClick={addSection}
          className="text-sm font-medium underline"
          style={{ color: "var(--color-primary)" }}
        >
          + Add another section
        </button>
        {totalsSummary.length > 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Total: <span className="font-semibold">{totalsSummary.join(" · ")}</span>
          </p>
        )}
      </div>

      {!calculated ? (
        <button
          type="button"
          disabled={!hasAnyValue || loading}
          onClick={() => setCalculated(true)}
          className="w-full rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {loading ? "Loading…" : "Calculate My Quote"}
        </button>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Estimated breakdown</p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "var(--color-muted)" }}>Materials</dt>
                <dd>{formatGBP(breakdown.materialsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--color-muted)" }}>
                  Labour ({breakdown.labourDays} day{breakdown.labourDays === 1 ? "" : "s"} @ {formatGBP(breakdown.labourRate)}/day)
                </dt>
                <dd>{formatGBP(breakdown.labourTotal)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-semibold" style={{ borderColor: "var(--color-secondary)" }}>
                <dt>Estimated total</dt>
                <dd>
                  {formatGBP(breakdown.grandTotalLow)} – {formatGBP(breakdown.grandTotalHigh)}
                </dd>
              </div>
            </dl>
            {breakdown.lineItems.length > 0 && (
              <details className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
                <summary className="cursor-pointer font-medium">What&apos;s included in this estimate</summary>
                <ul className="mt-2 space-y-1">
                  {breakdown.lineItems.map((item) => (
                    <li key={item.materialId} className="flex justify-between">
                      <span>
                        {item.quantity} {item.unit} — {item.name}
                      </span>
                      <span>{formatGBP(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              required
              placeholder="Your name"
              className="w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-muted)" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              required
              type="email"
              placeholder="Your email"
              className="w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-muted)" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Phone (optional)"
              className="w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-muted)" }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {status === "submitting" ? "Sending…" : "Request This Quote"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function QuoteSectionRow({
  section,
  index,
  services,
  onLabelChange,
  onServiceChange,
  onKindChange,
  onValueChange,
  onVolumeChange,
  onRemove,
}: {
  section: QuoteSection;
  index: number;
  services: OnboardingData["services"];
  onLabelChange: (label: string) => void;
  onServiceChange: (serviceName: string) => void;
  onKindChange: (kind: QuoteMeasureKind) => void;
  onValueChange: (value: number) => void;
  onVolumeChange: (areaSqm: number, depthMm: number) => void;
  onRemove?: () => void;
}) {
  const placeholder =
    section.kind === "count"
      ? `Section ${index + 1} name (e.g. New sockets & switches)`
      : section.kind === "length"
      ? `Section ${index + 1} name (e.g. Pipe run to garage)`
      : `Section ${index + 1} name (e.g. Kitchen)`;

  // The section's own service may not be in the business's service list
  // (e.g. the default "General work" fallback on a site with none set) —
  // included as an extra option so the select always has a valid value.
  const serviceOptions = services.some((s) => s.name === section.serviceName)
    ? services
    : [{ id: "__fallback", name: section.serviceName }, ...services];

  return (
    <div className="space-y-3 rounded-[var(--radius)] border p-4" style={{ borderColor: "var(--color-muted)" }}>
      <div className="flex items-center gap-2">
        <input
          placeholder={placeholder}
          className="flex-1 rounded-[var(--radius)] border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--color-muted)" }}
          value={section.label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-medium underline" style={{ color: "var(--color-muted)" }}>
            Remove
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div>
          <label className="block text-xs" style={{ color: "var(--color-muted)" }}>
            Service
          </label>
          <select
            className="rounded-[var(--radius)] border px-2 py-1 text-xs"
            style={{ borderColor: "var(--color-muted)" }}
            value={section.serviceName}
            onChange={(e) => onServiceChange(e.target.value)}
          >
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs" style={{ color: "var(--color-muted)" }}>
            Measured as
          </label>
          <select
            className="rounded-[var(--radius)] border px-2 py-1 text-xs"
            style={{ borderColor: "var(--color-muted)" }}
            value={section.kind}
            onChange={(e) => onKindChange(e.target.value as QuoteMeasureKind)}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {section.kind === "volume" ? (
        <VolumeInputs section={section} onVolumeChange={onVolumeChange} />
      ) : (
        <SimpleValueInput kind={section.kind as Exclude<QuoteMeasureKind, "volume" | "job">} value={section.value} onChange={onValueChange} />
      )}
    </div>
  );
}

function SimpleValueInput({
  kind,
  value,
  onChange,
}: {
  kind: Exclude<QuoteMeasureKind, "volume" | "job">;
  value: number;
  onChange: (value: number) => void;
}) {
  const { max, step } = SLIDER_CONFIG[kind];
  const unitLabel = KIND_OPTIONS.find((o) => o.value === kind)?.unitLabel ?? "";

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
        style={{ accentColor: "var(--color-primary)" }}
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-20 rounded border px-2 py-1 text-right text-sm"
          style={{ borderColor: "var(--color-muted)" }}
        />
        {unitLabel && (
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
            {unitLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function VolumeInputs({
  section,
  onVolumeChange,
}: {
  section: QuoteSection;
  onVolumeChange: (areaSqm: number, depthMm: number) => void;
}) {
  const areaSqm = section.areaSqm ?? 0;
  const depthMm = section.depthMm ?? 0;

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        Volume-based work is easier to judge as an area and a depth than in cubic metres directly.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs" style={{ color: "var(--color-muted)" }}>
            Area
          </label>
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              min={0}
              step={0.5}
              value={areaSqm}
              onChange={(e) => onVolumeChange(Math.max(0, Number(e.target.value) || 0), depthMm)}
              className="w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--color-muted)" }}
            />
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>
              m²
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs" style={{ color: "var(--color-muted)" }}>
            Depth
          </label>
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              min={0}
              step={10}
              value={depthMm}
              onChange={(e) => onVolumeChange(areaSqm, Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--color-muted)" }}
            />
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>
              mm
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        ≈ {section.value.toFixed(2)} m³
      </p>
    </div>
  );
}
