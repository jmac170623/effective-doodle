/**
 * Live retail price lookup via SerpApi's Google Shopping engine
 * (serpapi.com — "Google Shopping API"). Used to keep the materials catalog's
 * prices current without a real builders' merchant data feed: see
 * lib/priceRefresh.ts for how a search result gets turned into a catalog
 * price update. This only searches — it never writes anything.
 *
 * Note this returns retail prices (Wickes, Screwfix, Amazon, etc.), not
 * trade/bulk pricing — a real merchant partnership would likely be cheaper.
 * It's a real, sourced starting point, not a substitute for one.
 */

export interface ShoppingResult {
  title: string;
  price?: number; // GBP
  source?: string; // store/retailer name
  link?: string;
}

const SERPAPI_URL = "https://serpapi.com/search.json";
const MAX_RESULTS = 8;

interface SerpApiShoppingItem {
  title?: unknown;
  extracted_price?: unknown;
  source?: unknown;
  link?: unknown;
  product_link?: unknown;
}

export async function searchShoppingPrices(query: string): Promise<ShoppingResult[] | null> {
  if (!process.env.SERPAPI_KEY) return null;

  try {
    const url = new URL(SERPAPI_URL);
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", "uk");
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", process.env.SERPAPI_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`SerpApi shopping search failed (${res.status}) for "${query}"`);
      return null;
    }
    const data = await res.json();
    const items = data?.shopping_results;
    if (!Array.isArray(items)) return null;

    return (items as SerpApiShoppingItem[])
      .slice(0, MAX_RESULTS)
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "",
        price: typeof item.extracted_price === "number" ? item.extracted_price : undefined,
        source: typeof item.source === "string" ? item.source : undefined,
        link:
          typeof item.product_link === "string"
            ? item.product_link
            : typeof item.link === "string"
            ? item.link
            : undefined,
      }))
      .filter((result) => result.title);
  } catch (error) {
    console.error(`SerpApi shopping search threw for "${query}":`, error);
    return null;
  }
}
