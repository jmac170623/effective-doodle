import { TradeCategory } from "./types";

const CATEGORY_KEYWORDS: Record<Exclude<TradeCategory, "general">, string[]> = {
  plumbing: ["plumb", "heating engineer", "gas engineer", "boiler", "heating"],
  electrical: ["electric", "sparky", "wiring"],
  tiling: ["til"],
  painting: ["paint", "decorat"],
};

const DEFAULT_DAY_RATE: Record<TradeCategory, number> = {
  plumbing: 280,
  electrical: 260,
  tiling: 220,
  painting: 180,
  general: 200,
};

export function matchTradeCategory(trade: string): TradeCategory {
  const normalized = trade.trim().toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Exclude<TradeCategory, "general">, string[]][]) {
    if (keywords.some((k) => normalized.includes(k))) {
      return category;
    }
  }
  return "general";
}

export function defaultDayRate(category: TradeCategory): number {
  return DEFAULT_DAY_RATE[category];
}
