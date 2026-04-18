# AWS S3 Setup for Journaler

One-time setup required before image uploads work in development or production.

---

## 1. Create the S3 bucket

1. Sign in to the AWS Console → **S3** → **Create bucket**.
2. **Bucket name**: choose a globally unique name (e.g. `jeremy-farnault-apps`). Note it — this is `AWS_S3_BUCKET_NAME`.
3. **AWS Region**: `eu-central-1` (Frankfurt) recommended to match the Neon DB region. Note it — this is `AWS_REGION`.
4. Leave all other defaults → **Create bucket**.

bucket name = jeremy-farnault-applications

---

## 2. Allow public read on `journaler/` objects

> Images are served directly from S3 via public URL — no signed GET URLs needed on every read.

**Disable Block Public Access:**

1. Open the bucket → **Permissions** tab.
2. **Block public access (bucket settings)** → **Edit**.
3. Uncheck **Block all public access** → type `confirm` → **Save**.

**Add a bucket policy** (replace `BUCKET_NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadJournalerObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/journaler/*"
    }
  ]
}
```

This allows anonymous GET only on the `journaler/` prefix. All other paths remain private.

---

## 3. Configure CORS

> Required so the browser can issue a PUT request directly to S3 via the presigned URL.

In the **Permissions** tab → **Cross-origin resource sharing (CORS)** → paste the following
(replace `https://your-production-domain.com` with your actual production origin before deploying):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": [
      "http://localhost:3006",
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
2. **User name**: `journaler-s3-uploader`.
3. On the permissions step, skip managed policies — you will add an inline policy next.
4. Complete creation → open the user → **Security credentials** → **Create access key**.
5. Use case: **Application running outside AWS**.
6. Copy the **Access key ID** and **Secret access key** — they are shown only once.

---

## 5. Attach a least-privilege inline policy

In the IAM user → **Permissions** tab → **Add permissions → Create inline policy** → switch to the
**JSON** editor and paste (replace `BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "JournalerS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::BUCKET_NAME/journaler/*"
    }
  ]
}
```

Name the policy `journaler-s3-inline` → **Save**.

This scopes the credentials to only `PutObject`, `DeleteObject`, and `GetObject` within the
`journaler/` prefix. No bucket listing, no access to other prefixes, no other S3 actions.

---

## 6. Fill in `.env.local`

Open `apps/journaler/.env.local` and replace the placeholder values:

```
AWS_ACCESS_KEY_ID="<access key id from step 4>"
AWS_SECRET_ACCESS_KEY="<secret access key from step 4>"
AWS_REGION="eu-central-1"
AWS_S3_BUCKET_NAME="<your bucket name from step 1>"
```

Restart the dev server after editing (`pnpm dev` from the repo root or from `apps/journaler`).
