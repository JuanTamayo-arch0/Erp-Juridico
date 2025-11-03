# quickstart.md

**Feature**: ERP para Despachos Jurídicos (001-erp-juridico)
**Created**: 2025-11-03

## Goal
Run the application locally for development: frontend (Vite), backend (Django) and local services (Postgres, Redis).

## Prerequisites
- Node 18+ and npm/yarn
- Python 3.11
- PostgreSQL 15
- Redis 7
- Docker (recommended for local infra)

## Steps (local dev)

1. Start local infra (Postgres, Redis) using Docker Compose (example):

```bash
docker compose up -d postgres redis
```

2. Backend (Django)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Set env vars
export DATABASE_URL=postgres://user:pass@localhost:5432/erp
export REDIS_URL=redis://localhost:6379/0
# Run migrations and dev server
python manage.py migrate
python manage.py runserver
```

3. Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

4. Electron (desktop wrapper - optional)

```bash
cd electron
npm install
npm run start
```

## Notes
- For testing, run backend tests: `pytest` and frontend tests: `npm test`.
- Use local S3 emulator (e.g., MinIO) for document storage during development or configure
  environment to use a dev S3 bucket.

*** End quickstart.md
