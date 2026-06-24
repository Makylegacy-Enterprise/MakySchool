# MakySchool FastAPI API

Production FastAPI backend with Express parity from `apps/api-backup`.

## Quick start

```bash
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# From repo root:
npm run dev:api
```

API: `http://localhost:4000`  
Docs (dev): `http://localhost:4000/api/docs`

## Routes

All endpoints are mounted at **legacy** paths (`/api/...`) and **versioned** paths (`/api/v1/...`).

| Area | Legacy prefix |
|------|----------------|
| Health | `/api/health` |
| Auth | `/api/auth` |
| Schools | `/api/schools/*` |
| Superadmin | `/api/superadmin/*` |
| Webhooks | `/api/webhooks/*` |

## Environment

Uses repo-root `.env` (see `.env.example`). Required: `DATABASE_URL`, `TENANT_JWT_SECRET`, `SUPERADMIN_JWT_SECRET`.

## Migrations

```bash
npm run migrate
npm run seed
```

Migration `014_auth_service_integration.sql` is skipped (unused; incompatible with UUID schema).

## PDF receipts

Fee receipt PDFs use WeasyPrint (`pip install weasyprint`). On Linux you may need system packages: `libpango-1.0-0`, `libcairo2`, `libgdk-pixbuf-2.0-0`.

## Biometrics

Scaffold only: `app/bio/` (Phase 2).
