# Lab 4 Test Evidence and Remaining Plan

**Status:** Issue 28, Issue 29, Issue 30, and Issue 31 dashboard backend/frontend component evidence is implemented and automated where stated below. Browser-responsive, end-to-end, performance, and release work remains planned unless explicitly marked **MANUAL ONLY**. This document records current repository evidence; it does not claim complete final-release coverage for every Lab 4 criterion.

[specification.md](specification.md), [api-spec.md](api-spec.md), and [ui-spec.md](ui-spec.md) remain the approved contract.

## 1. Current Verification Record

| Surface | Command / check | Verified result |
|---|---|---|
| Server | `npm test` | **20/20 test files, 130/130 tests passed** in three consecutive full-suite runs |
| Server | `npm run build` | Passed |
| Server | `npx prisma validate` | Passed |
| Client | `npm test` | **16/16 test files, 129/129 tests passed** |
| Client | `npm run build` | Passed |
| Repository | `git diff --check` | Passed |

The three server runs followed removal of an unsafe `prisma.$disconnect()` from `server/tests/lab-03/comments-notes.api.test.ts`. That suite had disconnected the shared application Prisma singleton while parallel API files could still use it, causing nondeterministic `socket hang up` and CSRF setup failures. API integration test files now run sequentially because they share one test database and dashboard global aggregate/parity assertions require a stable database snapshot. This is test-only configuration; application/runtime behavior is unchanged.

## 2. Test Database Isolation

- `NODE_ENV=test` resolves the Prisma datasource from `TEST_DATABASE_URL`.
- Test mode has no fallback to `DATABASE_URL`.
- Equivalent development and test targets are rejected by `server/src/database-url.ts` and `server/tests/database-url.test.ts`.
- Actions Taken API fixtures use unique records and clean up their Action, Ticket, and related fixture data.
- Migration and seed integration tests create disposable databases through `server/tests/helpers/migration-test-database.ts`.
- The seed integration child process receives its temporary `TEST_DATABASE_URL`, so it never seeds the developer database.

## 3. Implemented Automated Coverage — Issue 28

| Evidence ID | Test file | Coverage proved by current assertions | Status |
|---|---|---|---|
| DB-ISO-01 | `server/tests/database-url.test.ts` | Test URL required in test mode; no development fallback; matching database targets refused | IMPLEMENTED / AUTOMATED |
| ACTION-01 | `server/tests/lab-04/actions-taken.api.test.ts` | Draft and Completed create; public response DTO; server-controlled fields rejected; Ticket version increment | IMPLEMENTED / AUTOMATED |
| ACTION-02 | `server/tests/lab-04/actions-taken.api.test.ts` | Required `requestKey`; required Draft/Completed fields; follow-up dependency; submitted note persists as `null` when follow-up is false | IMPLEMENTED / AUTOMATED |
| ACTION-03 | `server/tests/lab-04/actions-taken.api.test.ts` | Draft edit, completion, cancellation, valid Staff/Admin assignment, explicit unassignment, invalid/inactive/non-staff assignee rejection | IMPLEMENTED / AUTOMATED |
| ACTION-04 | `server/tests/lab-04/actions-taken.api.test.ts` | Completed/Cancelled PATCH rejection, unchanged terminal rows, and no DELETE route | IMPLEMENTED / AUTOMATED |
| ACTION-05 | `server/tests/lab-04/actions-taken.api.test.ts` | Requester-owned reads, foreign Ticket safe 404, stable ordering, pagination bounds | IMPLEMENTED / AUTOMATED |
| ACTION-06 | `server/tests/lab-04/actions-taken.api.test.ts` | Requester writes denied; Staff/Admin action capability; missing CSRF/auth handling | IMPLEMENTED / AUTOMATED |
| ACTION-07 | `server/tests/lab-04/actions-taken.api.test.ts` | Stale Ticket/Action versions return `409 STALE_UPDATE` without partial mutation; inactive Ticket writes rejected | IMPLEMENTED / AUTOMATED |
| CONFLICT-01 | `server/tests/lab-04/actions-taken.api.test.ts` | Same-key retry returns existing Action; different key creates another Action; concurrent same-key POST creates one row and increments Ticket version once | IMPLEMENTED / AUTOMATED |
| MIG-01 | `server/tests/lab-04/migration-regression.integration.test.ts` | Real migration preserves representative Users, Ticket IDs/FKs/content/status/priority/assignment, Attachments, Public Comments, Internal Notes; version 1; null `resolvedAt`; no historical Actions | IMPLEMENTED / AUTOMATED |
| SEED-01 | `server/tests/lab-04/seed.integration.test.ts` | Fresh temporary database gets all eight Ticket statuses and Action fixtures; rerun preserves modified User, Ticket, and Action state without duplicates | IMPLEMENTED / AUTOMATED |

There is no separate `concurrency.integration.test.ts`; the Actions Taken API test is the direct current concurrency evidence.

## 4. Implemented Automated Coverage — Issue 29

| Evidence ID | Test file | Coverage proved by current assertions | Status |
|---|---|---|---|
| UI-ACTION-01 | `client/tests/lab-04/ActionsTakenPanel.test.tsx` | Loading, empty, list/detail view, Requester read-only access, no Requester mutation controls, Staff/Admin create controls, paging | IMPLEMENTED / AUTOMATED |
| UI-ACTION-02 | `client/tests/lab-04/ActionTakenForm.test.tsx` | Description/result/follow-up validation, 2,000-character description acceptance, 2,001-character rejection, attachment-note limit, follow-up toggle preservation, create/edit payloads | IMPLEMENTED / AUTOMATED |
| UI-ACTION-03 | `client/tests/lab-04/ActionTakenForm.test.tsx` | Stable create `requestKey` across rerender; Draft edit; completion/cancellation version payloads | IMPLEMENTED / AUTOMATED |
| UI-STATE-01 | `client/tests/lab-04/ActionsTakenPanel.test.tsx` | GET failure/retry; `STALE_UPDATE` refresh with local draft preservation; `TICKET_NOT_ACTIVE` preservation and reactivation recovery; `ACTION_IMMUTABLE` and terminal-after-stale review-only behavior | IMPLEMENTED / AUTOMATED |
| UI-A11Y-01 | `client/tests/lab-04/ActionTakenForm.test.tsx` | Associated labels, accessible validation messages, actual focus on first invalid field | IMPLEMENTED / AUTOMATED |

The Actions Taken UI is mounted on Requester Ticket Detail, Staff Ticket Detail, and Administrator Ticket Inspection. Component tests exercise role modes; server tests prove corresponding authorization.

## 5. Manual-Only Issue 29 Checks

| Area | Current evidence | Status |
|---|---|---|
| Responsive table-to-card presentation | Component/CSS implementation switches below the desktop breakpoint | MANUAL ONLY |
| Long text, long names, and 2,000-character display | No browser viewport or screenshot test | MANUAL ONLY |
| 1440px, tablet, mobile, zoom, and horizontal-scroll behavior | No Playwright responsive suite exists | MANUAL ONLY |
| Mobile touch targets and keyboard-only traversal | Semantic controls and focus styles exist; no browser-level test | MANUAL ONLY |
| View/Edit control grouping and Staff Queue layout | Scoped UI/CSS implementation exists; manual visual review required | MANUAL ONLY |

## 6. Workflow Coverage — Issue 30

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| WORKFLOW-01 | API/integration | AC-06 | All 18 transition-matrix edges for Staff/Admin, every same-state/forbidden edge, unknown enum, and Requester denial | Only documented edges succeed; invalid edges return `409`; unknown status returns `422`; Requester returns `403` | `server/tests/lab-04/ticket-workflow.api.test.ts` | IMPLEMENTED / AUTOMATED |
| WORKFLOW-02 | API/integration | AC-07 | Resolution gate, `resolvedAt`, close/reopen/re-resolve, and cancellation of Draft Actions | Blocked requests leave state unchanged; valid evidence resolves; terminal Actions remain unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | IMPLEMENTED / AUTOMATED |
| WORKFLOW-03 | API/integration/client | AC-08 | Owned requester advisory, duplicate/disallowed/foreign rejection, Staff/Admin display | Server-derived advice persists without status change and is displayed to operational users | `server/tests/lab-04/ticket-workflow.api.test.ts`; `client/tests/lab-02/RequesterTicketDetail.test.tsx`; `client/tests/lab-03/AdminTicketInspection.test.tsx` | IMPLEMENTED / AUTOMATED |
| WORKFLOW-04 | API/client | AC-13 | Administrator operational owner/claim/priority/status behavior and Requester denial | Administrator receives approved Staff behavior; Requester writes remain forbidden | `server/tests/lab-03/staff-ticket-detail.api.test.ts`; `client/tests/lab-03/AdminTicketInspection.test.tsx` | IMPLEMENTED / AUTOMATED |
| CONFLICT-03 | API/client | AC-15 | Versioned owner/claim/priority/status and advisory writes, stale races, conflict refresh | One concurrent mutation succeeds, stale write returns `409 STALE_UPDATE`, and UI refreshes authoritative state without false success | `server/tests/lab-03/staff-ticket-detail.api.test.ts`; `server/tests/lab-04/ticket-workflow.api.test.ts`; `client/tests/lab-03/StaffTicketDetail.test.tsx` | IMPLEMENTED / AUTOMATED |

## 7. Issue 31 Dashboard Evidence and Future Coverage

Issue 31 backend evidence IDs:

| ID | Evidence | Scope |
|---|---|---|
| DASH-01 | `server/tests/lab-04/dashboards.api.test.ts`, `server/tests/lab-02/my-tickets.api.test.ts` | Authenticated requester ownership, active-status aggregation, waiting count, preview bounds, and recently-resolved pagination |
| DASH-02 | `server/tests/lab-04/dashboards.api.test.ts` | Executable Staff personal Ticket ownership and Action performer evidence, Administrator personal identity, ACTIVE-only priority buckets, terminal exact-status buckets, and complete status/priority bucket keys |
| DASH-03 | `server/tests/lab-04/dashboards.api.test.ts`, `server/tests/lab-02/my-tickets.api.test.ts` | Executable deterministic shared `asOf`/window evidence; requester `updatedAt`, formal `resolvedAt`, legacy `updatedAt` fallback, reopened exclusion, Staff `updatedAt`, Action `completedAt` boundaries; and effective-resolution ordering/pagination |
| DASH-04 | `server/tests/lab-04/dashboards.api.test.ts` | Executable authenticated invalid-query matrix plus Requester, IT Staff, and Administrator dashboard-to-drill-down parity |
| DASH-UI-01 | `client/tests/lab-04/Dashboards.test.tsx` | Requester and Staff dashboard rendering, all metric/status/priority buckets, preview content, Asia/Bangkok label, legacy-resolution label, and exact returned drill-down URLs |
| DASH-UI-02 | `client/tests/lab-04/Dashboards.test.tsx`; `client/tests/lab-03/App.logout.test.tsx` | Loading busy state, real empty zero state, safe error/retry, 401 clearing protected data and returning to Login, 403 showing Access denied, `PASSWORD_CHANGE_REQUIRED` entering the forced-password flow, atomic successful refresh, stale network/5xx refresh preservation, and completed-Action pagination links |
| DASH-UI-03 | `client/tests/lab-03/App.logout.test.tsx`; `client/tests/lab-02/MyTickets.test.tsx`; `client/tests/lab-03/StaffTicketQueue.test.tsx` | Role landing/navigation guards, Administrator deep-link preservation, non-Administrator User Management deep links showing Access denied, and returned dashboard query propagation to My Tickets and Ticket Queue, including visible reset controls |

| Area | Planned evidence | Status |
|---|---|---|
| Requester and Staff/Admin dashboards, drill-downs, predicates, performance | Server dashboard tests plus `client/tests/lab-04/Dashboards.test.tsx` and list/queue routing tests | IMPLEMENTED / AUTOMATED for aggregates, status/priority buckets, ownership scoping, deterministic boundaries, drill-down parity, query guards, dashboard component states, and hash drill-down routing; performance coverage remains planned |
| Playwright Action/workflow/dashboard flows | `e2e/lab-04/*.spec.ts` | PLANNED / FUTURE ISSUES 30–33 |
| Browser responsive/accessibility suites | `responsive.spec.ts`, `accessibility.spec.ts` | PLANNED / FUTURE ISSUE 33 |
| Release evidence, screenshots, final regression checklist | Manual release checklist | PLANNED / FUTURE ISSUE 33 |

Existing Lab 1–3 regression suites continue to run in the verified server/client results above. Future work must retain authorization, ownership, file, comment/note, account-safety, and Ticket regressions.

## 8. Acceptance-Criteria Traceability

| AC | Current evidence | Status |
|---|---|---|
| AC-01 | ACTION-01, ACTION-05, UI-ACTION-01 | IMPLEMENTED / AUTOMATED |
| AC-02 | ACTION-02, UI-ACTION-02 | IMPLEMENTED / AUTOMATED for current cases; broader field-boundary expansion is future work |
| AC-03 | ACTION-03, ACTION-04, UI-ACTION-03 | IMPLEMENTED / AUTOMATED |
| AC-04 | ACTION-05, ACTION-06, UI-ACTION-01 | IMPLEMENTED / AUTOMATED |
| AC-05 | ACTION-04, ACTION-07, UI-STATE-01 | IMPLEMENTED / AUTOMATED |
| AC-06 | WORKFLOW-01 | IMPLEMENTED / AUTOMATED |
| AC-07 | WORKFLOW-02 | IMPLEMENTED / AUTOMATED |
| AC-08 | WORKFLOW-03 | IMPLEMENTED / AUTOMATED |
| AC-09–AC-12 | DASH-01–DASH-04; DASH-UI-01–DASH-UI-03 | IMPLEMENTED / AUTOMATED for the covered backend route slice, deterministic boundary evidence, drill-down parity, dashboard component states, and role/hash routing; performance remains planned |
| AC-13 | WORKFLOW-04, ACTION-06 and inherited authorization regressions | IMPLEMENTED / AUTOMATED for current role/auth cases; direct forced-password Action-route case is future work |
| AC-14 | Inherited auth/session regressions | IMPLEMENTED / AUTOMATED regression coverage |
| AC-15 | ACTION-07, CONFLICT-01, CONFLICT-03, UI-ACTION-03, UI-STATE-01 | IMPLEMENTED / AUTOMATED for idempotency/stale handling; browser-level unknown-network recovery is planned |
| AC-16 | MIG-01 | IMPLEMENTED / AUTOMATED for current additive migration evidence |
| AC-17 | Inherited server/client regressions | IMPLEMENTED / AUTOMATED regression coverage |
| AC-18 | Responsive/styles manual review | MANUAL ONLY |
| AC-19 | UI-A11Y-01 plus keyboard/zoom review | PARTIAL — automated form semantics/focus; browser checks MANUAL ONLY |
| AC-20 | UI-STATE-01 | IMPLEMENTED / AUTOMATED for covered panel states; full browser failure matrix remains planned |
| AC-21 | SEED-01 | IMPLEMENTED / AUTOMATED |
| AC-22–AC-23 | Performance and release work | PLANNED / FUTURE ISSUE 33 |

## 9. Maintenance Rules

Record future results with command, environment, and actual counts. Never mark a test as passed merely because a plan row exists. Database-backed tests must use a test-only database, own uniquely named fixtures, and clean in foreign-key-safe order. Do not use a suite-local disconnect on the shared application Prisma singleton.
