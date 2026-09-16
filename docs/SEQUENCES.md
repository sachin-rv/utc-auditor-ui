# Sequence diagrams

Copy these Mermaid blocks into Confluence (Mermaid macro), Notion, GitHub, or the backend wiki. They match the current UI code.

## Sign-in and first-run setup

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Login as Login page
  participant BFF as Next /api/auth
  participant API as Nest /api
  participant Cookie as utc_session cookie

  User->>Login: Open /login
  Login->>BFF: GET /api/auth/setup-status
  BFF->>API: GET /auth/setup-status
  API-->>BFF: { setupRequired }
  BFF-->>Login: { setupRequired }

  alt First install
    User->>Login: Name, email, password
    Login->>BFF: POST /api/auth/setup
    BFF->>API: POST /auth/setup
    API-->>BFF: { accessToken, user }
  else Existing user
    User->>Login: Email, password
    Login->>BFF: POST /api/auth/login
    BFF->>API: POST /auth/login
    API-->>BFF: { accessToken, user }
  end

  BFF->>Cookie: Set httpOnly session (JWT + role)
  BFF-->>Login: { role, name, clientId }
  alt role is admin
    Login->>User: Redirect /dashboard
  else role is client
    Login->>User: Redirect /dashboard/client/{clientId}
  end
```

## Route guard and session

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant MW as middleware.ts
  participant Page as Dashboard page
  participant Auth as getSession()
  participant API as Nest /api

  User->>MW: GET /dashboard...
  alt No utc_session
    MW-->>User: 302 /login?next=...
  else Cookie present
    MW->>Page: Continue
    Page->>Auth: Decode cookie
    alt No session
      Page-->>User: 302 /login
    else Client opening another tenant
      Page-->>User: 302 /dashboard
    else OK
      Page->>API: Bearer JWT
      API-->>Page: JSON
      Page-->>User: Render
    end
  end
```

## Admin overview load

```mermaid
sequenceDiagram
  autonumber
  participant Page as /dashboard
  participant API as Nest /api

  Page->>API: GET /clients
  par Overview sample
    Page->>API: GET /projects
  end
  API-->>Page: clients, projects
  loop Up to 24 projects
    Page->>API: GET /projects/{id}/reports?page=1&limit=20
  end
  Page-->>Page: Charts + client list (client-side filters)
```

## Client workspace and project board

```mermaid
sequenceDiagram
  autonumber
  participant Layout as client layout
  participant Page as client page
  participant API as Nest /api

  alt Admin
    Layout->>API: GET /clients/{clientId}
    Layout->>API: GET /clients/{clientId}/projects
  else Client user
    Layout->>API: GET /projects
  end
  Layout-->>Page: Sidebar projects

  Page->>API: Same project list as layout
  loop Each project
    Page->>API: GET /projects/{id}/reports?page=1&limit=20
    opt First 12 rows missing reportJson
      Page->>API: GET /reports/{reportId}
    end
  end
  Page-->>Page: ProjectsBoard (search / pass-fail / expand)
```

## Open an audit report

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Report as "/report/{id}"
  participant Quality as "/report/{id}/details"
  participant API as Nest /api
  participant Map as report-map / user-report

  User->>Report: Open report
  Report->>API: GET /reports/{id}
  Report->>API: GET /projects/{projectId}
  Report->>API: GET /projects/{projectId}/reports
  API-->>Map: reportJson and summary
  Map-->>Report: Overview findings history
  User->>Quality: Open detailed breakdown
  Quality->>API: GET /reports/{id}
  Quality->>API: GET /projects/{projectId}
  Quality->>Map: parseUserReport reportJson
  alt Parse succeeds
    Quality-->>User: Quality CMS coverage dashboard
  else Parse fails
    Quality-->>User: 404
  end
```

## Admin write: create project and reveal API key

```mermaid
sequenceDiagram
  autonumber
  actor Admin
  participant Modal as CreateProjectButton
  participant Action as createProjectAction
  participant API as Nest /api

  Admin->>Modal: Name, slug, URLs, auditConfig
  Modal->>Action: Server action
  Action->>API: POST /clients/{clientId}/projects
  API-->>Action: Project (+ optional apiKey.plainKey)
  Action-->>Modal: { ok, data }
  opt Key in response
    Modal-->>Admin: ApiKeyReveal (shown once)
  end
  Action-->>Action: revalidatePath dashboard + client
```

## Rotate or add a project API key

```mermaid
sequenceDiagram
  autonumber
  actor Admin
  participant Modal as CreateApiKeyButton
  participant Action as server actions
  participant API as Nest /api

  alt Rotate
    Admin->>Modal: Confirm rotate
    Modal->>Action: regenerateApiKeyAction
    Action->>API: POST /projects/{id}/api-keys/regenerate
  else Additional key
    Admin->>Modal: Name
    Modal->>Action: createApiKeyAction
    Action->>API: POST /projects/{id}/api-keys
  end
  API-->>Modal: { plainKey, message }
  Modal-->>Admin: Copy key (not stored in UI)
```

## CI report ingest (outside the dashboard)

```mermaid
sequenceDiagram
  autonumber
  participant CI as CI / auditor
  participant API as Nest /api
  participant UI as Dashboard

  CI->>API: POST /reports  X-API-Key: utc_...
  API-->>CI: Stored report
  Note over UI: LiveRefresh every 20s while tab visible
  UI->>API: GET /projects/{id}/reports
  API-->>UI: New row in history
```

## Sign-out

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Btn as LogoutButton
  participant BFF as POST /api/auth/logout

  User->>Btn: Sign out
  Btn->>BFF: POST
  BFF-->>Btn: Clear utc_session
  Note over BFF: Nest is not called
  Btn-->>User: Redirect /login
```

## Other admin writes (same pattern)

| UI | Server action | Backend |
| --- | --- | --- |
| Create client | `createClientAction` | `POST /clients` |
| Create user | `createUserAction` | `POST /users` |
| Edit project | `updateProjectAction` | `PATCH /projects/:id` |
| Deactivate project | `deleteProjectAction` | `DELETE /projects/:id` |

All of those send `Authorization: Bearer {JWT}` from the session cookie.
