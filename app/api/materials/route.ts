import { NextRequest, NextResponse } from "next/server";
import { getAllMaterials, getMaterialsByCategory } from "@/lib/materials";
import { createClient } from "@/lib/supabase/server";
import { TradeCategory } from "@/lib/types";

const VALID_CATEGORIES: TradeCategory[] = ["plumbing", "electrical", "tiling", "painting", "general"];

// No `category` param returns the whole catalog — the quote calculator
// lets each section pick its own service, so which categories it needs can
// change as the customer edits sections; a `category` filter is kept for
// any other caller that only ever needs one.
export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") as TradeCategory | null;
  const supabase = await createClient();

  if (category === null) {
    const materials = await getAllMaterials(supabase);
    return NextResponse.json({ materials });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const materials = await getMaterialsByCategory(supabase, category);
  return NextResponse.json({ materials });
}
