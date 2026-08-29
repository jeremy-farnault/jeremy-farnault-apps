export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** `accept` attribute value for the file input. */
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PHOTOS = 5;

/** Returns an error message for an invalid file, or null when acceptable. */
export function validatePhotoFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" is not a supported image (JPG, PNG, WebP, GIF, or AVIF).`;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `"${file.name}" is larger than 10 MB.`;
  }
  return null;
}

/** Read a file's intrinsic pixel dimensions in the browser. */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  }
  // Fallback for environments without createImageBitmap.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}
