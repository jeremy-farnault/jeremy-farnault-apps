/**
 * Builds a stable public HTTPS URL for a stored object key. The bucket is public-read,
 * so GETs are never presigned — only uploads (ticket 08) are.
 */
export function getPublicImageUrl(key: string): string {
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
