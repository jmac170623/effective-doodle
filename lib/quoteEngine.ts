import { JobSize, Material, QuoteBreakdown, QuoteLineItem, TradeCategory } from "./types";

const LABOUR_DAYS_BY_SIZE: Record<JobSize, number> = {
  small: 0.5,
  medium: 1.5,
  large: 3.5,
};

export function defaultQuantities(materials: Material[], jobSize: JobSize): Record<string, number> {
  const quantities: Record<string, number> = {};
  for (const material of materials) {
    quantities[material.id] = material.suggestedQty[jobSize] ?? 0;
  }
  return quantities;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function buildQuoteBreakdown(
  category: TradeCategory,
  jobSize: JobSize,
  materials: Material[],
  quantities: Record<string, number>,
  dayRate: number
): QuoteBreakdown {
  const lineItems: QuoteLineItem[] = materials
    .map((material) => {
      const quantity = Math.max(0, quantities[material.id] ?? 0);
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
  const labourDays = LABOUR_DAYS_BY_SIZE[jobSize];
  const labourTotal = Math.round(labourDays * dayRate * 100) / 100;
  const subtotal = materialsTotal + labourTotal;

  return {
    category,
    jobSize,
    lineItems,
    materialsTotal,
    labourDays,
    labourRate: dayRate,
    labourTotal,
    grandTotalLow: roundToNearest(subtotal * 0.9, 5),
    grandTotalHigh: roundToNearest(subtotal * 1.15, 5),
  };
}
