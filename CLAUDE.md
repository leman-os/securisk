# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SecuRisk** — GRC (Governance, Risk, Compliance) platform for information security management aligned with ISO 27001. Russian-language UI throughout.

Stack: FastAPI (Python 3.12) + Motor (async MongoDB) backend, React 19 + Tailwind CSS + Shadcn/UI frontend, MongoDB 7.0, Nginx reverse proxy, Supervisor process manager.

---

## Commands

### Applying changes (production)

```bash
sudo ./update.sh          # Restart backend + rebuild frontend + reload nginx
sudo supervisorctl restart securisk-backend   # Backend only (no frontend changes)
```

### Frontend development

```bash
cd frontend
yarn install
yarn start        # Dev server (hot reload)
yarn build        # Production build → frontend/build/
```

### Backend development

```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --port 8000
```

### Logs & process management

```bash
sudo supervisorctl status
sudo supervisorctl tail -f securisk-backend     # live backend logs
# /var/log/supervisor/securisk-backend.err.log
# /var/log/nginx/access.log
```

### Database backup / restore

```bash
./scripts/backup.sh                      # creates backups/<timestamp>/
sudo ./scripts/restore.sh 20260215_120000
```

---

## Architecture

### Backend (`backend/server.py`)

Single-file monolith (~2000+ lines). All API routes are registered on `api_router` with prefix `/api`, then mounted on `app`.

**Key patterns:**
- `get_current_user` dependency resolves JWT → fetches user from DB → attaches role permissions from `db.roles` (or `_ADMIN_PERMISSIONS` for legacy "Администратор" role)
- `verify_license` dependency is added to all mutating endpoints (POST/PUT/DELETE); read endpoints are unrestricted
- All entities use UUID `id` field (not MongoDB `_id`); `_id` is always excluded from queries with `{"_id": 0}`
- Datetimes are serialized to ISO strings before `insert_one`, then parsed back on read
- Auto-generated numbers: `RSK000001` (risks), `INC00001` (incidents), `ACT00001` (assets), `VUL-YYYY-NNN` (vulnerabilities), `THR-YYYY-NNN` (threats)

**Incident-specific logic:**
- Metrics (MTTA/MTTR/MTTC) are calculated in minutes by `calculate_incident_metrics()` and recalculated on every update
- When status → "Завершен": all admin users are auto-added to `assigned_to`
- When status → "Проверен": `closed_at` is auto-set; only admins can revert from this status
- When status → "Проверен": only admins can change status back; non-admins see a lock message
- On create: creator is auto-added as first element of `assigned_to`
- Non-admin visibility: controlled by `incidents_own_only` role flag; when `True`, query filters to `created_by == user.id OR assigned_to contains user.id` (no status filter — users always see their incidents regardless of status)

**Risk level calculation** (`calculate_risk_level`): `risk_level = probability × impact`; criticality thresholds: ≥20 → Критический, ≥12 → Высокий, ≥6 → Средний, else → Низкий.

**CVSS**: score auto-calculated from CVSS v3.1 vector string; severity derived from score (≥9.0 → Critical, ≥7.0 → High, ≥4.0 → Medium, else → Low).

### RBAC / Permissions

Roles are stored in `db.roles` as documents. The `RolePermissions` model defines per-section access:
- Each section: `SectionPermission { view: bool, edit: bool }`
- Special flags: `admin: bool` (admin panel access), `incidents_own_only: bool` (default `True`)
- Sections: `dashboard`, `requirements`, `incidents`, `assets`, `risks`, `threats`, `vulnerabilities`, `wiki`, `registries`, `graph`, `mindmap`, `users`, `settings`

Legacy format (flat `bool` per section) is transparently converted via `convert_legacy_bool_permissions` validator.

The hardcoded "Администратор" role name bypasses role DB lookup — `_ADMIN_PERMISSIONS` is used directly, granting all access with `incidents_own_only: False`.

### Frontend (`frontend/src/`)

**Entry point:** `App.js` — sets up React Router, JWT-based auth check (`GET /api/auth/me` on load), theme initialization.

**Routing:**
- `/` → Dashboard, `/incidents`, `/assets`, `/risks`, `/threats`, `/vulnerabilities`, `/wiki`, `/registries/:registryId`, `/requirements`, `/graph`, `/mindmap`, `/info` — all wrapped in `<Layout>`
- `/admin/users`, `/admin/roles`, `/admin/settings` — wrapped in `<AdminLayout>`, guarded by `AdminRoute`

**Layout (`components/Layout.jsx`):** Sidebar with collapsible navigation. Menu items are filtered by `user.permissions[section]` — supports both legacy flat bool and `{view, edit}` object. Admin panel button shown only if `user.permissions.admin === true` or role === "Администратор".

**API constant:** `export const API` is defined in `App.js` as `${REACT_APP_BACKEND_URL}/api`. All pages import it: `import { API } from '../App'`.

**UI library:** Shadcn/UI components live in `src/components/ui/`. Path alias `@/` maps to `src/` (configured in `craco.config.js`). Notifications use `sonner` (toast).

**Pages** are flat JSX files in `src/pages/`. Each page receives `user` prop with full user object including `permissions`. Pages handle their own data fetching via `axios`.

**Rich text editing:** `RichTextEditor.jsx` wraps Tiptap (used in Wiki).

**Visualization:** D3.js for `Graph.jsx` (force-directed graph) and `MindMap.jsx` (radial mind map with 4 root modes: Risk/Asset/Threat/Vulnerability).

**PDF export:** `html2canvas` + `jspdf` used in Incidents for report generation.

### Infrastructure

- `nginx/conf.d/default.conf`: serves `frontend/build/` as static files; proxies `/api/` → backend (uvicorn on port 8000)
- `docker/supervisord.conf`: manages backend process
- `frontend/.env`: `REACT_APP_BACKEND_URL` — must match the actual server address for API calls
- `backend/.env`: `MONGO_URL`, `DB_NAME`, `SECRET_KEY`

### License system

Trial period: 40 days from first install (stored in `db.settings` with `type: "license_info"`). Install date is HMAC-protected against manual tampering. Commercial keys: `<expire_date>.<sha256_hash>` validated against machine ID + `LICENSE_SALT`. License is checked on every mutating API call via `verify_license` dependency.

---

## Key Domain Constants

| Entity | Statuses |
|--------|----------|
| Incidents | Новый, В работе, Завершен, Проверен |
| Risks | Открыт, В обработке, Принят, Закрыт |
| Assets | Актуален, Не актуален, В работе, Архив |
| Vulnerabilities | Обнаружена, Принята, В работе, Устранена |

Incident criticality: Низкая, Средняя, Высокая  
Risk criticality: Критический, Высокий, Средний, Низкий
