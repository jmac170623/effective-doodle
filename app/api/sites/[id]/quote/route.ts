import { NextRequest, NextResponse } from "next/server";
import { getSite, insertQuote } from "@/lib/db";
import { getMaterialsByCategory } from "@/lib/materials";
import { buildQuoteBreakdown } from "@/lib/quoteEngine";
import { defaultDayRate } from "@/lib/quoteCategories";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";
import { JobSize, TradeCategory } from "@/lib/types";

const VALID_CATEGORIES: TradeCategory[] = ["plumbing", "electrical", "tiling", "painting", "general"];
const VALID_JOB_SIZES: JobSize[] = ["small", "medium", "large"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail.trim() : "";
  const customerPhone = typeof body?.customerPhone === "string" ? body.customerPhone.trim() : undefined;
  const serviceName = typeof body?.serviceName === "string" ? body.serviceName.trim() : "";
  const category = body?.category as TradeCategory;
  const jobSize = body?.jobSize as JobSize;
  const quantities = (body?.quantities && typeof body.quantities === "object" ? body.quantities : {}) as Record<string, number>;

  if (!customerName || !customerEmail || !serviceName) {
    return NextResponse.json({ error: "Name, email and service are required." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!VALID_JOB_SIZES.includes(jobSize)) {
    return NextResponse.json({ error: "Invalid job size." }, { status: 400 });
  }

  const supabase = await createClient();
  const site = await getSite(supabase, id);
  if (!site) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404 });
  }

  const dayRate = site.onboarding.dayRate ?? defaultDayRate(category);
  const materials = await getMaterialsByCategory(supabase, category);
  // Recomputed server-side from the shared catalog rather than trusting
  // client-submitted totals — the breakdown is what the tradesperson sees.
  const breakdown = buildQuoteBreakdown(category, jobSize, materials, quantities, dayRate);

  await insertQuote(supabase, {
    id: generateId("quote"),
    siteId: id,
    createdAt: new Date().toISOString(),
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
    breakdown,
  });

  return NextResponse.json({ ok: true, breakdown });
}
