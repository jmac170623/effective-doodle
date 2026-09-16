import { NextRequest, NextResponse } from "next/server";
import { getSite, insertLead } from "@/lib/db";
import { generateId } from "@/lib/idGen";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const siteId = typeof body?.siteId === "string" ? body.siteId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  const supabase = await createClient();
  if (!siteId || !(await getSite(supabase, siteId))) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404 });
  }
  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
  }

  // Mock endpoint: stores the lead in Supabase. Wire to real email/CRM delivery later.
  await insertLead(supabase, {
    id: generateId("lead"),
    siteId,
    createdAt: new Date().toISOString(),
    name,
    email,
    message,
  });

  return NextResponse.json({ ok: true });
}
