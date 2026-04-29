# AWS S3 Setup for Classer

One-time setup required before image uploads work in development or production.

---

## 1. Bucket

Uses the shared bucket: `jeremy-farnault-applications` (`eu-central-1`).

No new bucket needed — classer stores objects under the `classer/` prefix.

---

## 2. Allow public read on `classer/` objects

> Images are served directly from S3 via public URL — no signed GET URLs needed on every read.

In **S3 → jeremy-farnault-applications → Permissions → Bucket policy**, ensure both prefixes are covered:

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
    }
  ]
}
```

---

## 3. CORS

In **Permissions → Cross-origin resource sharing (CORS)** — replace `https://your-production-domain.com` with the actual prod URL before deploying:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": [
      "http://localhost:3006",
      "http://localhost:3008",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 4. Create an IAM user with programmatic access

1. Navigate to **IAM → Users → Create user**.
2. **User name**: `classer-s3-uploader`.
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
      "Sid": "ClasserS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::jeremy-farnault-applications/classer/*"
    }
  ]
}
```

Name the policy `classer-s3-inline` → **Save**.

This scopes the credentials to only `PutObject`, `DeleteObject`, and `GetObject` within the
`classer/` prefix. No access to journaler or any other prefix.

---

## 6. Fill in `.env.local`

Open `apps/classer/.env.local` and set:

```
AWS_ACCESS_KEY_ID="<access key id from step 4>"
AWS_SECRET_ACCESS_KEY="<secret access key from step 4>"
AWS_REGION="eu-central-1"
AWS_S3_BUCKET_NAME="jeremy-farnault-applications"
```

Restart the dev server after editing (`pnpm dev` from the repo root or from `apps/classer`).
