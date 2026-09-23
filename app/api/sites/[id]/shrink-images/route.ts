import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 82;

// Recovery tool for photos uploaded before lib/imageResize.ts existed:
// those went straight from the phone camera with no dimension cap, and a
// modest *file size* (Supabase Storage showed ~100-800KB each here) can
// still hide an enormous *pixel* size — a highly-compressed 8000x6000
// photo decodes to a ~180MB bitmap in the browser regardless of how small
// it was on disk. Several of those decoding at once is a very plausible
// crash on a memory-constrained device. This walks a site's stored photos
// and shrinks (in place, same path) any that exceed MAX_DIMENSION.
//
// A GET (not POST) deliberately, so it can be triggered by just visiting
// the URL while logged in — no working page or DevTools required, which
// matters when the whole point is that the site's own pages won't load.
export async function GET(
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

  const admin = createAdminClient();
  const { data: files, error: listErr } = await admin.storage.from("gallery").list(id);
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const results: { name: string; status: string; from?: string; to?: string }[] = [];

  for (const file of files ?? []) {
    const path = `${id}/${file.name}`;
    try {
      const { data: blob, error: downloadErr } = await admin.storage.from("gallery").download(path);
      if (downloadErr || !blob) {
        results.push({ name: file.name, status: `download failed: ${downloadErr?.message}` });
        continue;
      }
      const buffer = Buffer.from(await blob.arrayBuffer());
      const meta = await sharp(buffer).metadata();
      const { width = 0, height = 0 } = meta;

      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        results.push({ name: file.name, status: "already fine", from: `${width}x${height}` });
        continue;
      }

      const resizedBuffer = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      const resizedMeta = await sharp(resizedBuffer).metadata();

      const { error: uploadErr } = await admin.storage.from("gallery").upload(path, resizedBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (uploadErr) {
        results.push({ name: file.name, status: `re-upload failed: ${uploadErr.message}` });
        continue;
      }

      results.push({
        name: file.name,
        status: "shrunk",
        from: `${width}x${height}`,
        to: `${resizedMeta.width}x${resizedMeta.height}`,
      });
    } catch (error) {
      results.push({ name: file.name, status: `error: ${error instanceof Error ? error.message : "unknown"}` });
    }
  }

  return NextResponse.json({ siteId: id, results });
}
