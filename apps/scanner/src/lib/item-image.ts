/** Product images show at up to ~120px; nothing larger is worth its bytes. */
const MAX_SIDE = 512;

/**
 * Shrinks a picked image to fit MAX_SIDE, keeping its shape, as a JPEG, in the browser
 * before upload. Product photos are often wide or tall, so it is not cropped.
 */
export async function toItemImageBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  // JPEG has no transparency: a white backdrop keeps transparent product shots clean.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("Could not process the image");
  return blob;
}

/** Uploads a picked image through a presigned URL and returns its key. */
export async function uploadItemImage(
  file: File,
  presign: () => Promise<{ key: string; url: string }>
): Promise<string> {
  const blob = await toItemImageBlob(file);
  const { key, url } = await presign();
  const res = await fetch(url, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/jpeg" },
  });
  if (!res.ok) throw new Error("Image upload failed. Try again.");
  return key;
}
