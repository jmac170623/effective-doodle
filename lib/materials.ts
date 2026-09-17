import type { SupabaseClient } from "@supabase/supabase-js";
import { JobSize, Material, TradeCategory } from "./types";

interface MaterialRow {
  id: string;
  category: TradeCategory;
  name: string;
  unit: string;
  unit_price: number;
  merchant_label: string;
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
