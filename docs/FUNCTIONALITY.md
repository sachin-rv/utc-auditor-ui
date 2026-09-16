# How UTC Auditor UI works

UTC Auditor UI is an authenticated Next.js dashboard for viewing and managing audit data. It does not store clients, projects, users, or reports itself. Those live in the Nest backend (`utc-auditor-be`). This app is a **BFF** (backend-for-frontend): the browser talks to Next.js, and Next.js talks to the API with a JWT.

The dashboard runs on **port 3001**. The backend is expected on **port 3000** (`BACKEND_URL`).

## Architecture

```text
Browser
  │
  ├─ Pages (App Router, mostly server-rendered)
  ├─ Client components (modals, filters, charts, theme)
  ├─ Next.js route handlers  /api/auth/*
  └─ Server actions          app/dashboard/actions.ts
        │
        ▼
  lib/backend.ts  →  {BACKEND_URL}/api/...
        │
        ▼
  utc-auditor-be (source of truth)
```

| Layer | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, auth BFF handlers, server actions |
| `components/` | Dashboard, workspace shell, report views, create/edit modals |
| `lib/backend.ts` | HTTP client to the Nest API |
| `lib/auth.ts` | Session cookie encode/decode |
| `lib/api-normalize.ts` | Tolerant mapping of API JSON shapes |
| `lib/report-map.ts` / `lib/user-report.ts` | Turn `reportJson` into UI models |

Data fetches use `cache: "no-store"`. The dashboard layout is `force-dynamic` and refreshes every **20 seconds** while the tab is visible (`LiveRefresh`).

## Authentication and session

### First-run vs sign-in

On `/login` the client calls `GET /api/auth/setup-status`.

- If `setupRequired` is true, the form collects **name, email, password** and posts to `POST /api/auth/setup` (creates the first admin).
- Otherwise it posts **email, password** to `POST /api/auth/login`.

Those Next routes proxy to the backend, then write an **httpOnly** cookie named `utc_session` (7 days, `SameSite=lax`). The cookie value is a base64url JSON blob:

```ts
{
  accessToken, // JWT from the backend
  userId,
  role,        // "admin" | "client"
  clientId?,   // required for client users
  name,
  email
}
```

Sign-out is `POST /api/auth/logout`, which clears the cookie (no backend call).

### Route protection

`middleware.ts` requires `utc_session` for `/dashboard/*`. Missing cookie → redirect to `/login?next=...`.

`/` reads the session and sends admins to `/dashboard` and client users to `/dashboard/client/{clientId}`.

Server loaders also check the session. Client users cannot open another tenant: if `session.clientId !== params.clientId`, they are redirected to `/dashboard`.

JWT errors from `apiGet`:

| Backend status | UI behavior |
| --- | --- |
| 401 | Redirect to `/login` |
| 403 | Redirect to `/dashboard` |
| 404 | Next.js `notFound()` |
| Unreachable | `BackendError` 502: “Cannot reach the UTC Auditor API…” |

## Roles

### Admin

- See every client on the overview
- Create clients (optionally with a first client user)
- Create users (admin or client, optionally linked to a client)
- Create / edit / deactivate projects
- Create or rotate project API keys
- Open any client workspace and all reports

### Client

- Land in their own workspace
- See only projects returned by `GET /api/projects` (backend-scoped)
- Open report history and detail dashboards
- No client/user/project/key management actions

## Screens and user flows

### Admin overview — `/dashboard`

Loads `GET /api/clients` plus an overview sample: up to **24** projects and **20** recent reports per project.

The UI (`AdminOverview`) shows:

- Counts: clients, projects, reports in the selected time range, pass rate
- Searchable client list (filter all / with projects / empty)
- Charts: projects per client, or score/pass trends (week / month / year / all)
- Create client and create user

Clicking a client goes to that client’s workspace.

### Client workspace — `/dashboard/client/[clientId]`

Shared layout (`ClientWorkspaceShell`) with a sidebar:

- Workspace name
- All projects (admin only extra: create user / create project on the overview)
- Project list with status

**Admin** loads `GET /api/clients/:id` and `GET /api/clients/:id/projects`.  
**Client** skips the client record and loads `GET /api/projects`.

The main pane is a **projects board**: search by name, slug, repo, site, env/branch; filter passing / failing / no reports; expand/collapse cards.

Each **project card** shows latest score, coverage bars, trend chart, and report history. Admins also get **Edit project** and **Rotate API key**.

For each project the server loads `GET /api/projects/:id/reports?page=1&limit=20`. If list rows lack `reportJson` (and are not already summarized), it hydrates up to the first **12** with `GET /api/reports/:id`.

### Single project — `/dashboard/client/[clientId]/project/[projectId]`

Same project list source as the workspace, then one expanded `ProjectCard` (history default open).

### Audit report — `/dashboard/client/[clientId]/report/[reportId]`

Loads `GET /api/reports/:reportId` (must belong to the URL client) and `GET /api/projects/:projectId`. History is loaded the same way as the project board.

`ReportView` tabs:

- **Overview** — score, grade, CMS coverage/readiness, tests, coverage, pipeline, score-change vs previous run
- **Findings** — mapped static/quality/completeness issues
- Link to **detailed breakdown** when `reportJson` can be parsed as a user report
- Raw JSON tree (from the mapped view)

### Detailed quality dashboard — `.../report/[reportId]/details`

Parses `reportJson` via `parseUserReport`. If parsing fails, 404.

Sections include static-analysis issues, failed tests, per-file tests, CMS readiness, missing coverage / completeness, and coverage by file. Copy is humanized (`lib/business-copy.ts`) for non-engineering readers.

## Admin write operations (server actions)

All of these use `Authorization: Bearer {accessToken}` and revalidate dashboard paths on success.

| Action | UI |
| --- | --- |
| `createClientAction` | Modal: name, slug, contact email; optional nested user |
| `createUserAction` | Modal: name, email, password, role; client users can be linked |
| `createProjectAction` | Modal: name, slug, repo/site URLs, description, audit environments (env type, branch, schedule, coverage threshold). Response may include a one-time API key. |
| `updateProjectAction` | Edit modal: metadata and audit config |
| `deleteProjectAction` | Deactivate project (backend DELETE; UI treats it as deactivate) |
| `createApiKeyAction` | Additional key (does not rotate existing) |
| `regenerateApiKeyAction` | Rotate: deactivates existing keys and issues a new one |

Plain API keys are shown once in `ApiKeyReveal`. They are used **outside this app** (CI) to upload reports:

```http
POST /api/reports
X-API-Key: utc_...
```

The dashboard only **displays** ingested reports; it does not post report payloads.

## Report display pipeline

1. Backend returns list items and/or full `reportJson`.
2. `normalizeReportsPage` / `normalizeReportDetail` flatten varying JSON envelopes (`data`, `items`, `_id`, etc.).
3. `listRowFromApi` / `detailView` produce scores, coverage, findings, status.
4. `parseUserReport` drives the detailed quality page (quality score, CMS, completeness, static issues, test files).

Status mapping: `pass`/`success` → success; `warning`/`completed_with_errors` → warn; `fail`/`failed` → fail.

Pass heuristic on the admin chart: status is pass/success, **or** score ≥ 80.

## Theme and UX

- Light/dark toggle persisted in the browser
- Status colors: pass / warn / fail / info
- Motion respects `prefers-reduced-motion`
- Dashboard errors render `app/dashboard/error.tsx` with a retry control

## What this app does not do

- No local database or report upload form
- Forgot-password on login is a non-functional placeholder
- “Remember me” is UI-only; session length is always `SESSION_MAX_AGE` (7 days)
- Pagination of reports beyond the first page of 20 is not requested from the API (history UI paginates the already-loaded rows, 8 per page)
