# AWS S3 Setup for Exposer

One-time setup required before photo uploads work in development or production.

---

## 1. Bucket

Uses the shared bucket: `jeremy-farnault-applications` (`eu-central-1`).

No new bucket needed — Exposer stores objects under the `exposer/` prefix
(`exposer/<userId>/<uuid>-<filename>`, see `src/lib/s3.ts`).

---

## 2. Allow public read on `exposer/` objects

> Photos are served directly from S3 via public URL (`src/lib/s3-url.ts`) — no signed GET
> URLs on every read. Only uploads and deletes are presigned.

In **S3 → jeremy-farnault-applications → Permissions → Bucket policy**, add the Exposer
statement alongside the existing prefixes:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadJournalerObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::jeremy-farnault-applications/journaler/*"
    },
    {
      "Sid": "PublicReadClasserObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::jeremy-farnault-applications/classer/*"
    },
    {
      "Sid": "PublicReadExposerObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::jeremy-farnault-applications/exposer/*"
    }
  ]
}
```

---

## 3. CORS

> Required so the browser can issue the presigned PUT directly to S3.

In **Permissions → Cross-origin resource sharing (CORS)**, ensure the Exposer origins are
present in `AllowedOrigins` — replace `https://your-production-domain.com` with the actual
Exposer prod URL before deploying:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": [
      "http://localhost:3016",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

If other apps already share this CORS block, just add `http://localhost:3016` and the
Exposer prod origin to the existing `AllowedOrigins` list.

---

## 4. Create an IAM user with programmatic access

1. Navigate to **IAM → Users → Create user**.
2. **User name**: `exposer-s3-uploader`.
3. Skip managed policies — add an inline policy next.
4. Complete creation → open the user → **Security credentials** → **Create access key**.
5. Use case: **Application running outside AWS**.
6. Copy the **Access key ID** and **Secret access key** — shown only once.

---

## 5. Attach a least-privilege inline policy

In the IAM user → **Permissions** tab → **Add permissions → Create inline policy → JSON**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ExposerS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::jeremy-farnault-applications/exposer/*"
    }
  ]
}
```

Name the policy `Uncaught Exception: TypeError: b.mask is not a function
    at a.exports.mask (/var/task/apps/exposer/.next/server/chunks/830.js:908:13452)
    at r.frame (/var/task/apps/exposer/.next/server/chunks/830.js:885:7079)
    at r.dispatch (/var/task/apps/exposer/.next/server/chunks/830.js:885:9908)
    at r.send (/var/task/apps/exposer/.next/server/chunks/830.js:885:9441)
    at J.send (/var/task/apps/exposer/.next/server/chunks/830.js:435:142787)
    at Timeout._onTimeout (/var/task/apps/exposer/.next/server/chunks/830.js:900:957)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)` → **Save**.

This scopes the credentials to only `PutObject`, `DeleteObject`, and `GetObject` within the
`exposer/` prefix. No access to any other app's prefix.

---

## 6. Fill in `.env.local`

Open `apps/exposer/.env.local` and set:

```
AWS_ACCESS_KEY_ID="<access key id from step 4>"
AWS_SECRET_ACCESS_KEY="<secret access key from step 4>"
AWS_REGION="eu-central-1"
AWS_S3_BUCKET_NAME="jeremy-farnault-applications"
```

Restart the dev server after editing (`pnpm dev` from the repo root or from `apps/exposer`).

For production, set the same four variables on the Exposer project in Vercel.
