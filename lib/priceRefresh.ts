import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchShoppingPrices } from "./priceSearch";
import { updateMaterialPrice } from "./materials";
import { Material } from "./types";

/**
 * Refreshes a catalog material's price from a real source (SerpApi's Google
 * Shopping results) instead of it being typed in by hand. A plain keyword
 * search returns a grab-bag of products at different pack sizes and units —
 * Claude is given the real results and the material's own unit, and asked
 * to pick the one genuine match and normalize its price onto that unit
 * (e.g. a 10m cable roll's price divided by 10 for a "per metre" material),
 * or to say plainly that nothing matches well enough rather than guess.
 */

const PRICE_MATCH_TOOL: Anthropic.Tool = {
  name: "pick_best_price_match",
  description:
    "Pick the real shopping result that is genuinely the same product as this catalog material, with its price normalized to the material's own unit — or report that none is a confident match.",
  input_schema: {
    type: "object",
    properties: {
      matchFound: {
        type: "boolean",
        description: "True only if at least one result is genuinely the same kind of product as the catalog material — not just a similar-sounding keyword match.",
      },
      unitPrice: {
        type: "number",
        description:
          "The matched product's price in GBP, normalized to the catalog material's own unit (e.g. divide a 10-pack's price by 10 for an 'each' material, or a 25m roll's price by 25 for a 'per metre' material). Required when matchFound is true.",
      },
      merchantLabel: {
        type: "string",
        description: "The store/retailer the matched price came from. Required when matchFound is true.",
      },
      sourceUrl: {
        type: "string",
        description: "The matched product's link, if one was given in the results.",
      },
    },
    required: ["matchFound"],
    additionalProperties: false,
  },
  strict: true,
};

export interface PriceRefreshResult {
  materialId: string;
  materialName: string;
  updated: boolean;
  reason?: string;
}

async function pickBestMatch(
  material: Material,
  results: { title: string; price?: number; source?: string; link?: string }[]
): Promise<{ unitPrice: number; merchantLabel: string; sourceUrl?: string } | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 500,
    tools: [PRICE_MATCH_TOOL],
    tool_choice: { type: "tool", name: "pick_best_price_match" },
    messages: [
      {
        role: "user",
        content: `Catalog material: "${material.name}", priced per "${material.unit}", current price £${material.unitPrice.toFixed(2)}.

Real UK shopping search results for this item:
${results
  .map(
    (r, i) =>
      `${i + 1}. ${r.title} — ${r.price != null ? `£${r.price.toFixed(2)}` : "price unknown"} — ${r.source ?? "unknown store"}${r.link ? ` — ${r.link}` : ""}`
  )
  .join("\n")}

Pick the one result that's genuinely the same product (same material and function, not just a similar keyword), and normalize its price onto this material's own unit ("${material.unit}"). If the title doesn't give enough detail to normalize confidently, or nothing here is really the same product, report matchFound: false rather than guessing.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  const input = toolUse?.input as
    | { matchFound: boolean; unitPrice?: number; merchantLabel?: string; sourceUrl?: string }
    | undefined;
  if (!input?.matchFound || typeof input.unitPrice !== "number" || input.unitPrice <= 0 || !input.merchantLabel) {
    return null;
  }
  return { unitPrice: input.unitPrice, merchantLabel: input.merchantLabel, sourceUrl: input.sourceUrl };
}

export async function refreshMaterialPrice(
  supabase: SupabaseClient,
  material: Material
): Promise<PriceRefreshResult> {
  const base = { materialId: material.id, materialName: material.name };
  if (!process.env.SERPAPI_KEY) return { ...base, updated: false, reason: "SERPAPI_KEY not configured" };
  if (!process.env.ANTHROPIC_API_KEY) return { ...base, updated: false, reason: "ANTHROPIC_API_KEY not configured" };

  const results = await searchShoppingPrices(`${material.name} UK`);
  if (!results || results.length === 0) {
    return { ...base, updated: false, reason: "No shopping results found" };
  }

  try {
    const match = await pickBestMatch(material, results);
    if (!match) return { ...base, updated: false, reason: "No confident match among results" };

    await updateMaterialPrice(supabase, material.id, {
      unitPrice: Math.round(match.unitPrice * 100) / 100,
      merchantLabel: match.merchantLabel,
      sourceUrl: match.sourceUrl,
    });
    return { ...base, updated: true };
  } catch (error) {
    console.error(`Price refresh failed for material ${material.id}:`, error);
    return { ...base, updated: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Sequential, not parallel: SerpApi's lower tiers are rate-limited per
// second, and running the whole catalog (a few dozen rows) one at a time
// with a small gap comfortably avoids bursting past that.
const REQUEST_GAP_MS = 300;

export async function refreshAllMaterialPrices(
  supabase: SupabaseClient,
  materials: Material[]
): Promise<{ updated: number; skipped: number; results: PriceRefreshResult[] }> {
  const results: PriceRefreshResult[] = [];
  for (const material of materials) {
    results.push(await refreshMaterialPrice(supabase, material));
    await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS));
  }
  return {
    updated: results.filter((r) => r.updated).length,
    skipped: results.filter((r) => !r.updated).length,
    results,
  };
}
