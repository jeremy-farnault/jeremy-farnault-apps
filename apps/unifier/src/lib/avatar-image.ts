/** Avatars render at 24–30px, so nothing larger than this ever earns its bytes. */
const AVATAR_SIZE = 256;

/**
 * Centre-crops an image file to a square JPEG at avatar resolution, in the browser,
 * before it is uploaded.
 *
 * The orbit loads every person's avatar at once and a phone photo is 3–5MB, so sending
 * the original would cost megabytes per person to render a 30px circle.
 */
export async function toAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  // Centre crop to a square first, so the resize never distorts the face.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("Could not process the image");
  return blob;
}
