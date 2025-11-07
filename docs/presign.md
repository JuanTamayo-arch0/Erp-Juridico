Presigned GET / Download flow

Overview

To avoid CORS issues when downloading files directly from S3/MinIO, the backend exposes a same-origin redirect endpoint that issues a 302 redirect to a presigned GET URL for the object. Browsers following the redirect perform a top-level navigation/download to the object URL and are not blocked by the stricter CORS rules that apply to XHR/fetch responses.

Endpoints

- POST /api/documents/presign/ — (existing) returns presigned POST fields so the client can upload via a form POST to S3 (used by the frontend upload flow).
- GET /api/documents/<id>/presigned/ — (new) redirects the browser to a presigned GET URL for the document object.

Configuring CORS on MinIO (only needed if you intend to fetch objects via XHR/fetch)

Example CORS policy (allow all origins; development only):

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply via AWS CLI (if you have it configured to point at MinIO):

```bash
# save the JSON above in cors.json
aws --endpoint-url https://minio.local s3api put-bucket-cors --bucket erp --cors-configuration file://cors.json
```

If you don't have AWS access (common), use the MinIO Console (web UI):

1. Open the MinIO Console (e.g. https://minio.local:9000)
2. Log in with your access key/secret key
3. Select the bucket (e.g. `erp`)
4. Look for "Bucket Settings" or "CORS" (UI varies by MinIO version)
5. Paste the `cors.json` contents and save

Using `mc` (MinIO client)

If you have `mc` installed and credentials for your MinIO instance, create an alias first:

```bash
mc alias set myminio https://minio.local MINIO_ACCESS_KEY MINIO_SECRET_KEY
```

Then open the MinIO Console or, if you prefer, I can provide the exact `mc` commands to set CORS for your environment — tell me the MinIO endpoint, bucket name, and whether it's served over TLS (https) and I will produce the exact `mc` commands.

Notes

- In production, don't use `AllowedOrigins: ["*"]`. Restrict to your frontend origin(s) to avoid leaking credentials or enabling cross-site data exfiltration.
- If your MinIO server uses a self-signed certificate (common for `minio.local`), the browser may block requests (Status null). Either use a trusted cert, add the cert to your OS/browser trust store, or use HTTP for local development.

Testing

- The repository contains a test `backend/apps/documents/tests/test_presign_redirect.py` which patches the adapter and asserts the presigned redirect endpoint returns a 302 to the expected presigned URL.

If you want, I can now craft `mc` commands tailored to your endpoint and cert setup — send the endpoint (e.g. `https://minio.local:9000`), bucket name (default `erp`) and whether TLS is used, and I'll output the exact commands.