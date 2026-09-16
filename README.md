# UTC Auditor UI

Authenticated Next.js dashboard for the UTC Auditor platform. This app acts as a frontend/BFF for the Nest backend (`utc-auditor-be`) and renders different experiences for admin and client users based on the JWT role.

The UI does not own the source of truth for clients, projects, reports, or users. Those live in the backend API, and this app reads and writes through authenticated calls.

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/FUNCTIONALITY.md](docs/FUNCTIONALITY.md) | Architecture, auth, roles, screens, report pipeline |
| [docs/API.md](docs/API.md) | Browser BFF routes and every Nest API call the app makes |
| [docs/SEQUENCES.md](docs/SEQUENCES.md) | Mermaid sequence diagrams (auth, loads, writes, CI ingest) |
| [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) | QA pass/fail checklist and smoke path |
| [docs/CONFLUENCE.md](docs/CONFLUENCE.md) | Single page to paste into Confluence or Notion |

## Project structure

```text
utc-auditor-ui/
├── app/                 Next.js app router pages and route handlers
├── components/          Dashboard, modal, report, and auth UI
├── lib/                 API client helpers, session helpers, and mapping logic
├── public/              Static assets (if added later)
├── .env.example         Local environment example
├── package.json         Scripts and dependencies
├── next.config.mjs      Next configuration
├── tailwind.config.ts   Tailwind theme and design tokens
└── README.md            Project documentation
```

## Prerequisites

- Node.js 18+
- A running UTC Auditor backend on `http://localhost:3000`
- Optional: a local `.env.local` for backend configuration

## Environment setup

Copy the template:

```bash
cp .env.example .env.local
```

Example:

```env
BACKEND_URL=http://localhost:3000
```

The dashboard itself runs on port `3001`, so it does not collide with the API server on `3000`.

## Run locally

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3001

## Authentication flow

This app includes a first-run bootstrap flow for new installations:

- `GET /api/auth/setup-status` checks whether setup is required
- `POST /api/auth/setup` creates the first admin user
- `POST /api/auth/login` signs in existing users
- `POST /api/auth/logout` clears the session

After bootstrap, the same sign-in screen is used for both admin and client accounts.

## User roles

### Admin

Admin users can:

- List and search clients
- Create clients
- Create users and link them to a client
- Create projects for a client
- Generate project API keys
- View report history and detailed report dashboards

### Client

Client users can:

- View their own projects
- Open report history and details for those projects
- Access the report dashboard without admin management actions

## Report workflow

The dashboard consumes backend endpoints such as:

- `GET /api/projects/:projectId/reports`
- `GET /api/reports/:reportId`

The detailed report view renders the backend `reportJson` payload, including quality score, CMS readiness, completeness, static issues, and coverage information.

Project lists support search, pass/fail filtering, and expand/collapse interactions. The report history list supports trigger filters, failing-only filtering, and sorting by date and score.

## Report upload

Admins create a project API key and upload reports to the backend with a request like:

```http
X-API-Key: utc_...
POST /api/reports
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server on port 3001 |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint checks |

## Design and UX notes

- Dark/light theme support via a header toggle and persisted preference
- Status color system for pass / warn / fail / info states
- Modal flows for creating clients, users, projects, and confirming sign-out
- Report detail pages with Overview / Findings / JSON views

## Backend contract

For the API contract details, see the backend project documentation such as `utc-auditor-be/docs/API.md`.

## Notes

- This app expects the backend to be available before auth and data loading will work.
- If the backend is down, the UI surfaces a backend connection error rather than storing data locally.
