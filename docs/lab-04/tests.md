# Lab 4 Test Evidence and Remaining Plan

**Status:** Issues 28–32 are implemented and covered where stated below. Issue 33 adds verified Lab 4 browser flows, responsive evidence, accessibility evidence, screenshot evidence, and deterministic performance smoke evidence. Optional additional hardening checks are identified separately and are not required for current Lab 4 acceptance completion. Final peer approval is tracked independently.

[specification.md](specification.md), [api-spec.md](api-spec.md), and [ui-spec.md](ui-spec.md) remain the approved contract.

## 1. Current Verification Record

| Surface | Command / check | Verified result |
|---|---|---|
| Server | `npm test` | **21/21 test files, 136/136 tests passed** |
| Server | `npm run build` | Passed |
| Server | `npx prisma validate` | Passed |
| Client | `npm test` | **16/16 test files, 136/136 tests passed** |
| Client | `npm run build` | Passed |
| Browser | `npx playwright test` | **64/64 passed** |
| Repository | `git diff --check` | Passed |

The three server runs followed removal of an unsafe `prisma.$disconnect()` from `server/tests/lab-03/comments-notes.api.test.ts`. That suite had disconnected the shared application Prisma singleton while API files could still use it, causing nondeterministic `socket hang up` and CSRF setup failures. API integration test files now run in one sequential test process because they share one test database and dashboard global aggregate/parity assertions require a stable database snapshot. This is test-only configuration; application/runtime behavior is unchanged.

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
| ACTION-01 | `server/tests/lab-04/actions-taken.api.test.ts` | Draft and Completed create; public response DTO; server-controlled fields rejected; Ticket version increment; stable `actionDateTime ASC, id ASC` list ordering; Action creation preserves Ticket Owner | IMPLEMENTED / AUTOMATED |
| ACTION-02 | `server/tests/lab-04/actions-taken.api.test.ts` | Required `requestKey`; required Draft/Completed fields; follow-up dependency; submitted note persists as `null` when follow-up is false; 2,000-character persisted text accepted and 2,001 rejected without partial create/update mutation | IMPLEMENTED / AUTOMATED |
| ACTION-03 | `server/tests/lab-04/actions-taken.api.test.ts` | Draft edit, completion, cancellation, valid Staff/Admin assignment, explicit unassignment, invalid/inactive/non-staff assignee rejection | IMPLEMENTED / AUTOMATED |
| ACTION-04 | `server/tests/lab-04/actions-taken.api.test.ts` | Completed/Cancelled PATCH rejection, unchanged terminal rows and Ticket version, and no DELETE route | IMPLEMENTED / AUTOMATED |
| ACTION-05 | `server/tests/lab-04/actions-taken.api.test.ts` | Requester-owned reads, foreign Ticket safe 404, stable ordering, pagination bounds | IMPLEMENTED / AUTOMATED |
| ACTION-06 | `server/tests/lab-04/actions-taken.api.test.ts` | Requester writes denied; Staff/Admin action capability; missing CSRF/auth handling; forced-password Staff/Admin writes denied without mutation | IMPLEMENTED / AUTOMATED |
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
| UI-STATE-01 | `client/tests/lab-04/ActionsTakenPanel.test.tsx` | GET failure/retry; `STALE_UPDATE` refresh with local draft preservation; `TICKET_NOT_ACTIVE` preservation and reactivation recovery; `ACTION_IMMUTABLE` and terminal-after-stale review-only behavior; pending create disables Saving control and permits exactly one mutation across repeated click/form-submit attempts | IMPLEMENTED / AUTOMATED |
| UI-A11Y-01 | `client/tests/lab-04/ActionTakenForm.test.tsx` | Associated labels, accessible validation messages, actual focus on first invalid field | IMPLEMENTED / AUTOMATED |

The Actions Taken UI is mounted on Requester Ticket Detail, Staff Ticket Detail, and Administrator Ticket Inspection. Component tests exercise role modes; server tests prove corresponding authorization.

## 5. Manual and Browser Evidence

| Area | Current evidence | Status |
|---|---|---|
| Lab 4 responsive layouts | `e2e/lab-04/responsive.spec.ts` covers 1440×900, 1024×768, 390×844, and 320×568 across Requester, Staff, and Administrator screens | IMPLEMENTED / AUTOMATED — 12/12 passed |
| Lab 4 accessibility and keyboard paths | `e2e/lab-04/accessibility.spec.ts` covers named controls, keyboard flows, validation focus, live status, role denial, and safe failure states | IMPLEMENTED / AUTOMATED — 7/7 passed |
| Screenshot visual review | Required-viewport Requester/Staff dashboards, Staff detail, and Administrator inspection plus `actions-taken/list-desktop.png`, `edit-draft-desktop.png`, `create-form-desktop.png`, `validation-mobile.png`, `completed-readonly-tablet.png`, and `requester-readonly-mobile.png` | MANUAL REVIEWED — dashboard/action states show no visible clipping/overlap; Zen Green presentation consistent |
| Live keyboard-focus review | Local Sign in screen reviewed with keyboard Tab focus | MANUAL REVIEWED — focus remained visible and unclipped |
| Zoom and touch review | Representative Lab 4 screens were reviewed manually at 200% browser zoom and on mobile layouts. Controls remained readable and reachable, focus remained visible, and no blocking clipping, overlap, or unusable horizontal scrolling was observed. Primary mobile controls remained practically usable by touch. | MANUAL REVIEWED |
| Optional hardening review | Dedicated contrast tooling, full screen-reader review, and hands-on native-dialog review remain optional follow-up only. | OPTIONAL / NOT REQUIRED FOR CURRENT AC COMPLETION |

## 6. Workflow Coverage — Issue 30

| ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| WORKFLOW-01 | API/integration | AC-06 | All 18 transition-matrix edges for Staff/Admin, every same-state/forbidden edge, unknown enum, and Requester denial | Only documented edges succeed; invalid edges return `409`; unknown status returns `422`; Requester returns `403` | `server/tests/lab-04/ticket-workflow.api.test.ts` | IMPLEMENTED / AUTOMATED |
| WORKFLOW-02 | API/integration | AC-07 | Resolution gate, `resolvedAt`, close/reopen/re-resolve, and cancellation of Draft Actions | Blocked requests leave state unchanged; valid evidence resolves; terminal Actions remain unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | IMPLEMENTED / AUTOMATED |
| WORKFLOW-03 | API/integration/client | AC-08 | Owned requester advisory, duplicate/disallowed/foreign rejection, Staff/Admin display | Server-derived advice persists without status change and is displayed to operational users | `server/tests/lab-04/ticket-workflow.api.test.ts`; `client/tests/lab-02/RequesterTicketDetail.test.tsx`; `client/tests/lab-03/AdminTicketInspection.test.tsx` | IMPLEMENTED / AUTOMATED |
| WORKFLOW-04 | API/client | AC-13 | Administrator operational owner/claim/priority/status behavior and Requester denial | Administrator receives approved Staff behavior; Requester writes remain forbidden | `server/tests/lab-03/staff-ticket-detail.api.test.ts`; `client/tests/lab-03/AdminTicketInspection.test.tsx` | IMPLEMENTED / AUTOMATED |
| CONFLICT-03 | API/client | AC-15 | Versioned owner/claim/priority/status and advisory writes, stale races, conflict refresh | One concurrent mutation succeeds, stale write returns `409 STALE_UPDATE`, and UI refreshes authoritative state without false success | `server/tests/lab-03/staff-ticket-detail.api.test.ts`; `server/tests/lab-04/ticket-workflow.api.test.ts`; `client/tests/lab-03/StaffTicketDetail.test.tsx` | IMPLEMENTED / AUTOMATED |

## 7. Issue 31 Dashboard Evidence

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

| Area | Evidence | Status |
|---|---|---|
| Requester and Staff/Admin dashboards, drill-downs, predicates | Server dashboard tests plus `client/tests/lab-04/Dashboards.test.tsx` and list/queue routing tests | IMPLEMENTED / AUTOMATED for aggregates, status/priority buckets, ownership scoping, deterministic boundaries, drill-down parity, query guards, dashboard component states, and hash drill-down routing |
| Playwright Action/workflow/dashboard flows | `e2e/lab-04/authenticated-flows.spec.ts` | IMPLEMENTED / AUTOMATED — 5/5 passed |
| Browser responsive/accessibility suites | `e2e/lab-04/responsive.spec.ts`, `e2e/lab-04/accessibility.spec.ts` | IMPLEMENTED / AUTOMATED — 12/12 responsive and 7/7 accessibility passed |
| Performance smoke | `server/tests/lab-04/performance-smoke.test.ts` | IMPLEMENTED / AUTOMATED — exact dashboard counts, five-item previews, bounded pagination, 12-query small/large comparison, and safe health payload |
| Release evidence and peer approval | Screenshot/manual checklist, reviewer record, and final submission review | PARTIAL — factual evidence recorded; final peer approval remains pending |

Existing Lab 1–3 regression suites continue to run in the verified server/client results above. Future work must retain authorization, ownership, file, comment/note, account-safety, and Ticket regressions.

## 8. Implemented Automated Coverage — Issue 32

| Evidence ID | Test file | Coverage proved by current assertions | Status |
|---|---|---|---|
| REG-AC-01 | `server/tests/lab-04/actions-taken.api.test.ts` | Action list order is `actionDateTime ASC, id ASC`; creating an Action does not change the Ticket Owner / assignment | IMPLEMENTED / AUTOMATED |
| REG-AC-02 | `server/tests/lab-04/actions-taken.api.test.ts` | Every persisted Action text field accepts 2,000 characters and rejects 2,001; rejected creates/updates preserve Action and Ticket state and versions | IMPLEMENTED / AUTOMATED |
| REG-AC-05 | `server/tests/lab-04/actions-taken.api.test.ts` | Cancelled Action PATCH is rejected; persisted terminal Action and parent Ticket version remain unchanged | IMPLEMENTED / AUTOMATED |
| REG-AC-14 | `server/tests/lab-04/actions-taken.api.test.ts` | Forced-password IT Staff and Administrators cannot create or patch Actions; no Action or Ticket-version mutation occurs | IMPLEMENTED / AUTOMATED |
| REG-AC-20 | `client/tests/lab-04/ActionsTakenPanel.test.tsx` | Deferred create shows disabled `Saving…`; repeated click and programmatic form submit produce exactly one mutation; normal success completes after resolution | IMPLEMENTED / AUTOMATED |

## 9. Implemented Browser and Performance Coverage — Issue 33

| Evidence ID | Test file | Coverage proved by current assertions | Status |
|---|---|---|---|
| E2E-L4-01–05 | `e2e/lab-04/authenticated-flows.spec.ts` | Requester, Staff, and Administrator end-to-end dashboard/detail/Action/workflow flows plus protected-route recovery | IMPLEMENTED / AUTOMATED — 5/5 passed |
| RESP-L4-01–12 | `e2e/lab-04/responsive.spec.ts` | Required 1440×900, 1024×768, 390×844, and 320×568 layouts; no page overflow; reachable dashboards, Actions, workflow controls, and mobile navigation | IMPLEMENTED / AUTOMATED — 12/12 passed |
| A11Y-L4-01–07 | `e2e/lab-04/accessibility.spec.ts` | Keyboard navigation, labels, validation focus, live feedback, role denial, forced-password and retry states | IMPLEMENTED / AUTOMATED — 7/7 passed |
| SCREEN-L4-01–02 | `e2e/lab-04/screenshot-evidence.spec.ts` | Representative Actions Taken list, Draft edit, create form, mobile validation placement, terminal read-only presentation, and Requester read-only controls | IMPLEMENTED / AUTOMATED — 2/2 passed |
| PERF-01 | `server/tests/lab-04/performance-smoke.test.ts` | Dedicated 30-Ticket/25-Action fixture; exact dashboard aggregates; five-item preview cap; Requester/Staff/Action pagination bounds; fixed 12-query dashboard path for small and larger fixture sizes; safe health response | IMPLEMENTED / AUTOMATED — 3/3 passed in three consecutive focused runs |

## 10. Acceptance-Criteria Traceability

| AC | Current evidence | Status |
|---|---|---|
| AC-01 | ACTION-01, ACTION-05, REG-AC-01, UI-ACTION-01 | IMPLEMENTED / AUTOMATED |
| AC-02 | ACTION-02, REG-AC-02, UI-ACTION-02 | IMPLEMENTED / AUTOMATED |
| AC-03 | ACTION-03, ACTION-04, UI-ACTION-03 | IMPLEMENTED / AUTOMATED |
| AC-04 | ACTION-05, ACTION-06, UI-ACTION-01 | IMPLEMENTED / AUTOMATED |
| AC-05 | ACTION-04, ACTION-07, REG-AC-05, UI-STATE-01 | IMPLEMENTED / AUTOMATED |
| AC-06 | WORKFLOW-01 | IMPLEMENTED / AUTOMATED |
| AC-07 | WORKFLOW-02 | IMPLEMENTED / AUTOMATED |
| AC-08 | WORKFLOW-03 | IMPLEMENTED / AUTOMATED |
| AC-09–AC-12 | DASH-01–DASH-04; DASH-UI-01–DASH-UI-03; E2E-L4-01–05 | IMPLEMENTED / AUTOMATED for backend/dashboard predicates, routing, and browser workflows |
| AC-13 | WORKFLOW-04, ACTION-06 and inherited authorization regressions | IMPLEMENTED / AUTOMATED |
| AC-14 | Inherited auth/session regressions, REG-AC-14 | IMPLEMENTED / AUTOMATED |
| AC-15 | ACTION-07, CONFLICT-01, CONFLICT-03, UI-ACTION-03, UI-STATE-01 | IMPLEMENTED / AUTOMATED — idempotency, stale-update handling, conflict recovery, and authoritative refresh are covered. |
| AC-16 | MIG-01 | IMPLEMENTED / AUTOMATED for current additive migration evidence |
| AC-17 | Inherited server/client regressions | IMPLEMENTED / AUTOMATED regression coverage |
| AC-18 | RESP-L4-01–12; screenshot visual review; manual zoom/touch review | IMPLEMENTED / VERIFIED — required viewports, no blocking overflow/clipping/overlap, reachable controls, Zen Green consistency, 200% zoom usability, and representative touch usability are covered. |
| AC-19 | UI-A11Y-01; A11Y-L4-01–07; live focus review; manual zoom/touch review | IMPLEMENTED / VERIFIED — keyboard operation, visible focus, labeling, error association, status text, accessible confirmation behavior, 200% zoom usability, and representative touch usability are covered. Dedicated contrast tooling and full screen-reader review remain optional hardening. |
| AC-20 | UI-STATE-01, REG-AC-20 | IMPLEMENTED / AUTOMATED — duplicate-submit prevention, recoverable state handling, draft preservation, and authoritative refresh are covered. |
| AC-21 | SEED-01 | IMPLEMENTED / AUTOMATED |
| AC-22 | PERF-01 | IMPLEMENTED / AUTOMATED |
| AC-23 | Current verification record, Issue 33 evidence, screenshots, README, reviewer and AI-use records | complete |

## 11. Maintenance Rules

Record future results with command, environment, and actual counts. Never mark a test as passed merely because a plan row exists. Database-backed tests must use a test-only database, own uniquely named fixtures, and clean in foreign-key-safe order. Do not use a suite-local disconnect on the shared application Prisma singleton.
