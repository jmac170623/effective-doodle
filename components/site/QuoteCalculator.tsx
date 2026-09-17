"use client";

import { useEffect, useMemo, useState } from "react";
import { buildQuoteBreakdown, defaultQuantities } from "@/lib/quoteEngine";
import { JobSize, Material, OnboardingData, TradeCategory } from "@/lib/types";

function formatGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

const JOB_SIZES: { value: JobSize; label: string }[] = [
  { value: "small", label: "Small — a quick job" },
  { value: "medium", label: "Medium — a typical job" },
  { value: "large", label: "Large — a full project" },
];

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
  const [jobSize, setJobSize] = useState<JobSize>("medium");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
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
        setQuantities(defaultQuantities(data.materials ?? [], jobSize));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function handleJobSizeChange(size: JobSize) {
    setJobSize(size);
    setQuantities(defaultQuantities(materials, size));
  }

  const breakdown = useMemo(
    () => buildQuoteBreakdown(category, jobSize, materials, quantities, dayRate),
    [category, jobSize, materials, quantities, dayRate]
  );

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
          jobSize,
          quantities,
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
    <div className="grid gap-6 rounded-[var(--radius)] p-6 lg:grid-cols-2" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Which service is this for?</label>
          <select
            className="mt-1 w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
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

        <div>
          <label className="text-sm font-medium">Roughly how big is the job?</label>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {JOB_SIZES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleJobSizeChange(opt.value)}
                className={`rounded-[var(--radius)] border px-3 py-2 text-left text-xs font-medium ${
                  jobSize === opt.value ? "text-white" : ""
                }`}
                style={
                  jobSize === opt.value
                    ? { backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)" }
                    : { borderColor: "var(--color-muted)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Loading materials…
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Materials</p>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex-1">
                    {m.name} <span style={{ color: "var(--color-muted)" }}>({m.unit}, {m.merchantLabel})</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="w-16 rounded border px-2 py-1 text-right text-xs"
                    style={{ borderColor: "var(--color-muted)" }}
                    value={quantities[m.id] ?? 0}
                    onChange={(e) =>
                      setQuantities((q) => ({ ...q, [m.id]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between space-y-4">
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
            disabled={status === "submitting" || loading}
            className="w-full rounded-[var(--radius)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {status === "submitting" ? "Sending…" : "Request This Quote"}
          </button>
        </form>
      </div>
    </div>
  );
}
