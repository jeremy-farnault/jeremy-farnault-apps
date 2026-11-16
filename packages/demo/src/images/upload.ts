import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { type ArtSpec, renderArt } from "./art";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: it's needed to upload the demo images.`);
  return value;
}

type AwsError = { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };

/** The SDK reports a failed HEAD as "UnknownError" (no body to parse): add the status. */
function describe(error: unknown): string {
  const { name, message, $metadata } = error as AwsError;
  const status = $metadata?.httpStatusCode;
  const hint =
    status === 403
      ? " (403: the key lacks permission for this bucket)"
      : status === 301
        ? " (301: the bucket is in another region than AWS_REGION)"
        : "";
  return `${name ?? "Error"}${status ? ` ${status}` : ""}: ${message ?? ""}${hint}`;
}

/**
 * Whether the image is already uploaded. Without s3:ListBucket, S3 answers 403 rather than
 * 404 for a missing object, so 403 also counts as "not there": the upload then succeeds, or
 * fails with a clear reason. Anything else is a real error.
 */
export async function exists(
  s3: Pick<S3Client, "send">,
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = (error as AwsError).$metadata?.httpStatusCode;
    if (status === 404 || status === 403 || (error as AwsError).name === "NotFound") return false;
    throw new Error(`Checking ${key} in ${bucket} failed: ${describe(error)}`);
  }
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
    if (await exists(s3, bucket, key)) continue;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: await renderArt(art),
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
    } catch (error) {
      throw new Error(`Uploading ${key} to ${bucket} failed: ${describe(error)}`);
    }
    uploaded++;
  }
  return uploaded;
}
