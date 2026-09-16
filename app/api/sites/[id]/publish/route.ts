import { NextResponse } from "next/server";
import { getSite, updateSite } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = getSite(id);
  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const updated = {
    ...site,
    status: "published" as const,
    updatedAt: new Date().toISOString(),
  };
  updateSite(updated);

  return NextResponse.json(updated);
}
