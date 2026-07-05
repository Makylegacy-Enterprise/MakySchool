# Wasabi Object Storage

MakySchool stores uploaded files in a **single private bucket** with tenant isolation enforced by object key prefixes.

## Architecture

```
Router (setup, students, …)
    └── app/lib/uploads.py          # validation + domain helpers
            └── TenantStorageService
                    └── StorageBackend (Protocol)
                            ├── LocalStorageBackend   (STORAGE_BACKEND=local)
                            └── WasabiStorageBackend  (STORAGE_BACKEND=wasabi)
```

- Routes never import `boto3`.
- `school_id` is always taken from authenticated tenant context — never from client input when building keys.
- The database stores **object keys only** (e.g. `schools/{uuid}/logo/173…-file.jpg`), not full URLs.
- API responses and PDFs resolve keys to presigned download URLs (Wasabi) or `/uploads/…` paths (local dev).

## Folder layout (bucket `makyschool`)

```
schools/
  {school_id}/
    logo/
    stamp/
    students/
      {student_id}/
        profile.jpg
    teachers/
    staff/
    report_cards/
    exams/
    assignments/
    documents/
    invoices/
    library/
```

Use the school **UUID**, never the slug or name.

When a superadmin creates a school, the API provisions empty `.keep` marker objects under each category folder (and the school root). If provisioning fails, school creation is rolled back.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_BACKEND` | No | `local` (default) or `wasabi` |
| `WASABI_ACCESS_KEY` | Wasabi | Access key |
| `WASABI_SECRET_KEY` | Wasabi | Secret key |
| `WASABI_BUCKET` | Wasabi | Bucket name (default: `makyschool`) |
| `WASABI_REGION` | Wasabi | e.g. `eu-west-3` |
| `WASABI_ENDPOINT_URL` | Wasabi | e.g. `https://s3.eu-west-3.wasabisys.com` |
| `STORAGE_PRESIGNED_TTL_SECONDS` | No | Presigned URL TTL (default: 3600) |
| `UPLOAD_DIR` | Local | Filesystem root when `STORAGE_BACKEND=local` |
| `MAX_UPLOAD_SIZE_MB` | No | Max upload size (default: 2) |

On startup with `STORAGE_BACKEND=wasabi`, the API validates required variables and calls `head_bucket` to fail fast.

## Deployment

1. Create a **private** Wasabi bucket named `makyschool`.
2. Set `STORAGE_BACKEND=wasabi` and Wasabi credentials on the VPS `.env`.
3. Redeploy the API container.
4. Local `/uploads` static mount is disabled in Wasabi mode; clients receive presigned HTTPS URLs.

## Security

- Bucket remains private; downloads use presigned URLs.
- Keys are validated to prevent `..` and cross-tenant access.
- MIME type restricted to JPEG/PNG/WebP for current image uploads.
- Credentials are never logged.

## Legacy paths

Existing rows may contain `/uploads/schools/…` paths from disk storage. The resolver supports these for backward compatibility during migration.

## Tests

```bash
cd apps/api
pytest tests/test_storage.py
```
