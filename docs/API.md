# API calls

Two HTTP surfaces:

1. **Browser → Next.js** (auth BFF only)
2. **Next.js → Nest backend** (`{BACKEND_URL}/api`, default `http://localhost:3000/api`)

Helpers in `lib/backend.ts`:

| Helper | Auth | Use |
| --- | --- | --- |
| `backendPublic` | None | Login, setup, setup-status |
| `backendFetch` | `Authorization: Bearer {session.accessToken}` | Server actions and some page loads |
| `apiGet` | Same as `backendFetch` | Reads; maps 401/403/404 to redirects / notFound |

All backend calls send `Content-Type: application/json` and `cache: "no-store"`.

---

## Browser → Next.js

These run in the login page and logout button. They do not attach the JWT; the login/setup handlers set the `utc_session` cookie.

### `GET /api/auth/setup-status`

- **Caller:** `app/login/page.tsx` on mount
- **Proxies to:** `GET {BACKEND_URL}/api/auth/setup-status`
- **Success body:** `{ setupRequired: boolean }`
- **On backend failure:** JSON error with backend status, or `{ setupRequired: false }` if the error is unexpected

### `POST /api/auth/setup`

- **Caller:** login form when setup is required
- **Body:** `{ name, email, password }`
- **Proxies to:** `POST {BACKEND_URL}/api/auth/setup`
- **Success:** `{ role, name, clientId }` plus `utc_session` cookie
- **Error:** `{ error: string }` with backend status or 502

### `POST /api/auth/login`

- **Caller:** login form
- **Body:** `{ email, password }`
- **Proxies to:** `POST {BACKEND_URL}/api/auth/login`
- **Success / error:** same cookie and JSON shape as setup

### `POST /api/auth/logout`

- **Caller:** `LogoutButton`
- **Backend:** none
- **Effect:** clears `utc_session`, returns `{ ok: true }`

---

## Next.js → backend (authenticated)

Paths below are relative to `{BACKEND_URL}/api`.

### Auth (public, via BFF)

| Method | Path | Request | Response used by UI |
| --- | --- | --- | --- |
| GET | `/auth/setup-status` | — | `{ setupRequired }` |
| POST | `/auth/setup` | `{ name, email, password }` | `{ accessToken, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ accessToken, user }` |

`user` fields: `id`, `email`, `name`, `role` (`admin` \| `client`), `clientId`, `isActive`.

### Clients

| Method | Path | When | Request body |
| --- | --- | --- | --- |
| GET | `/clients` | Admin dashboard overview | — |
| GET | `/clients/:clientId` | Admin client workspace layout + page | — |
| POST | `/clients` | Create client | `{ name, slug, contactEmail?, user?: { email, password, name } }` |

Normalized client: `id`, `name`, `slug`, `contactEmail`, `status`, optional `projectCount`.

### Users

| Method | Path | When | Request body |
| --- | --- | --- | --- |
| POST | `/users` | Create user | `{ email, password, name, role, clientId? }` |

`clientId` is sent only when `role === "client"` and a client was selected.

### Projects

| Method | Path | When | Request body |
| --- | --- | --- | --- |
| GET | `/projects` | Client user workspace; admin overview sample | — |
| GET | `/clients/:clientId/projects` | Admin workspace / project page | — |
| GET | `/projects/:projectId` | Report pages (name/slug/status) | — |
| POST | `/clients/:clientId/projects` | Create project | See below |
| PATCH | `/projects/:projectId` | Edit project | Partial update |
| DELETE | `/projects/:projectId` | Deactivate project | — |

**Create project body** (`CreateProjectInput`):

```json
{
  "name": "string",
  "slug": "kebab-case",
  "repositoryUrl": "https://...",
  "websiteUrl": "https://...",
  "description": "string",
  "apiKeyName": "optional",
  "auditConfig": [
    {
      "envType": "development | qa | staging | production",
      "branch": "main",
      "schedule": "daily | weekly | manual",
      "minCoverageThreshold": 80
    }
  ]
}
```

**PATCH body** may include `name`, `repositoryUrl`, `websiteUrl`, `description`, `status`, `auditConfig`.

Create response may include nested `apiKey` (`plainKey` shown once). Delete response is normalized as a project so the UI can revalidate the client path.

### API keys

| Method | Path | When | Request body |
| --- | --- | --- | --- |
| POST | `/projects/:projectId/api-keys` | Additional key | `{ name }` |
| POST | `/projects/:projectId/api-keys/regenerate` | Rotate keys | `{ name? }` |

Response (`ApiKeyCreated`): `id`, `projectId`, `name`, `keyPrefix`, `plainKey`, `message`.

### Reports (read in this app)

| Method | Path | When |
| --- | --- | --- |
| GET | `/projects/:projectId/reports?page=1&limit=20` | Project cards, admin overview, report history |
| GET | `/reports/:reportId` | Report page, details page, hydrate sparse list rows |

List response is normalized to `{ project, reports, total, page, limit }`. List items may include `summary`, `pipeline`, `generatedAt`, optional `reportJson`.

Detail includes `reportJson` (or `payload` / `json` aliases) used for scores, findings, and the quality dashboard.

Admin overview caps at **24** projects and **20** reports each. Project boards hydrate at most the first **12** list rows that lack JSON (unless a later row already has summary score + total tests).

### Reports (write — not called by the UI)

CI / auditors upload with the project key:

```http
POST /api/reports
X-API-Key: utc_...
Content-Type: application/json
```

Body is the auditor payload stored as `reportJson`. See the backend `docs/API.md` for the exact schema.

---

## Call map by page / action

| UI entry | Backend calls |
| --- | --- |
| Login page load | `GET /auth/setup-status` |
| Create first admin | `POST /auth/setup` |
| Sign in | `POST /auth/login` |
| Admin `/dashboard` | `GET /clients`, `GET /projects`, then `GET /projects/:id/reports` per sampled project |
| Client `/dashboard` (no `clientId` on session) | `GET /projects` + reports per project |
| Client workspace layout | Admin: `GET /clients/:id` + `GET /clients/:id/projects`. Client: `GET /projects` |
| Client projects page | Same as layout, plus reports per project (and optional `GET /reports/:id` hydrate) |
| Project page | Projects list as above, then reports for one project |
| Report page | `GET /reports/:id`, `GET /projects/:id`, reports list (+ hydrate) |
| Report details | `GET /reports/:id`, `GET /projects/:id` |
| Create client | `POST /clients` |
| Create user | `POST /users` |
| Create project | `POST /clients/:id/projects` |
| Edit project | `PATCH /projects/:id` |
| Deactivate project | `DELETE /projects/:id` |
| Extra API key | `POST /projects/:id/api-keys` |
| Rotate API key | `POST /projects/:id/api-keys/regenerate` |

---

## Error shape

Backend JSON `message` (string or array) or `error` is surfaced. Unreachable host becomes status **502** with a connection message. Server actions return `{ ok: false, error }` instead of throwing into the form.

---

## Types

Canonical TypeScript contracts: `lib/api-types.ts`.  
Response unwrapping (arrays under `items` / `data` / `clients` / `projects`, ids as `id` or `_id`): `lib/api-normalize.ts`.
