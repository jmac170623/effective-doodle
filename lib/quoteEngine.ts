import { JobSize, Material, QuoteBreakdown, QuoteLineItem, QuoteMeasureKind, QuoteSection, TradeCategory } from "./types";

// Reference small/medium/large anchor points per measurement kind. The
// materials catalog's suggestedQty (small/medium/large) values are
// calibrated against these — e.g. a "small" plumbing job means ~1 fixture
// and/or ~4m of pipe, a "small" tiling job means ~5m² tiled, a "small"
// concreting job means ~0.5m³ poured. Rather than making the customer pick
// a bucket, each kind's total is treated as a continuous curve through
// these three points and interpolated/extrapolated from what they actually
// enter.
const ANCHORS: Record<Exclude<QuoteMeasureKind, "job">, [number, number, number]> = {
  area: [5, 15, 40], // m² — small bathroom, medium room, large open-plan space
  volume: [0.5, 2, 6], // m³ — small slab/path, medium base/patio, large driveway/foundation
  length: [5, 15, 40], // linear metres — short run, medium run, long run
  count: [1, 4, 10], // fixtures/fittings
};
const LABOUR_DAYS_ANCHORS: [number, number, number] = [0.5, 1.5, 3.5];
const JOB_SIZE_ORDER: JobSize[] = ["small", "medium", "large"];

// Units sold as a continuous quantity (cut to length, spread per area) round
// to one decimal place. Units sold as whole discrete items (fixtures,
// tubs, bags) round up to a whole number, and small fractions round down to
// zero so a tiny area doesn't imply "1 of everything".
const CONTINUOUS_UNITS = new Set(["per metre", "per m²", "per m³"]);
const DISCRETE_ZERO_THRESHOLD = 0.2;

function interpolate(value: number, anchors: [number, number, number], values: [number, number, number]): number {
  if (value <= anchors[0]) {
    const slope = (values[1] - values[0]) / (anchors[1] - anchors[0]);
    return Math.max(0, values[0] + slope * (value - anchors[0]));
  }
  if (value <= anchors[1]) {
    const t = (value - anchors[0]) / (anchors[1] - anchors[0]);
    return values[0] + t * (values[1] - values[0]);
  }
  if (value <= anchors[2]) {
    const t = (value - anchors[1]) / (anchors[2] - anchors[1]);
    return values[1] + t * (values[2] - values[1]);
  }
  const slope = (values[2] - values[1]) / (anchors[2] - anchors[1]);
  return Math.max(0, values[2] + slope * (value - anchors[2]));
}

function roundQuantity(raw: number, unit: string): number {
  if (CONTINUOUS_UNITS.has(unit)) {
    return Math.round(Math.max(0, raw) * 10) / 10;
  }
  if (raw < DISCRETE_ZERO_THRESHOLD) return 0;
  return Math.ceil(raw);
}

// A volume section is entered as area (m²) x depth (mm) in the UI — picking
// a real depth in millimetres is something a customer can actually judge
// ("about 100mm of concrete"), where guessing cubic metres directly isn't.
export function volumeFromAreaAndDepth(areaSqm: number, depthMm: number): number {
  return Math.max(0, areaSqm) * (Math.max(0, depthMm) / 1000);
}

export function totalsBySection(sections: QuoteSection[]): Record<Exclude<QuoteMeasureKind, "job">, number> {
  const totals: Record<Exclude<QuoteMeasureKind, "job">, number> = { area: 0, volume: 0, length: 0, count: 0 };
  for (const section of sections) {
    if (section.kind === "job") continue;
    totals[section.kind] += Math.max(0, section.value || 0);
  }
  (Object.keys(totals) as (keyof typeof totals)[]).forEach((k) => {
    totals[k] = Math.round(totals[k] * 100) / 100;
  });
  return totals;
}

function hasAnyWork(totals: Record<Exclude<QuoteMeasureKind, "job">, number>): boolean {
  return Object.values(totals).some((v) => v > 0);
}

// Each active measurement kind contributes its own labour-days curve; the
// largest contributes in full, and every additional kind present (e.g.
// fixture counts layered onto a retiling job) contributes a smaller share,
// since mixed work adds real time but doesn't roughly double the job.
export function labourDaysForTotals(totals: Record<Exclude<QuoteMeasureKind, "job">, number>): number {
  const contributions = (Object.keys(totals) as (keyof typeof totals)[])
    .filter((kind) => totals[kind] > 0)
    .map((kind) => interpolate(totals[kind], ANCHORS[kind], LABOUR_DAYS_ANCHORS))
    .sort((a, b) => b - a);

  if (contributions.length === 0) return 0;
  const [primary, ...rest] = contributions;
  const total = primary + rest.reduce((sum, c) => sum + c * 0.4, 0);
  return Math.max(0.25, Math.round(total * 20) / 20);
}

function quantitiesForTotals(
  materials: Material[],
  totals: Record<Exclude<QuoteMeasureKind, "job">, number>
): Record<string, number> {
  const anyWork = hasAnyWork(totals);
  const quantities: Record<string, number> = {};
  for (const material of materials) {
    if (material.measureKind === "job") {
      // Included once, at its "medium" reference quantity, whenever the
      // quote covers any work at all — e.g. skip hire isn't proportional
      // to any single measurement, it's either needed or it isn't.
      quantities[material.id] = anyWork ? material.suggestedQty.medium ?? 0 : 0;
      continue;
    }
    const total = totals[material.measureKind];
    if (total <= 0) {
      quantities[material.id] = 0;
      continue;
    }
    const values = JOB_SIZE_ORDER.map((size) => material.suggestedQty[size] ?? 0) as [number, number, number];
    quantities[material.id] = roundQuantity(interpolate(total, ANCHORS[material.measureKind], values), material.unit);
  }
  return quantities;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function buildQuoteBreakdown(
  category: TradeCategory,
  sections: QuoteSection[],
  materials: Material[],
  dayRate: number
): QuoteBreakdown {
  const totals = totalsBySection(sections);
  const quantities = quantitiesForTotals(materials, totals);

  const lineItems: QuoteLineItem[] = materials
    .map((material) => {
      const quantity = quantities[material.id] ?? 0;
      return {
        materialId: material.id,
        name: material.name,
        unit: material.unit,
        unitPrice: material.unitPrice,
        quantity,
        lineTotal: Math.round(material.unitPrice * quantity * 100) / 100,
        merchantLabel: material.merchantLabel,
      };
    })
    .filter((item) => item.quantity > 0);

  const materialsTotal = Math.round(lineItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const labourDays = labourDaysForTotals(totals);
  const labourTotal = Math.round(labourDays * dayRate * 100) / 100;
  const subtotal = materialsTotal + labourTotal;

  return {
    category,
    sections,
    totals,
    lineItems,
    materialsTotal,
    labourDays,
    labourRate: dayRate,
    labourTotal,
    grandTotalLow: roundToNearest(subtotal * 0.9, 5),
    grandTotalHigh: roundToNearest(subtotal * 1.15, 5),
  };
}
