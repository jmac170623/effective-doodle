import { NextRequest, NextResponse } from "next/server";
import { getAllMaterials } from "@/lib/materials";
import { refreshAllMaterialPrices } from "@/lib/priceRefresh";
import { createAdminClient } from "@/lib/supabase/admin";

// Refreshing the whole catalog is a handful of real API calls (SerpApi +
// Claude) per material, run sequentially to respect rate limits — see the
// 300 Hobby-plan maxDuration ceiling discussion in
// app/api/sites/[id]/hero-animation/route.ts for why this is capped here
// rather than left unbounded. A few dozen catalog rows comfortably fits.
export const maxDuration = 280;

// No per-tradesperson customer ever calls this — it's a tool the operator
// of this whole SaaS runs by hand to keep the shared catalog current, so a
// single shared secret (rather than a real admin-role system) is enough
// gating: this isn't reachable without it, and it protects a paid
// third-party API from being hit by anyone who finds the URL.
export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || providedSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ error: "SERPAPI_KEY is not configured." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const materials = await getAllMaterials(supabase);
  const outcome = await refreshAllMaterialPrices(supabase, materials);

  return NextResponse.json(outcome);
}
