import type { SupabaseClient } from "@supabase/supabase-js";
import { JobSize, Material, QuoteMeasureKind, TradeCategory } from "./types";

interface MaterialRow {
  id: string;
  category: TradeCategory;
  name: string;
  unit: string;
  unit_price: number;
  merchant_label: string;
  measure_kind: QuoteMeasureKind;
  suggested_qty: Record<JobSize, number>;
}

function rowToMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    unit: row.unit,
    unitPrice: row.unit_price,
    merchantLabel: row.merchant_label,
    measureKind: row.measure_kind,
    suggestedQty: row.suggested_qty,
  };
}

export async function getMaterialsByCategory(
  supabase: SupabaseClient,
  category: TradeCategory
): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("category", category)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MaterialRow[] | null ?? []).map(rowToMaterial);
}

// The whole catalog is small (a few dozen rows across all categories), so
// the quote calculator fetches it once rather than per-category — each
// section can pick its own service, and which categories that touches can
// change as the customer edits sections, so scoping the fetch to just one
// category up front doesn't work here the way it used to.
export async function getAllMaterials(supabase: SupabaseClient): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MaterialRow[] | null ?? []).map(rowToMaterial);
}
