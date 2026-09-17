import { NextRequest, NextResponse } from "next/server";
import { getMaterialsByCategory } from "@/lib/materials";
import { createClient } from "@/lib/supabase/server";
import { TradeCategory } from "@/lib/types";

const VALID_CATEGORIES: TradeCategory[] = ["plumbing", "electrical", "tiling", "painting", "general"];

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") as TradeCategory | null;
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid or missing category." }, { status: 400 });
  }

  const supabase = await createClient();
  const materials = await getMaterialsByCategory(supabase, category);
  return NextResponse.json({ materials });
}
