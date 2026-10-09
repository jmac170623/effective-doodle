import { NextRequest, NextResponse } from "next/server";
import { getSite, insertQuote } from "@/lib/db";
import { getAllMaterials } from "@/lib/materials";
import { buildQuoteBreakdown } from "@/lib/quoteEngine";
import { defaultDayRate, matchTradeCategory } from "@/lib/quoteCategories";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";
import { QuoteMeasureKind, QuoteSection } from "@/lib/types";

const VALID_KINDS: QuoteMeasureKind[] = ["area", "volume", "length", "count", "job"];

function parseSections(input: unknown): QuoteSection[] | null {
  if (!Array.isArray(input)) return null;
  const sections: QuoteSection[] = [];
  for (const raw of input) {
    const kind = raw?.kind as QuoteMeasureKind;
    if (!VALID_KINDS.includes(kind)) return null;
    const value = Number(raw?.value);
    if (!Number.isFinite(value) || value < 0) return null;
    sections.push({
      id: typeof raw?.id === "string" && raw.id ? raw.id : generateId("section"),
      label: typeof raw?.label === "string" ? raw.label.trim().slice(0, 60) : "",
      serviceName: typeof raw?.serviceName === "string" ? raw.serviceName.trim().slice(0, 80) : "",
      kind,
      value,
    });
  }
  return sections;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body?.customerEmail === "string" ? body.customerEmail.trim() : "";
  const customerPhone = typeof body?.customerPhone === "string" ? body.customerPhone.trim() : undefined;
  const sections = parseSections(body?.sections);

  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!sections || sections.length === 0 || sections.every((s) => s.value <= 0)) {
    return NextResponse.json({ error: "Enter at least one measurement to quote." }, { status: 400 });
  }

  const supabase = await createClient();
  const site = await getSite(supabase, id);
  if (!site) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404 });
  }

  // Each section picks its own service, so the label stored against the
  // quote is every distinct one actually used, not a single site-wide
  // category — a job can genuinely span several.
  const serviceName = Array.from(new Set(sections.map((s) => s.serviceName).filter(Boolean))).join(", ") || "General work";

  const dayRate = site.onboarding.dayRate ?? defaultDayRate(matchTradeCategory(site.onboarding.trade));
  const materials = await getAllMaterials(supabase);
  // Recomputed server-side from the shared catalog and the customer's own
  // entered areas rather than trusting a client-submitted total.
  const breakdown = buildQuoteBreakdown(sections, materials, dayRate);

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
