import { NextResponse } from "next/server";
import { getSite } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = getSite(id);
  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  return NextResponse.json(site);
}
