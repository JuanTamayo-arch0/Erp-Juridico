# ERP Jurídico

Aplicación full‑stack para gestión de casos jurídicos: Django + DRF (backend), React + Vite (frontend) y un shell de escritorio con Electron. Base de datos Postgres, mensajería/cola con Redis y almacenamiento S3‑compatible vía MinIO.

## Stack
- Backend: Django 4 + Django REST Framework + JWT (simplejwt)
- Frontend: React 18 + Vite + Tailwind
- Escritorio: Electron (dev y empaquetado)
- Infra local: Docker Compose (Postgres, Redis, MinIO)
- Tareas asíncronas: Celery (worker + beat)

## Estructura
- `backend/` Código del servidor Django (`apps/…`, `erp_juridico/settings.py`)
- `frontend/` Cliente React + scripts de Electron (`src/`, `electron/`)
- `docker-compose.yml` Servicios infra locales (db, redis, minio)

## Requisitos
- Linux/macOS/WSL
- Python 3.10+ y pip
- Node 18+ y npm
- Docker y Docker Compose (para db/redis/minio)

---

## 1) Infra: base de datos, redis y MinIO
Arranca los servicios de infraestructura locales:

```zsh
# en la raíz del repo
docker compose up -d
# Servicios expuestos:
# - Postgres 5432 (db=erp, user=erp, pass=erp)
# - Redis 6379
# - MinIO 9000 (usuario: minio, password: minio123)
```

MinIO corre en http://127.0.0.1:9000 (si necesitas consola web habilítala aparte, por defecto aquí sólo el API). CORS está abierto para desarrollo.

---

## 2) Backend (Django + DRF)

### Variables de entorno (archivo `.env` sugerido)
Crea `backend/.env` (o exporta las variables en tu shell):

```env
DJANGO_SECRET=dev-secret
DJANGO_DEBUG=1
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=erp
POSTGRES_USER=erp
POSTGRES_PASSWORD=erp
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
DJANGO_TIME_ZONE=UTC
```

### Instalación y ejecución
```zsh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Migraciones e inicio
python manage.py migrate
python manage.py createsuperuser  # opcional
python manage.py runserver 0.0.0.0:8000
```
El API queda en http://127.0.0.1:8000.

### Celery (tareas asíncronas)
En una o dos terminales adicionales:
```zsh
cd backend
source .venv/bin/activate

# Worker
celery -A erp_juridico worker -l info

# Beat (scheduler), opcional si usas tareas periódicas
celery -A erp_juridico beat -l info
```

---

## 3) Frontend Web (Vite)

```zsh
cd frontend
npm install
npm run dev
```

- Dev server: http://127.0.0.1:5173
- El proxy de Vite redirige `/api` → `http://127.0.0.1:8000`.

---

## 4) Escritorio (Electron)

### Desarrollo
En `frontend/` abre un flujo de dos procesos. Tienes un script que hace ambos y espera a que Vite esté listo:

```zsh
cd frontend
npm install
npm run dev:electron        # Vite + Electron
# si quieres empezar "desde login" limpiando tokens:
npm run dev:electron:reset  # limpia localStorage/cookies y lanza
# si tu GPU/Wayland da problemas (ventana negra), usa modo software:
npm run dev:electron:sw
```

Atajos útiles:
- `CLEAR_AUTH=1` limpia sesión al arrancar Electron.
- `FORCE_SOFTWARE_RENDERING=1` desactiva GPU (útil en algunas distros/Wayland/NVIDIA).

### Empaquetado
Genera artefactos en `frontend/release/` (ignorado en git):

```zsh
cd frontend
# Linux (AppImage + .deb)
npm run dist:linux
# Windows (.exe NSIS) - requiere Wine si construyes desde Linux
npm run dist:win
# macOS (.dmg) - construir desde macOS
npm run dist:mac
```

Ejecución del AppImage con fallback software (si hay errores GBM/Wayland/NVIDIA):
```zsh
ELECTRON_OZONE_PLATFORM_HINT=x11 \
FORCE_SOFTWARE_RENDERING=1 \
LIBGL_ALWAYS_SOFTWARE=1 \
./release/ERP\ Juridico-0.1.0.AppImage
```

#### API en empaquetado
En build (file://) no existe el proxy de Vite. El frontend usa por defecto `http://127.0.0.1:8000/api`. Si tu API vive en otra URL/puerto, construye así:
```zsh
VITE_API_BASE=http://mi-servidor:8000/api npm run dist:linux
```

---

## 5) Rutas y autenticación
- Autenticación con JWT (access/refresh). El frontend guarda `erp_access` y `erp_refresh` en `localStorage`.
- Para limpiar sesión en dev: `npm run dev:electron:reset` o borrar las claves en el navegador.

---

## Troubleshooting

- "Loading…" al abrir Electron en dev
  - Asegúrate de que Vite esté en 5173. Usa `npm run dev:electron` (espera a que el puerto responda).

- Pantalla en blanco en AppImage / `ERR_FILE_NOT_FOUND`
  - El build ya está configurado con `base: './'` y HashRouter en producción. Reempaqueta. Si sigue, ejecuta desde terminal para ver logs `did-fail-load`.

- Errores GPU/GBM/Wayland/NVIDIA
  - Ejecuta con `FORCE_SOFTWARE_RENDERING=1` y `ELECTRON_OZONE_PLATFORM_HINT=x11` (ver ejemplo arriba).

- 401 tras build/ejecutable
  - Lanza con `CLEAR_AUTH=1` (limpia tokens). Asegúrate de que `VITE_API_BASE` apunte al backend correcto si no es 127.0.0.1:8000.

- Artefactos muy pesados en git
  - Los instaladores y `frontend/release/` están ignorados en `.gitignore`. Si ya fueron añadidos, usa `git rm -r --cached frontend/release` y vuelve a commitear.

---

## Scripts útiles (resumen)

Backend:
```zsh
cd backend
source .venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
celery -A erp_juridico worker -l info
celery -A erp_juridico beat -l info
```

Frontend y Electron:
```zsh
cd frontend
npm install
npm run dev            # sólo web
npm run dev:electron   # web + electron
npm run dev:electron:reset
npm run dist:linux
```

---

## Notas
- Ajusta `docker-compose.yml` si quieres exponer MinIO console o persistir sus datos.
- En producción, cambia `CORS` y `ALLOWED_HOSTS` en `settings.py`.
- El paquete Electron usa `electron-builder`; los artefactos se generan en `frontend/release/`.
