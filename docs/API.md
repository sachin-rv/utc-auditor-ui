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

Checks whether this installation still needs its first admin account. The login page calls it on load and switches the form to “create admin” when `setupRequired` is true.

- **Caller:** `app/login/page.tsx` on mount
- **Proxies to:** `GET {BACKEND_URL}/api/auth/setup-status`
- **Success body:** `{ setupRequired: boolean }`
- **On backend failure:** JSON error with backend status, or `{ setupRequired: false }` if the error is unexpected

### `POST /api/auth/setup`

Creates the first administrator and signs them in. Used only when setup is still required.

- **Caller:** login form when setup is required
- **Body:** `{ name, email, password }`
- **Proxies to:** `POST {BACKEND_URL}/api/auth/setup`
- **Success:** `{ role, name, clientId }` plus `utc_session` cookie
- **Error:** `{ error: string }` with backend status or 502

### `POST /api/auth/login`

Signs in an existing admin or client user and stores the JWT in the `utc_session` cookie.

- **Caller:** login form
- **Body:** `{ email, password }`
- **Proxies to:** `POST {BACKEND_URL}/api/auth/login`
- **Success / error:** same cookie and JSON shape as setup

### `POST /api/auth/logout`

Ends the browser session. It only clears the `utc_session` cookie; the Nest API is not called.

- **Caller:** `LogoutButton`
- **Backend:** none
- **Effect:** clears `utc_session`, returns `{ ok: true }`

### `GET /api/auth/expired`

Clears a rejected session and sends the user to `/login?reason=session`. The server redirects here when the backend answers 401. No Nest call.

---

## Next.js → backend (authenticated)

Paths below are relative to `{BACKEND_URL}/api`.

### Auth (public, via BFF)

| Method | Path | What it does | Request | Response used by UI |
| --- | --- | --- | --- | --- |
| GET | `/auth/setup-status` | Tells the login page whether the first admin still needs to be created | — | `{ setupRequired }` |
| POST | `/auth/setup` | Creates that first admin and returns a session token | `{ name, email, password }` | `{ accessToken, user }` |
| POST | `/auth/login` | Validates email and password and returns a session token | `{ email, password }` | `{ accessToken, user }` |

`user` fields: `id`, `email`, `name`, `role` (`admin` \| `client`), `clientId`, `isActive`.

### Clients

| Method | Path | What it does | Request body |
| --- | --- | --- | --- |
| GET | `/clients` | Lists every client for the admin home page (name, slug, contact, status, project count) | — |
| GET | `/clients/:clientId` | Loads one client so the workspace header and page title can show name, slug, contact email, and status. Admin only. A 404 renders not-found | — |
| POST | `/clients` | Creates a client, optionally with its first login user, then refreshes the admin dashboard | `{ name, slug, contactEmail?, user?: { email, password, name } }` |

Normalized client: `id`, `name`, `slug`, `contactEmail`, `status`, optional `projectCount`.

### Users

| Method | Path | What it does | Request body |
| --- | --- | --- | --- |
| POST | `/users` | Creates an admin or client login. `clientId` is included only when the role is `client` and a client was selected | `{ email, password, name, role, clientId? }` |

### Projects

| Method | Path | What it does | Request body |
| --- | --- | --- | --- |
| GET | `/projects` | Lists the projects the signed-in user is allowed to see. Client users use this instead of the per-client list. The admin overview also uses it as the sample of projects to chart | — |
| GET | `/clients/:clientId/projects` | Lists that client’s projects for the admin workspace sidebar, projects page, and project page | — |
| GET | `/projects/:projectId` | Loads one project’s name, slug, and status for a report page. Failure is ignored and the page falls back to “Project” | — |
| POST | `/clients/:clientId/projects` | Creates a project under the client. The response may include a one-time `apiKey.plainKey` | See below |
| PATCH | `/projects/:projectId` | Updates name, URLs, description, status, or audit config | Partial update |
| DELETE | `/projects/:projectId` | Deactivates the project. The UI treats the response as the updated project and refreshes the client page | — |

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

| Method | Path | What it does | Request body |
| --- | --- | --- | --- |
| POST | `/projects/:projectId/api-keys` | Issues an extra upload key for the project. `plainKey` is shown once | `{ name }` |
| POST | `/projects/:projectId/api-keys/regenerate` | Rotates the project’s keys and returns the new plaintext key once | `{ name? }` |

Response (`ApiKeyCreated`): `id`, `projectId`, `name`, `keyPrefix`, `plainKey`, `message`.

### Reports (read in this app)

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/projects/:projectId/reports?page=1&limit=20` | Loads the newest page of reports for one project: scores, status, coverage, and timestamps used by project cards, the admin charts, and report history |
| GET | `/reports/:reportId` | Loads the full report, including `reportJson`, for the report page, the quality-details page, a raw-JSON fetch, or to fill in a list row that arrived without JSON |

List response is normalized to `{ project, reports, total, page, limit }`. List items may include `summary`, `pipeline`, `generatedAt`, optional `reportJson`.

Detail includes `reportJson` (or `payload` / `json` aliases) used for scores, findings, and the quality dashboard.

Admin overview caps at **24** projects and **20** reports each, and does not download report JSON. Project boards download the full report only for the newest row, and skip that call when the row already has a summary score and a total test count.

### Reports (write — not called by the UI)

CI / auditors upload with the project key:

```http
POST /api/reports
X-API-Key: utc_...
Content-Type: application/json
```

Body is the auditor payload stored as `reportJson`. See the backend `docs/API.md` for the exact schema.

---

## Calls by page

What runs when each screen loads, and which extra calls a button on that screen can make. Paths below are full URLs the browser or server issues (`http://localhost:3001` for this app, `{BACKEND_URL}/api` for Nest).

A few rules apply on every authenticated page:

- No session cookie, or an expired access token, redirects to `/login` before any backend call.
- A backend `401` redirects to `/api/auth/expired`, which clears the cookie and sends the user to `/login?reason=session`.
- The client workspace layout wraps every `/dashboard/client/...` page, so its calls run on those pages too. Next.js dedupes identical GETs in one render, so a path requested by both the layout and the page is sent once.
- Report lists are `GET /projects/{projectId}/reports?page=1&limit=20`. On a project board, only the newest row that lacks both `reportJson` and a summary score is followed by `GET /reports/{reportId}`. Older rows stay as list metadata. The report page does not repeat that download for history; it already loaded the open report.

### `/`

Home does not call the API. It reads the session cookie and redirects to `/login`, `/dashboard` (admin), or `/dashboard/client/{clientId}` (client user).

### `/login`

**On load**

| Call | What it does |
| --- | --- |
| Browser `GET /api/auth/setup-status` | Asks this app whether the first admin still needs to be created |
| Nest `GET /api/auth/setup-status` | The route above proxies that check. `setupRequired: true` shows the create-admin form |

**On submit**

| Call | What it does |
| --- | --- |
| Browser `POST /api/auth/setup` | First-time form. Body `{ name, email, password }` |
| Nest `POST /api/auth/setup` | Creates the admin and returns `{ accessToken, user }`. This app stores the token in the `utc_session` cookie |
| Browser `POST /api/auth/login` | Normal sign-in. Body `{ email, password }` |
| Nest `POST /api/auth/login` | Same cookie result for an existing admin or client user |

### `/dashboard`

The dashboard shell (header, theme, logout) does not call the API by itself. Logout is a button: browser `POST /api/auth/logout` clears the cookie and does not call Nest.

**Admin**

| Call | What it does |
| --- | --- |
| `GET /api/clients` | Client list: name, slug, contact, status |
| `GET /api/projects` | All projects, used to count projects per client and to feed the charts |
| `GET /api/projects/{projectId}/reports?page=1&limit=20` | Once per project, capped at 24 projects. Scores and coverage for the overview charts. Report detail is not fetched |

**Buttons on this page**

| Action | Call | What it does |
| --- | --- | --- |
| Create client | `POST /api/clients` | Creates a client, optionally with its first user |
| Create user | `POST /api/users` | Creates an admin or client login |

**Client user**

If the session has a `clientId`, this page does not call the API. It redirects to `/dashboard/client/{clientId}`.

If it does not, the page stays here:

| Call | What it does |
| --- | --- |
| `GET /api/projects` | Projects this user can see |
| `GET /api/projects/{projectId}/reports?page=1&limit=20` | Once per project, for the project board |
| `GET /api/reports/{reportId}` | Only the newest report, and only when that list row has no JSON and no summary score |

### `/dashboard/client/{clientId}`

Example: `/dashboard/client/6a9fedfbb56d5109c017a248`.

A client user whose session `clientId` does not match this URL is redirected to `/dashboard` with no backend call.

**Layout (sidebar), every visit**

| Role | Call | What it does |
| --- | --- | --- |
| Admin | `GET /api/clients/{clientId}` | Client name, slug, contact email, and status for the header |
| Admin | `GET /api/clients/{clientId}/projects` | Project names for the sidebar |
| Client user | `GET /api/projects` | That user’s projects for the sidebar. The client record is not fetched |

A missing client (`404` on the client GET) renders not-found for an admin.

**This page**

The page repeats the same client and project GETs. They are deduped with the layout, so they are not sent a second time. Then:

| Call | What it does |
| --- | --- |
| `GET /api/projects/{projectId}/reports?page=1&limit=20` | Once per project. Scores, counts, and the report list on each card |
| `GET /api/reports/{reportId}` | Only the newest report, and only when that list row has no JSON and no summary score |

**Buttons on this page (admin)**

| Action | Call | What it does |
| --- | --- | --- |
| Create user | `POST /api/users` | Creates a user, defaulting the client to this workspace |
| Create project | `POST /api/clients/{clientId}/projects` | Creates a project. The response may include a one-time API key |
| Edit project | `PATCH /api/projects/{projectId}` | Updates name, URLs, description, status, or audit config |
| Deactivate project | `DELETE /api/projects/{projectId}` | Deactivates the project |
| Extra API key | `POST /api/projects/{projectId}/api-keys` | Issues another upload key |
| Rotate API key | `POST /api/projects/{projectId}/api-keys/regenerate` | Replaces keys and returns the new plaintext key once |

### `/dashboard/client/{clientId}/project/{projectId}`

The workspace layout runs first (same client and project-list calls as above).

| Call | What it does |
| --- | --- |
| `GET /api/clients/{clientId}/projects` or `GET /api/projects` | Same list as the layout, deduped. The page picks the project that matches `{projectId}`. Unknown id is not-found |
| `GET /api/projects/{projectId}/reports?page=1&limit=20` | Reports for this project only |
| `GET /api/reports/{reportId}` | Only the newest report, and only when that list row has no JSON and no summary score |

Admin edit, deactivate, and API-key buttons on the project card use the same write calls as the client projects page.

### `/dashboard/client/{clientId}/report/{reportId}`

The workspace layout runs first.

| Call | What it does |
| --- | --- |
| `GET /api/reports/{reportId}` | Full report, including `reportJson`, for the audit view. A report whose `clientId` does not match the URL is not-found |
| `GET /api/projects/{projectId}` | Project name, slug, and status for the title. If this fails, the title falls back to “Project” |
| `GET /api/projects/{projectId}/reports?page=1&limit=20` | History list. Rows are not downloaded again. The open report, already loaded above, is merged into that list |

**When the user opens raw JSON**

| Call | What it does |
| --- | --- |
| `GET /api/reports/{reportId}` | Loads `reportJson` again if it is not already on the page |

### `/dashboard/client/{clientId}/report/{reportId}/details`

The workspace layout runs first. This page does not load the report history list.

| Call | What it does |
| --- | --- |
| `GET /api/reports/{reportId}` | Full report. The quality breakdown is rendered from `reportJson`. No parseable payload is not-found |
| `GET /api/projects/{projectId}` | Project name for the title. Failure falls back to “Project” |

---

## Error shape

Backend JSON `message` (string or array) or `error` is surfaced. Unreachable host becomes status **502** with a connection message. Server actions return `{ ok: false, error }` instead of throwing into the form.

---

## Types

Canonical TypeScript contracts: `lib/api-types.ts`.  
Response unwrapping (arrays under `items` / `data` / `clients` / `projects`, ids as `id` or `_id`): `lib/api-normalize.ts`.
