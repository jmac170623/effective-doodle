"use client";

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;
const SKIP_BELOW_BYTES = 2 * 1024 * 1024;

// Uploaded photos come straight from phone cameras — often 10MB+ at full
// resolution — and get rendered as full-bleed hero backgrounds and gallery
// tiles, sometimes several at once (see HeroStageSlideshow). Decoding that
// many full-size images at once was crashing the browser tab. Downscale and
// re-encode before upload so nothing ever gets stored bigger than it'll be
// displayed.
export async function resizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < SKIP_BELOW_BYTES) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
