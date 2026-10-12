# TokTickIT - IT Service Desk Application

TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network requests.

## Developer Information

- **Name:** Kwanchanok Thungsuk
- **Student ID:** 67070501006

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Bootstrap
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma
- **Testing:** Vitest, React Testing Library, Supertest, and Playwright

## Project Structure
```text
toktickit/
├── client/              # React frontend application
│   ├── src/             # Frontend source code
│   └── tests/           # Frontend tests
├── server/              # Express backend application
│   ├── prisma/          # Database schema and migrations
│   ├── src/             # Backend source code
│   └── tests/           # Backend tests
├── e2e/                 # End-to-end and responsive tests
├── docs/                # Lab documentation and reports
├── artifacts/           # Lab evidence and screenshots
├── .gitignore
└── README.md
```

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Prerequisites
- Node.js installed
- PostgreSQL installed and database server running

### 2. Clone the Repository
```bash
git clone https://github.com/KwanchanokThungsuk/toktickit.git
cd toktickit
```
### 3. Backend Setup
```bash
cd server
npm install
```
### 4. Database Configuration
1. Create a `.env` file in the `server` directory.
2. Configure the normal application environment (use your own database and secrets):
   ```dotenv
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/toktickit?schema=public"
   FRONTEND_ORIGIN="http://localhost:5173"
   ```
   For automated server tests, also set a distinct `TEST_DATABASE_URL`. Test
   mode refuses to fall back to `DATABASE_URL`, so test data cannot be written
   to the development database. See `server/.env.example` for safe placeholder
   values; never commit real credentials.
3. Run Prisma migrations and seed the database:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

For browser tests, configure E2E-only variables in the environment used by
Playwright. Use dedicated test accounts and secret values; do not commit them.

Lab 2 and Lab 3 browser tests use these general variables:

```dotenv
TOKTICKIT_E2E_PASSWORD="your-e2e-password"
TOKTICKIT_E2E_REQUESTER="e2e.requester@example.com"
TOKTICKIT_E2E_STAFF="e2e.staff@example.com"
TOKTICKIT_E2E_ADMIN="e2e.admin@example.com"
TOKTICKIT_E2E_PASSWORD_CHANGE="e2e.password-change@example.com"
TOKTICKIT_E2E_TICKET_ID="1"
```

Lab 4 browser tests share `TOKTICKIT_E2E_PASSWORD` and use separate dedicated
fixture accounts:

```dotenv
TOKTICKIT_E2E_LAB4_REQUESTER="e2e.lab4.requester@example.com"
TOKTICKIT_E2E_LAB4_STAFF="e2e.lab4.staff@example.com"
TOKTICKIT_E2E_LAB4_ADMIN="e2e.lab4.admin@example.com"
TOKTICKIT_E2E_LAB4_PASSWORD_CHANGE="e2e.lab4.password-change@example.com"
```

### 5. Frontend Setup
Open a new terminal:
```bash
cd client
npm install
```
### 6. Run the Application

**Backend:**
```bash
cd server
npm run dev
```
**Frontend:**
```bash
cd client
npm run dev
```
## Lab 4 Application (Current State)

Lab 4 retains the earlier requester, authentication, queue, communication, and
administration features and adds:

- **Actions Taken** with Draft/Completed/Cancelled lifecycle, append-only
  terminal history, server attribution, optimistic versions, and deterministic
  create retries.
- **Ticket workflow** with documented Staff/Administrator transitions, a
  resolution gate, formal resolution time, and Requester advisory indication.
- **Requester and operational dashboards** with bounded previews, drill-downs,
  server-owned seven-day windows, and Administrator operational access.

## Lab 3 Baseline (Retained)

Lab 3 is the retained baseline. It retains the Lab 2 requester workflow
and adds authenticated sessions, role-based access, staff workflow, and
administrator features.

### Authentication and authorization

- Users sign in with email and password.
- The server authenticates requests with an HttpOnly session cookie and protects
  state-changing requests with CSRF checks.
- Session inactivity/expiration is enforced by the backend session policy.
- Accounts with an initial password must complete the forced Change Password
  flow before normal application access.
- Authorization is enforced on the backend for Requester, IT Staff, and
  Administrator roles.
- Logout invalidates the authenticated application session.

### Roles and capabilities

- **Requester:** My Tickets, ticket creation, owned-ticket details, permitted
  attachments, Public Comments, and Problem Appears Resolved. Ownership comes
  from the authenticated session; a Requester cannot access another user's
  tickets.
- **IT Staff:** Ticket Queue, Ticket Detail, claim/reassign, IT Priority and
  permitted status transitions, Public Comments, and Internal Notes.
- **Administrator:** User Management plus the documented operational dashboard,
  queue, Ticket Detail, Actions Taken, ownership, priority, status, Public
  Comment, and Internal Note permissions.

## Lab 2 Requester Features (Historical/Regression Reference)

Lab 2 provides the foundation retained by Lab 3 and remains documented for
historical and regression-reference purposes:

- Create an IT support ticket
- Select Category and Related System
- Upload permitted attachments
- Receive a unique Ticket Number
- View owned tickets in **My Tickets**
- Search, filter, sort, and paginate tickets
- View Ticket Detail
- Download active attachments
- Soft-remove attachments with a removal reason
- Prevent access to tickets and attachments owned by another Requester
- Responsive layout for desktop, tablet, and mobile
- Keyboard-accessible interactions
- Safe error handling without exposing technical details

## Testing and Verification

Run server commands from `server/`:

```bash
npm test
npm run build
npx prisma validate
npx vitest run tests/lab-04/performance-smoke.test.ts
```

Run client commands from `client/`:

```bash
npm test
npm run build
```

Run Playwright commands from the repository root:

```bash
npx playwright test
npx playwright test e2e/lab-04/authenticated-flows.spec.ts
npx playwright test e2e/lab-04/responsive.spec.ts
npx playwright test e2e/lab-04/accessibility.spec.ts
```

The Lab 4 performance smoke uses a dedicated test-only fixture and asserts
bounded dashboard/list responses and query-count stability. It requires the
same `TEST_DATABASE_URL` setup as the rest of the server suite.

## Lab 4 Testing and Evidence

Current release-candidate evidence is recorded in `docs/lab-04/tests.md`.
Lab 4 screenshots are stored under `artifacts/lab-04/screenshots/`:

```text
artifacts/lab-04/screenshots/
├── requester/
├── staff/
├── administrator/
└── actions-taken/
```

The screenshots cover the documented 1440×900, 1024×768, 390×844, and 320×568
viewports. Manual 200% zoom and practical touch-use checks were completed for representative Lab 4 screens and are recorded in docs/lab-04/tests.md. Dedicated contrast tooling, full screen-reader review, and hands-on native-dialog review remain optional hardening checks.

## Lab 3 Testing and Evidence

Lab 3 includes unit/integration tests, authenticated Playwright E2E tests, responsive tests, and accessibility checks.

Final recorded UI/E2E evidence includes:

- Authenticated E2E: **14/14 passed**
- Responsive E2E: **16/16 passed**
- Accessibility E2E: **3/3 passed**
- Client tests: **13 files, 88 tests passed**
- TypeScript typecheck: **passed**
- Client build: **passed**
- Server tests: **14 test files passed, 85 tests passed**
- Lab 3 screenshots: **27 screenshots** under `artifacts/lab-03/screenshots/`

### Lab 3 Evidence Structure

```text
artifacts/
└── lab-03/
    └── screenshots/
        ├── auth/
        ├── requester/
        ├── staff/
        └── admin/
```

## Lab 3 Documentation

Detailed Lab 3 specifications, API contracts, UI specifications, test plans, reviewer records, and AI-use documentation are available in:

- `docs/lab-03/specification.md`
- `docs/lab-03/api-spec.md`
- `docs/lab-03/ui-spec.md`
- `docs/lab-03/tests.md`
- `docs/lab-03/reviewer.md`
- `docs/lab-03/ai-use.md`

Lab 2 documentation remains available under `docs/lab-02/`.

## Database Access

### Prisma Studio
```bash
Run from the `server` directory:
npx prisma studio
```
### PostgreSQL CLI
```bash
# Example only; adjust host, user, database, and port to match DATABASE_URL.
psql -h localhost -U postgres -d toktickit
```
## Lab 2 Documentation (Historical/Regression Reference)

Detailed Lab 2 specifications, API contracts, UI specifications, test plans, review records, and AI-use documentation are available in:

- `docs/lab-02/specification.md`
- `docs/lab-02/api-spec.md`
- `docs/lab-02/ui-spec.md`
- `docs/lab-02/tests.md`
- `docs/lab-02/reviewer.md`
- `docs/lab-02/ai-use.md`

## Lab 2 Evidence

Screenshots and other Lab 2 evidence are stored under `artifacts/lab-02/`. 

The evidence includes responsive screenshots for desktop, tablet, and mobile layouts, together with other required Lab 2 test evidence.
