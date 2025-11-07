# research.md

**Feature**: ERP para Despachos Jurídicos (001-erp-juridico)
**Created**: 2025-11-03

## Purpose
Resolve open technical decisions and provide rationale for choices used in the implementation plan.

## Decisions & Research

### Q1: Full-Text Search Engine
- Decision: Use PostgreSQL Full-Text Search (tsvector + pg_trgm) for MVP.
- Rationale: Simpler operational footprint, avoids adding a separate cluster (Elasticsearch) for initial scale (5-50 users). PostgreSQL provides acceptable performance for MVP with proper indexing and can be migrated later if search latency/scale becomes an issue.
- Alternatives considered:
  - Elasticsearch: better at advanced ranking and scaling for very large corpora, but adds operational cost and complexity.
- Action items:
  - Implement tsvector columns and GIN indexes; enable pg_trgm for fuzzy matching.

### Q2: Email Provider
- Decision: AWS SES (Simple Email Service) for MVP.
- Rationale: Low cost, good deliverability, integrates well with AWS infra and standard SMTP API. Railway-hosted backend can relay via SES using SMTP credentials or API.
- Alternatives: SendGrid, Mailgun (both viable; decision influenced by pricing and support).
- Action items:
  - Implement an EmailService abstraction to allow swapping providers.

### Q3: File Storage + CDN
- Decision: AWS S3 for storage + CloudFront (or CloudFront-like CDN) for assets.
- Rationale: S3 is a de-facto standard for durable object storage with built-in lifecycle policies. CloudFront provides global CDN performance; Cloudinary could be considered for advanced transformations but is costlier.
- Action items:
  - Use pre-signed URLs for secure downloads; generate expiring public links per share requirements.

### Q4: Calendar Integrations (Google/Outlook)
- Decision: Integrate via Google Calendar API (OAuth2) and Microsoft Graph (OAuth2) for Outlook.
- Rationale: Standard approach; requires setting up OAuth client IDs and handling token refresh. Will implement read-write sync for events and use webhooks where supported.
- Action items:
  - Define data mapping between internal Event model and external calendar event formats.

### Q5: PDF Generation / Report Export
- Decision: Use server-side HTML->PDF rendering (WeasyPrint or wkhtmltopdf) for professional PDF reports.
- Rationale: Reliable, produces predictable output; can be hosted on a worker (Celery) for larger reports.
- Action items:
  - Implement ReportBuilder service with queue-based generation for large exports.

### Q6: Desktop Offline Cache
- Decision: Use SQLite local DB in Electron for read-only cached data; writes queued to backend on reconnect.
- Rationale: Simpler than full offline-first sync; supports use-case of viewing cached cases offline while avoiding complex conflict resolution in MVP.
- Action items:
  - Implement a sync queue and conflict-resolution policy for later phases.

## Open / Pending
- Final provider choices (SES vs SendGrid) require account and cost validation.
- Decide whether to add Elasticsearch only after measurable need; monitor search latency and index size first.

*** End research.md
