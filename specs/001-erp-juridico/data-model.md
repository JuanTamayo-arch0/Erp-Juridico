# data-model.md

**Feature**: ERP para Despachos Jurídicos (001-erp-juridico)
**Created**: 2025-11-03

## Entities

### User
- id: UUID
- full_name: string
- email: string (unique)
- phone: string
- role_id: FK -> Role
- professional_id: string (tarjeta profesional) optional
- status: enum [active, inactive, deleted]
- created_at, updated_at

Indexes: email (unique), role_id

### Role
- id: serial
- name: string (Admin, Senior, Junior, Auxiliar, ReadOnly)
- permissions: JSON or normalized permission table

### Client
- id: UUID
- type: enum [natural, juridical]
- name / razon_social: string
- identification_type: enum
- identification_number: string
- contact_email, contact_phone
- address
- category: string (customizable)
- created_at, updated_at

Indexes: identification_number, name (GIN for search)

### Case (Expediente)
- id: UUID
- title: string
- radicado_number: string (nullable, unique per deployment)
- type_of_process: enum (tutela, laboral, civil, penal, familia, admin, comercial, etc.)
- status: enum (activo, en_revision, suspendido, en_apelacion, archivado, cerrado)
- description: text
- owner_id: FK -> User (responsable principal)
- collaborators: M2M -> User
- tags: array/string (or tags table)
- created_at, updated_at

Indexes: tsvector for title+description, index on owner_id, status

### Document
- id: UUID
- case_id: FK -> Case
- uploader_id: FK -> User
- filename: string
- storage_key: string (S3 key)
- type: enum (demanda, respuesta, prueba, sentencia, otro)
- confidentiality: enum (normal, restringido, confidencial)
- size_bytes: integer
- metadata: JSON (ocr text snippet, pages)
- created_at, updated_at

### DocumentVersion
- id: UUID
- document_id: FK -> Document
- version_number: integer
- storage_key: string
- uploaded_by: FK -> User
- uploaded_at: timestamp
- change_note: string

### AuditLog
- id: BIGSERIAL
- who_user_id: UUID
- action: enum (create, update, delete, view, download, permission_change, export)
- resource_type: string
- resource_id: UUID
- ip_address: string
- user_agent: string
- timestamp
- details: JSON (old/new values)

Retention: keep 2 years in hot storage; archive older logs to cold storage per policy.

### Event / Audiencia
- id: UUID
- case_id: FK -> Case
- event_type: enum (audiencia, vencimiento, diligencia, reunion)
- date_time: timestamptz
- duration_minutes: integer
- location: text
- participants: M2M -> User
- reminders_config: JSON
- created_at, updated_at

### Task
- id: UUID
- title: string
- description: text
- case_id: FK nullable
- assigned_to: FK -> User
- created_by: FK -> User
- due_date: date
- priority: enum (alta, media, baja)
- status: enum (pendiente, en_progreso, completada, cancelada)
- comments_count: integer
- created_at, updated_at

### Notification
- id: UUID
- user_id: FK -> User
- type: enum
- payload: JSON
- read_at: timestamp nullable
- created_at

## Relationships
- Case has many Documents, Events, Tasks
- Document has many DocumentVersions
- User <-> Case: owner and collaborators (M2M)
- AuditLog references many entity types via resource_type/resource_id

## Validation Rules / Constraints
- Enforce confidentiality checks in WHERE clauses and application layer
- Soft delete pattern: `deleted_at` or status enum
- Foreign keys with ON DELETE RESTRICT for critical parents
- Transactions for multi-entity operations (create case + initial docs + assignments)

## Indexing Strategy
- GIN index on tsvector(title || ' ' || description) for Case search
- GIN (pg_trgm) on client name and document filename for fuzzy searches
- B-tree indexes on foreign keys and date fields used for filtering

*** End data-model.md
