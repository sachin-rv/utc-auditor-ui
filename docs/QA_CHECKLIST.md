# QA checklist — UTC Auditor UI

Use with backend running (`BACKEND_URL`, default `http://localhost:3000`) and UI at `http://localhost:3001`.

Mark each item Pass / Fail / N/A. Note the role used (admin vs client).

## Environment

- [ ] Fresh install: login shows **Create Your Account** (setup-status true)
- [ ] After first admin exists: login shows **Welcome Back**
- [ ] Backend down: login or dashboard shows a connection / API error, not a blank hang
- [ ] Theme toggle persists after reload
- [ ] `/` redirects: signed out → `/login`; admin → `/dashboard`; client → `/dashboard/client/{id}`
- [ ] Unauthenticated `/dashboard` → `/login?next=...`

## Auth

- [ ] Setup: name, email, password create admin and land on `/dashboard`
- [ ] Login: valid admin credentials work
- [ ] Login: valid client credentials land on that client workspace
- [ ] Login: bad password shows error, no cookie
- [ ] Logout clears session; back button does not restore dashboard data
- [ ] Client cannot open `/dashboard/client/{otherClientId}` (redirect)

## Admin overview (`/dashboard`)

- [ ] Client list loads with project counts
- [ ] Search filters clients
- [ ] Status chips: all / with projects / empty
- [ ] Charts: projects per client and scores; week / month / year / all change the series
- [ ] Create **client** (name, slug, optional contact email)
- [ ] Create client **with nested user** — that user can later log in
- [ ] Create **user**: admin role (no client required)
- [ ] Create **user**: client role linked to a client
- [ ] Click client opens workspace

## Client workspace

- [ ] Sidebar shows workspace name and projects
- [ ] Admin: Create user (scoped) and Create project visible
- [ ] Client: those admin actions hidden
- [ ] Projects board search (name, slug, repo, branch)
- [ ] Filters: All / Passing / Failing / No reports
- [ ] Expand / collapse all and per-card
- [ ] Empty client shows empty state

## Project

- [ ] Create project: name, slug, optional URLs, at least one audit env (type, branch, schedule, coverage %)
- [ ] Invalid slug / URL shows field errors (no API call needed if client validation catches it)
- [ ] Success may reveal a one-time API key; copy works; closing hides the key
- [ ] Project page `/project/{id}` shows one expanded card
- [ ] Edit project: metadata and audit config save
- [ ] Deactivate project: project no longer treated as active in the list
- [ ] Rotate API key: new `plainKey` shown; old key should fail backend ingest (verify in CI or API)
- [ ] Additional API key: creates another key without rotate (if that mode is used)

## Reports

- [ ] After CI `POST /api/reports` with project key, wait ~20s (or refresh): history shows the run
- [ ] History: sort date/score, trigger filter, failing-only, search, page size 8
- [ ] Open report: overview score, coverage, tests, pipeline if present
- [ ] Score-change card vs previous run when history exists
- [ ] Findings tab lists mapped issues
- [ ] JSON tree shows payload
- [ ] **Detailed breakdown** opens when `reportJson` is a full user report
- [ ] Malformed / empty JSON on details route → 404
- [ ] Client cannot open another tenant’s report URL

## Live refresh and errors

- [ ] With tab visible, new reports appear without full reload (~20s)
- [ ] Background tab does not spam refresh until focused
- [ ] Dashboard error boundary: “Could not load this view” + Try again (force an API failure if you can)

## Out of scope / known UI placeholders

- [ ] N/A **Forgot password** — link does nothing
- [ ] N/A **Remember me** — does not change cookie max-age (always 7 days)
- [ ] N/A Report **upload form** — ingest is CI-only
- [ ] N/A History beyond first **20** reports from API (UI paginates loaded rows only)

## Regression smoke (minimum)

1. Setup or login as admin  
2. Create client + project + (optional) client user  
3. Ingest one report with API key  
4. Open overview → workspace → project → report → details  
5. Login as client user and confirm read-only workspace  
6. Logout
