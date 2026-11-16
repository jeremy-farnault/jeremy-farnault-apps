import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { type ArtSpec, renderArt } from "./art";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: it's needed to upload the demo images.`);
  return value;
}

/**
 * Renders and uploads each image to the shared bucket, skipping keys that are already there
 * (re-seeding reuses them). Uses the same AWS_* variables as the apps.
 */
export async function uploadDemoImages(images: { key: string; art: ArtSpec }[]): Promise<number> {
  const bucket = requireEnv("AWS_S3_BUCKET_NAME");
  const s3 = new S3Client({
    region: requireEnv("AWS_REGION"),
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });

  let uploaded = 0;
  for (const { key, art } of images) {
    const exists = await s3
      .send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      .then(() => true)
      .catch((error: { name?: string; $metadata?: { httpStatusCode?: number } }) => {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) return false;
        throw error;
      });
    if (exists) continue;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: await renderArt(art),
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    uploaded++;
  }
  return uploaded;
}
