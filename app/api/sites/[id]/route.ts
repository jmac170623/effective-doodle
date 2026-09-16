import { NextResponse } from "next/server";
import { getSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS scopes this to the caller's own sites plus any published site.
  const site = await getSite(supabase, id);
  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  return NextResponse.json(site);
}
