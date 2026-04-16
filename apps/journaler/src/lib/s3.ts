"use server";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

// ─── S3 client ────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Public URL helper ────────────────────────────────────────────────────────

export function getPublicImageUrl(key: string): string {
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function generatePresignedUploadUrl(
  filename: string
): Promise<{ key: string; url: string }> {
  const userId = await getAuthUserId();
  const key = `journaler/${userId}/${filename}`;

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: 900 });

  return { key, url };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteS3Object(key: string): Promise<void> {
  const userId = await getAuthUserId();

  if (!key.startsWith(`journaler/${userId}/`)) {
    throw new Error("Forbidden: key does not belong to the current user");
  }

  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
