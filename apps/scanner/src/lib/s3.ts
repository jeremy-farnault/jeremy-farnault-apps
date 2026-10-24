import "server-only";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Item images live in the fleet's shared bucket under scanner/<userId>/. A plain server
// module rather than a "use server" one, so nothing here is callable from the browser
// except what actions.ts chooses to expose.

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "";

/** Shop images above this are skipped rather than stored: the list shows them at 56px. */
const MAX_COPY_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function newKey(userId: string, extension: string): string {
  return `scanner/${userId}/${crypto.randomUUID()}.${extension}`;
}

export function ownsKey(userId: string, key: string): boolean {
  return key.startsWith(`scanner/${userId}/`) && !key.includes("..");
}

/** Presigns a browser upload of an image the user picked. */
export async function presignUpload(userId: string): Promise<{ key: string; url: string }> {
  const key = newKey(userId, "jpg");
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: "image/jpeg" }),
    { expiresIn: 900 }
  );
  return { key, url };
}

/**
 * Copies a shop's product image into the bucket and returns its key, or null when the image
 * can't be fetched, isn't an image, or is too large. Never throws: an item without an image
 * is still worth adding.
 */
export async function copyImage(userId: string, imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(sizedForList(imageUrl), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    const extension = EXTENSIONS[type];
    if (!extension) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_COPY_BYTES) return null;
    const body = new Uint8Array(await res.arrayBuffer());
    if (body.byteLength === 0 || body.byteLength > MAX_COPY_BYTES) return null;

    const key = newKey(userId, extension);
    await s3.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type })
    );
    return key;
  } catch {
    return null;
  }
}

/** Deletes one of the user's images. Keys outside their folder are ignored. */
export async function deleteImage(userId: string, key: string): Promise<void> {
  if (!ownsKey(userId, key)) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // An orphaned object costs nothing worth failing a user action over.
  }
}

/**
 * The PS Store's image CDN resizes on request; its originals are print-sized PNGs. Other
 * shops' URLs are left as they are.
 */
function sizedForList(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    if (url.hostname === "image.api.playstation.com") url.searchParams.set("w", "512");
    return url.toString();
  } catch {
    return imageUrl;
  }
}
