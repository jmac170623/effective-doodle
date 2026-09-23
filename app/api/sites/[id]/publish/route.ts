import { NextResponse } from "next/server";
import { getSite, updateSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  if (site.billingStatus !== "active") {
    return NextResponse.json(
      { error: "This site needs an active retainer before it can be published.", requiresPayment: true },
      { status: 402 }
    );
  }

  const updated = {
    ...site,
    status: "published" as const,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateSite(supabase, updated);
  } catch (error) {
    console.error(`Failed to publish site ${id}:`, error);
    const message = error instanceof Error ? error.message : "Failed to publish.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
