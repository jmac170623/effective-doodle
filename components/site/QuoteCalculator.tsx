"use client";

import { useEffect, useMemo, useState } from "react";
import { buildQuoteBreakdown } from "@/lib/quoteEngine";
import { generateId } from "@/lib/idGen";
import { Material, OnboardingData, QuoteSection, TradeCategory } from "@/lib/types";

function formatGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

const MAX_SECTION_SQM = 80;

function newSection(label = ""): QuoteSection {
  return { id: generateId("section"), label, areaSqm: 0 };
}

export function QuoteCalculator({
  siteId,
  category,
  dayRate,
  services,
}: {
  siteId: string;
  category: TradeCategory;
  dayRate: number;
  services: OnboardingData["services"];
}) {
  const [serviceName, setServiceName] = useState(services[0]?.name ?? "General work");
  const [sections, setSections] = useState<QuoteSection[]>([newSection()]);
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
    fetch(`/api/materials?category=${category}`)
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
  }, [category]);

  const totalAreaSqm = useMemo(
    () => Math.round(sections.reduce((sum, s) => sum + (s.areaSqm || 0), 0) * 10) / 10,
    [sections]
  );

  const breakdown = useMemo(
    () => buildQuoteBreakdown(category, sections, materials, dayRate),
    [category, sections, materials, dayRate]
  );

  function updateSection(id: string, patch: Partial<QuoteSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, newSection()]);
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
          serviceName,
          category,
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

  return (
    <div className="space-y-6 rounded-[var(--radius)] p-6" style={{ backgroundColor: "var(--color-surface)" }}>
      <div>
        <label className="text-sm font-medium">Which service is this for?</label>
        <select
          className="mt-1 w-full rounded-[var(--radius)] border px-3 py-2 text-sm sm:w-80"
          style={{ borderColor: "var(--color-muted)" }}
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
        >
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Tell us the size of the area (in m²) — add a section for each room or space</p>
        {sections.map((section, i) => (
          <div
            key={section.id}
            className="space-y-2 rounded-[var(--radius)] border p-4"
            style={{ borderColor: "var(--color-muted)" }}
          >
            <div className="flex items-center gap-2">
              <input
                placeholder={`Section ${i + 1} name (e.g. Kitchen)`}
                className="flex-1 rounded-[var(--radius)] border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--color-muted)" }}
                value={section.label}
                onChange={(e) => updateSection(section.id, { label: e.target.value })}
              />
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  className="text-xs font-medium underline"
                  style={{ color: "var(--color-muted)" }}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={MAX_SECTION_SQM}
                step={0.5}
                value={section.areaSqm}
                onChange={(e) => updateSection(section.id, { areaSqm: Number(e.target.value) })}
                className="flex-1"
                style={{ accentColor: "var(--color-primary)" }}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={section.areaSqm}
                  onChange={(e) => updateSection(section.id, { areaSqm: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-20 rounded border px-2 py-1 text-right text-sm"
                  style={{ borderColor: "var(--color-muted)" }}
                />
                <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                  m²
                </span>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addSection}
          className="text-sm font-medium underline"
          style={{ color: "var(--color-primary)" }}
        >
          + Add another section
        </button>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Total area: <span className="font-semibold">{totalAreaSqm} m²</span>
        </p>
      </div>

      {!calculated ? (
        <button
          type="button"
          disabled={totalAreaSqm <= 0 || loading}
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
