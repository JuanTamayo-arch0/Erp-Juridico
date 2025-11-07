# Implementation Notes: ERP para Despachos Jurídicos

This file contains technical and implementation details moved out of the specification to keep the spec focused on WHAT and WHY.

- Stack (moved from spec):
  - Frontend: React 18+, TypeScript, Tailwind CSS, React Query, React Router v6
  - Backend: Django 4.2+, DRF, Celery + Redis
  - DB: PostgreSQL 15+
  - Cache: Redis
  - File storage: AWS S3 / Cloudinary
  - Optional: Elasticsearch for full-text search (decision pending)

- Infrastructure notes:
  - Frontend deployed to Vercel, backend to Railway or similar PaaS
  - Monitoring: Sentry
  - CI/CD: GitHub Actions

- Decisions flagged for later:
  - Full-text search: start with PostgreSQL native full-text; migrate to Elasticsearch if needed.
  - Email provider: decision pending (SendGrid / SES / Mailgun).
  - CDN and file storage: AWS S3 + CloudFront vs Cloudinary (cost-dependent).

(These notes are implementation guidance for engineering teams; they do not change the product-level acceptance criteria.)
