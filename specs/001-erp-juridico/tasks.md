````markdown
# Tasks: ERP para Despachos Jurídicos (001-erp-juridico)

**Input**: Design documents from `/specs/001-erp-juridico/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize repository skeleton and README at repository root (frontend/backend/electron) - `./`
- [X] T002 [P] Create frontend skeleton using Vite + React + TypeScript in `frontend/` (package.json, tsconfig, basic routes)
- [X] T003 [P] Create backend skeleton with Django project in `backend/` (settings, WSGI/ASGI, basic app `cases`)
- [X] T004 [P] Create Electron wrapper skeleton in `electron/` with packaging config and local SQLite stub
- [X] T005 [P] Add `docker-compose.yml` for local dev: Postgres 15, Redis 7, and MinIO (S3 emulator) - `docker-compose.yml`
- [X] T006 [P] Add CI workflow (GitHub Actions) to run linters, tests and enforce Constitution Check presence in `specs/` - `.github/workflows/ci.yml`
- [X] T007 [P] Add project-wide linting and formatting configs: ESLint + Prettier (frontend), ruff/black (backend), editorconfig - `frontend/`, `backend/`
- [X] T008 [P] Add initial `requirements.txt` (backend) and `package.json` (frontend/electron) with core deps
- [X] T009 [P] Create `docs/CONSTITUTION.md` referencing `.specify/memory/constitution.md` and link in README
- [X] T010 [P] Constitution compliance checkpoint: document how the setup satisfies mandatory constitution gates (security, logging, backups, basic tests) - `specs/001-erp-juridico/plan.md`
- [X] T011 Setup PostgreSQL database and initial migrations in `backend/` (create DB, users, migrations folder)
- [X] T012 Setup Redis and Celery worker skeleton in `backend/` and configure `celery.py` - `backend/`
- [X] T013 Implement authentication endpoints and token handling (JWT refresh) in `backend/apps/auth/` - `backend/apps/auth/views.py`
- [X] T014 Implement Role and Permission models and seed script in `backend/apps/users/models.py` and `backend/apps/users/management/commands/seed_roles.py`
- [X] T015 [P] Implement storage backend abstraction and S3 adapter (pre-signed uploads) - `backend/apps/storage/` (uses settings for S3/MinIO)
- [X] T016 Implement AuditLog model and append-only interface + DB migrations - `backend/apps/audit/models.py`
- [X] T017 Implement document encryption-at-rest policy and integration hooks (encrypt on upload / decrypt for downloads) - `backend/apps/storage/` and `backend/settings.py`
- [X] T018 Add healthcheck endpoint `/health` verifying DB, Redis, disk space - `backend/apps/health/views.py`
- [X] T019 [P] Configure Sentry + basic logging (structured JSON) in backend settings and integrate DSN env var - `backend/settings.py`
- [X] T020 Implement basic frontend authentication flow (login, token refresh) - `frontend/src/services/auth.ts`
- [X] T021 Create CI job to run DB migrations in staging and run smoke tests - `.github/workflows/ci.yml`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T011 Setup PostgreSQL database and initial migrations in `backend/` (create DB, users, migrations folder)
- [ ] T012 Setup Redis and Celery worker skeleton in `backend/` and configure `celery.py` - `backend/`
- [ ] T013 Implement authentication endpoints and token handling (JWT refresh) in `backend/apps/auth/` - `backend/apps/auth/views.py`
- [ ] T014 Implement Role and Permission models and seed script in `backend/apps/users/models.py` and `backend/apps/users/management/commands/seed_roles.py`
- [ ] T015 [P] Implement storage backend abstraction and S3 adapter (pre-signed uploads) - `backend/apps/storage/` (uses settings for S3/MinIO)
- [ ] T016 Implement AuditLog model and append-only interface + DB migrations - `backend/apps/audit/models.py`
- [ ] T017 Implement document encryption-at-rest policy and integration hooks (encrypt on upload / decrypt for downloads) - `backend/apps/storage/` and `backend/settings.py`
- [ ] T018 Add healthcheck endpoint `/health` verifying DB, Redis, disk space - `backend/apps/health/views.py`
- [ ] T019 [P] Configure Sentry + basic logging (structured JSON) in backend settings and integrate DSN env var - `backend/settings.py`
- [ ] T020 Implement basic frontend authentication flow (login, token refresh) - `frontend/src/services/auth.ts`
- [ ] T021 Create CI job to run DB migrations in staging and run smoke tests - `.github/workflows/ci.yml`

**Checkpoint**: Foundation ready - user story implementation can now begin. The Constitution Check items above must be evidenced (config files, test coverage thresholds, audit schema).

## Phase 3: User Story 1 - Crear Nuevo Caso (Priority: P1) 🎯 MVP

**Goal**: Allow a user (Abogado/Auxiliar) to create a complete case with initial documents and assign responsables.

**Independent Test**: POST `/cases` with payload containing title, type_of_process, owner_id, client_ids -> 201 Created; case appears in GET `/cases/{id}` with history entry and notifications queued.

- [ ] T022 [US1] Create Case model and migration in `backend/apps/cases/models.py`
- [ ] T023 [US1] Add Case serializer in `backend/apps/cases/serializers.py`
- [ ] T024 [US1] Implement Create Case API endpoint in `backend/apps/cases/views.py`
- [ ] T025 [US1] Implement frontend "Nuevo Caso" form page and service call to POST `/cases` - `frontend/src/pages/cases/NewCase.tsx`
- [ ] T026 [US1] Implement client search/autocomplete endpoint `GET /clients?query=` - `backend/apps/clients/views.py`
- [ ] T027 [US1] Wire initial-document upload UI on case creation (frontend) to request pre-signed upload URL and POST metadata to `/cases/{id}/documents` - `frontend/src/components/DocumentUpload/*`
- [ ] T028 [US1] Implement backend endpoint to accept document metadata and create Document + initial DocumentVersion and queue storage upload verification - `backend/apps/documents/views.py`
- [ ] T029 [US1] Implement history/timeline entry creation on case create (backend service) - `backend/apps/cases/services.py`
- [ ] T030 [US1] Implement notification enqueue for responsables assigned (in-app + email) - `backend/apps/notifications/` and Celery task
- [ ] T031 [US1] Add frontend case detail page to redirect to after creation and show timeline - `frontend/src/pages/cases/CaseDetail.tsx`

## Phase 4: User Story 2 - Agenda Procesal / Registrar Audiencia (Priority: P1)

**Goal**: Allow scheduling of audiencias linked to cases and configure multilevel reminders.

**Independent Test**: POST `/cases/{id}/events` creates an Event of type "audiencia" and schedules reminders; event appears in user's calendar view and triggers notifications at configured times.

- [ ] T032 [US2] Create Event model (Audiencia) and migration in `backend/apps/events/models.py`
- [ ] T033 [US2] Create Event serializer and validation (no past dates) - `backend/apps/events/serializers.py`
- [ ] T034 [US2] Implement Create Event API `POST /cases/{id}/events` - `backend/apps/events/views.py`
- [ ] T035 [US2] Implement reminder scheduler (Celery beat or delayed tasks) and notification tasks - `backend/apps/events/tasks.py`
- [ ] T036 [US2] Implement frontend calendar component (Day/Week/Month views) and event creation UI - `frontend/src/components/calendar/*`
- [ ] T037 [US2] Integrate external calendar export (iCal .ics) generator for events - `backend/apps/events/exports.py`
- [ ] T038 [US2] Implement filters in calendar: by user, team, case - `frontend/src/pages/calendar/*`

## Phase 5: User Story 3 - Gestión Documental (Upload, Versionado, Visualizador) (Priority: P1)

**Goal**: Upload documents, categorize, auto-version, and preview without download.

**Independent Test**: Upload document via `/cases/{id}/documents` and confirm DocumentVersion created; preview endpoint returns embeddable viewer response.

- [ ] T039 [US3] Implement Document and DocumentVersion models and migrations (`backend/apps/documents/models.py`)
- [ ] T040 [US3] Implement document upload metadata endpoint (already T028) and storage verification worker - `backend/apps/storage/tasks.py`
- [ ] T041 [US3] Implement document versioning logic and restore endpoint - `backend/apps/documents/services.py`
- [ ] T042 [US3] Implement PDF/preview streaming endpoint for viewer (with access control) - `backend/apps/documents/views.py`
- [ ] T043 [US3] Implement frontend document upload component with progress and versioning UI - `frontend/src/components/document/Upload.tsx`
- [ ] T044 [US3] Implement full-text extraction worker (OCR fallback) and index into Postgres tsvector - `backend/apps/documents/ocr.py`
- [ ] T045 [US3] Add search indexing hook to DocumentVersion create path - `backend/apps/search/hooks.py`

## Phase 6: User Story 4 - Búsqueda y Visualizador (Priority: P1)

**Goal**: Global search across cases, clients, documents (content + metadata) with result preview jumping to matched page.

**Independent Test**: Query `/search?q=term` returns combined results (cases/documents/clients) with highlighted snippets; clicking result opens viewer at matched location.

- [ ] T046 [US4] Implement search API `GET /search` that queries Case tsvector and Document tsvector - `backend/apps/search/views.py`
- [ ] T047 [US4] Implement frontend global search bar and results UI with snippet highlighting - `frontend/src/components/SearchBar.tsx`
- [ ] T048 [US4] Implement search result linking to viewer with page jump parameter - `frontend/src/pages/documents/Viewer.tsx`
- [ ] T049 [US4] Add backend support for fuzzy matching via pg_trgm indexes - DB migrations / indexes - `backend/migrations/`

## Phase 7: User Story 5 - Recursos Humanos y Control de Acceso (RBAC) (Priority: P1)

**Goal**: Manage users, roles, and enforce least-privilege checks on backend APIs.

**Independent Test**: Admin can create user with role; junior cannot access restricted endpoints; audit log records role changes.

- [ ] T050 [US5] Implement user creation admin endpoint and frontend admin UI - `backend/apps/users/views.py`, `frontend/src/pages/admin/Users.tsx`
- [ ] T051 [US5] Implement role assignment UI and backend permission checks middleware - `backend/apps/users/permissions.py`
- [ ] T052 [US5] Add tests for permission boundaries (backend unit tests) - `backend/tests/test_permissions.py`

## Phase 8: Reportes y Dashboard (Priority: P2)

**Goal**: Executive dashboard and exportable reports (cases, vencimientos, productividad).

**Independent Test**: Admin loads dashboard and exports PDF report of cases for selected filters.

- [ ] T053 [US6] Implement dashboard metrics endpoints (cases count, upcoming vencimientos) - `backend/apps/reports/views.py`
- [ ] T054 [US6] Implement frontend dashboard page and charts - `frontend/src/pages/dashboard/*`
- [ ] T055 [US6] Implement PDF export worker and report builder service - `backend/apps/reports/report_builder.py`

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements impacting multiple stories

- [ ] T056 [P] Documentation: add README per module and quickstart validation - `docs/`
- [ ] T057 [P] Tests: Increase coverage to targets and add E2E tests for primary flows (login → create case → upload doc → schedule event) - `tests/`
- [ ] T058 [P] Performance: Add benchmark scripts and add dashboards for p95 measurement - `infra/benchmarks/`
- [ ] T059 [P] Security hardening: run static analyzers, dependency checks, rate limits config - `backend/` and CI
- [ ] T060 [P] Accessibility fixes: run contrast and keyboard tests, fix issues from AX audit - `frontend/`

## Dependencies & Execution Order

- Foundation (Phase 2 tasks T011-T021) MUST complete before the majority of User Story tasks (T022-T052).
- Story ordering (recommended): US1 → US2 → US3 → US4 → US5 → US6

## Parallel Opportunities

- Tasks marked with [P] can be run in parallel (frontend skeleton, package setups, linting, CI jobs, certain infra setup tasks).
- Within a user story, model and serializer tasks should complete before endpoints; frontend pages/components can be implemented in parallel once API contracts are stable.

## Implementation Strategy

1. MVP first: complete Phase 1, Phase 2, then implement US1 fully (case creation flow). Validate with E2E tests.
2. Iterate: add US2-US4 while keeping changes small and tested. Use feature flags for risky features (external calendar sync).
3. Parallelize infra and UI work where possible: frontend components, CI, and infra tasks are parallelizable.

## Task Counts & Summary

- Total tasks: 60 (T001 - T060)
- Tasks per story (examples):
  - US1 (Crear Caso): 10 tasks (T022-T031)
  - US2 (Agenda): 6 tasks (T032-T038)
  - US3 (Documental): 7 tasks (T039-T045)
  - US4 (Busqueda): 4 tasks (T046-T049)
  - US5 (RBAC): 3 tasks (T050-T052)
  - Reports (US6): 3 tasks (T053-T055)

## Notes

- Each task includes a file path where implementation should occur. Tasks are written to be directly actionable by engineers or LLM-driven automation.
- If you want TDD-first tasks, I can rewrite the story phases to place test tasks before implementation tasks.

````