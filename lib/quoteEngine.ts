import { JobSize, Material, QuoteBreakdown, QuoteLineItem, QuoteSection, TradeCategory } from "./types";

// The catalog still stores three reference points per material (small/medium/
// large), keyed by these area anchors in square metres. Rather than making
// the customer pick a bucket, we treat those three points as a curve and
// interpolate/extrapolate continuously from the area they actually enter.
const AREA_ANCHORS: [number, number, number] = [5, 15, 40];
const LABOUR_DAYS_ANCHORS: [number, number, number] = [0.5, 1.5, 3.5];
const JOB_SIZE_ORDER: JobSize[] = ["small", "medium", "large"];

// Units sold as a continuous quantity (cut to length, spread per area) round
// to one decimal place. Units sold as whole discrete items (fixtures,
// tubs, bags) round up to a whole number, and small fractions round down to
// zero so a tiny area doesn't imply "1 of everything".
const CONTINUOUS_UNITS = new Set(["per metre", "per m²"]);
const DISCRETE_ZERO_THRESHOLD = 0.2;

function interpolate(area: number, anchors: [number, number, number], values: [number, number, number]): number {
  if (area <= anchors[0]) {
    const slope = (values[1] - values[0]) / (anchors[1] - anchors[0]);
    return Math.max(0, values[0] + slope * (area - anchors[0]));
  }
  if (area <= anchors[1]) {
    const t = (area - anchors[0]) / (anchors[1] - anchors[0]);
    return values[0] + t * (values[1] - values[0]);
  }
  if (area <= anchors[2]) {
    const t = (area - anchors[1]) / (anchors[2] - anchors[1]);
    return values[1] + t * (values[2] - values[1]);
  }
  const slope = (values[2] - values[1]) / (anchors[2] - anchors[1]);
  return Math.max(0, values[2] + slope * (area - anchors[2]));
}

function roundQuantity(raw: number, unit: string): number {
  if (CONTINUOUS_UNITS.has(unit)) {
    return Math.round(Math.max(0, raw) * 10) / 10;
  }
  if (raw < DISCRETE_ZERO_THRESHOLD) return 0;
  return Math.ceil(raw);
}

export function totalAreaSqm(sections: QuoteSection[]): number {
  return Math.round(sections.reduce((sum, s) => sum + Math.max(0, s.areaSqm || 0), 0) * 10) / 10;
}

export function labourDaysForArea(areaSqm: number): number {
  if (areaSqm <= 0) return 0;
  const values = LABOUR_DAYS_ANCHORS;
  return Math.max(0.25, Math.round(interpolate(areaSqm, AREA_ANCHORS, values) * 20) / 20);
}

function quantitiesForArea(materials: Material[], areaSqm: number): Record<string, number> {
  const quantities: Record<string, number> = {};
  for (const material of materials) {
    if (areaSqm <= 0) {
      quantities[material.id] = 0;
      continue;
    }
    const values = JOB_SIZE_ORDER.map((size) => material.suggestedQty[size] ?? 0) as [number, number, number];
    quantities[material.id] = roundQuantity(interpolate(areaSqm, AREA_ANCHORS, values), material.unit);
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
  const areaSqm = totalAreaSqm(sections);
  const quantities = quantitiesForArea(materials, areaSqm);

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
  const labourDays = labourDaysForArea(areaSqm);
  const labourTotal = Math.round(labourDays * dayRate * 100) / 100;
  const subtotal = materialsTotal + labourTotal;

  return {
    category,
    sections,
    areaSqm,
    lineItems,
    materialsTotal,
    labourDays,
    labourRate: dayRate,
    labourTotal,
    grandTotalLow: roundToNearest(subtotal * 0.9, 5),
    grandTotalHigh: roundToNearest(subtotal * 1.15, 5),
  };
}
