# Lab 4 Test DD / TDD Plan

**Status:** Planning only. All new tests below are **Planned / Not Implemented**. Existing suites are regression candidates **Not rerun in this task**, regardless of historical Lab 3 passing records. No implementation, test files, migration or seed are changed by this contract task.

[specification.md](specification.md) defines Lab 4 FR/BR/AC IDs, matrix and exact metrics; [api-spec.md](api-spec.md) defines routes/payloads; [ui-spec.md](ui-spec.md) defines state and layout expectations. Each table row is a planned test group; use its ID in describe/it or Playwright test names and parameterize the specified cases. Future implementation must record actual results, file paths and evidence; table presence is not evidence of a passing test.

## 1. Existing Framework and Execution Plan

Server uses Vitest (node), Supertest authenticated agents and real Prisma/PostgreSQL fixtures under `server/tests/lab-02/` and `server/tests/lab-03/`. Reuse `server/tests/lab-02/auth-helper.ts`, which establishes session/CSRF. Client uses Vitest jsdom, React Testing Library/user-event and `client/tests/setup.ts`; test discovery includes `tests/**/*.test.{ts,tsx,...}`. E2E uses root `playwright.config.ts`, Chromium, existing Lab 3 global setup/accounts and frontend web server; backend/database must be prepared separately. Extend fixture provisioning later for Lab 4 without committing credentials.

Proposed files below match these structures and the handout's minimum filenames. Unit helpers do not replace direct API authorization tests. PostgreSQL tests must prove real version conflicts and atomic writes; mocks cannot prove concurrency or migration safety.

TDD order: validation/lifecycle/transition helpers → migration/seed integrity → Action API/auth/version conflicts → Ticket gate → dashboard/filter predicates → UI modes/states → E2E, responsive/accessibility and complete regression. Write failing tests for each behavior before implementing it. Use an isolated disposable database; do not delete or reset developer data. Tests own uniquely named fixtures and clean up their own records in foreign-key-safe order.

Later verification commands (not run by this documentation task):

```bash
# from server/
npm test
npx tsc --noEmit
# from client/
npm test
npx tsc --noEmit
npm run build
# from repository root, after backend/database preparation
npx playwright test e2e/lab-04
npx playwright test
```

## 2. Required Deterministic Fixtures

Freeze backend clock at a known instant; window is inclusive `[asOf−7×24h,asOf]`. Include records exactly at start/end and 1ms outside each, dates crossing Asia/Bangkok midnight, equal timestamps with different IDs, updated terminal Tickets and recent/outside-window formal/legacy resolutions. Assert display zone separately from UTC predicates.

Provide two Requesters with distinct Tickets plus an empty Requester; Staff A/B, Administrator, inactive Staff/Admin, forced-password user and inactive account. Include all eight Ticket statuses and LOW/MEDIUM/HIGH IT Priority, null/other/self Owners, different creator/assignee/performer, zero/one/many Actions, all three Action states and follow-up variants. Personal Action fixtures must include one performed by caller on another Owner's Ticket and one assigned to caller but performed by someone else. Include more than five matches and more than one list page so previews cannot accidentally define counts.

For Draft-update tests compare server-controlled identity/time fields before and after edits. For concurrent tests coordinate two real requests and assert one stale `409`, version increments and no partial records or altered Ticket timestamp/version.

## 3. Unit Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | FR-02–04 / AC-02 | Required/type validation, optional nulls, project 2,000/2,001 character boundaries and follow-up rules | Valid boundaries accepted; invalid fields rejected without truncation | `server/tests/lab-04/actions-taken.unit.test.ts` | Planned / Not Implemented |
| UNIT-02 | Unit | FR-03–04 / AC-02, AC-03, AC-05 | Merged Draft input; Follow-up Note dependency; Draft lifecycle and terminal immutability | Conditional fields, Draft edits and terminal rejection match BR-05–BR-10 | `server/tests/lab-04/actions-taken.unit.test.ts` | Planned / Not Implemented |
| UNIT-03 | Unit | FR-05 / AC-06 | Every matrix edge plus unknown enums | Only documented inherited/design-decision edges succeed; same-state/outside edges invalid | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Planned / Not Implemented |
| UNIT-04 | Unit | FR-06 / AC-07 | Resolution gate with zero, only Cancelled, Draft, and qualifying Completed work | Gate requires at least one Completed Action with nonblank Result and no Draft; Cancelled Actions do not satisfy or block it | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Planned / Not Implemented |
| UNIT-05 | Unit | FR-07–10 / AC-09–AC-11 | Shared query builders for ACTIVE, personal predicates, time windows and legacy fallback | Exact section 9 predicates; no owner/performer confusion | `server/tests/lab-04/dashboard.unit.test.ts` | Planned / Not Implemented |
| UNIT-06 | Unit | FR-09 / AC-12 | Dashboard filter parsing/serialization and local destination allowlist | Correct existing key names/date values/page reset; unsafe/unknown paths rejected | `client/tests/lab-04/dashboard-links.test.ts` | Planned / Not Implemented |

Dashboard helper tests apply if pure query-building helpers are introduced; integration query results remain mandatory even if no helper exists. Do not build artificial helpers solely for tests.

## 4. API / Integration and Backend Authorization

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| ACTION-01 | API | FR-01–02 / AC-01 | Draft and Completed creation by Staff/Admin with required requestKey, non-Owner actor, null/eligible assignee | 201, correct parent/creator/performer/date; Ticket Owner unchanged; version increment | `server/tests/lab-04/actions-taken.api.test.ts` | Planned / Not Implemented |
| ACTION-02 | API | FR-02–04 / AC-02 | Missing requestKey, missing/blank/wrong-type Description/Result, project text bounds, nonboolean flag, conditional notes, extra/spoofed fields | 422 field errors; no new row/parent change; false flag nulls note | `server/tests/lab-04/actions-taken.api.test.ts` | Planned / Not Implemented |
| ACTION-03 | API | FR-03 / AC-03 | Edit Draft, assign to active Staff/Admin or null; invalid/inactive/missing/Requester assignee including retained assignee on completion | Eligible assignment/update200; ineligible422 with no mutation | `server/tests/lab-04/actions-taken.api.test.ts` | Planned / Not Implemented |
| ACTION-04 | API | FR-03 / AC-03, AC-05 | Complete/cancel Draft, then attempt terminal Description/Result/Follow-Up/assignee/performer/time/status edits or delete | Draft lifecycle succeeds; every terminal mutation is rejected409; no delete endpoint; additional work requires a new Action | `server/tests/lab-04/actions-taken.api.test.ts` | Planned / Not Implemented |
| ACTION-05 | API | FR-01, FR-11 / AC-01, AC-04 | Owned read, all Action states, pagination/order ties, unowned/missing/mismatched parent paths | 200 all business fields/reachable pages; generic404 for unowned/missing; no notes/audit leak | `server/tests/lab-04/actions-taken.api.test.ts` | Planned / Not Implemented |
| ACTION-06 | Authorization | FR-11 / AC-04, AC-13, AC-14 | Requester POST/PATCH; Staff/Admin reads/writes; missing/expired/deactivated auth; forced password; missing/wrong CSRF | Role403, auth401, password/CSRF403; authorized behavior works directly through backend | `server/tests/lab-04/authorization.api.test.ts` | Planned / Not Implemented |
| ACTION-07 | API | FR-03, FR-12 / AC-05, AC-15 | Missing or mismatched Ticket/Action IDs, pagination bounds, terminal Ticket write rejection, stale Action/Ticket versions | Correct 404/422/409 responses; no partial mutation and no lost draft | `server/tests/lab-04/actions-taken.api.test.ts` | Planned / Not Implemented |
| CONFLICT-01 | Integration | FR-12 / AC-15 | Stale Ticket and Action versions, absent tokens, two concurrent edits | Missing422; stale409; one winning edit/version; no partial writes | `server/tests/lab-04/concurrency.integration.test.ts` | Planned / Not Implemented |
| CONFLICT-02 | Integration | FR-12 / AC-15 | Required requestKey retry identity | First create with a Ticket/creator/requestKey returns 201; a later request with the same combination returns the existing Action with 200 and no second row; a deliberate new Action uses a new requestKey | `server/tests/lab-04/concurrency.integration.test.ts` | Planned / Not Implemented |
| CONFLICT-03 | Integration | FR-05–06, FR-12 / AC-07, AC-15 | Resolve competing Action/status writes with expected versions | One current write succeeds and stale request409; no resolved Ticket with a newly committed blocking Action | `server/tests/lab-04/concurrency.integration.test.ts` | Planned / Not Implemented |
| CONFLICT-04 | Integration | FR-11–12 / AC-13, AC-15, AC-17 | Assignment vs account deactivation/role change; parallel claims; concurrent last-admin safety | No ineligible final Owner/assignee; no overwritten claim or zero active Administrators | `server/tests/lab-04/concurrency.integration.test.ts` | Planned / Not Implemented |
| WORKFLOW-01 | API | FR-05 / AC-06, AC-13 | Every documented edge by Staff and Admin; all other pairs/unknown enums; Requester direct call | Matrix200 with version; forbidden edge409; enum422; Requester403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not Implemented |
| WORKFLOW-02 | API | FR-06 / AC-07 | Zero/Cancelled/Draft gate failures, successful qualifying resolve/time, close; reopening and re-resolving | RESOLUTION_BLOCKED409/no mutation until at least one Completed Action with nonblank Result exists and no Draft Actions remain; qualifying resolve200 backend time; legacy closure remains allowed | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not Implemented |
| WORKFLOW-03 | API | FR-05 / AC-08 | Owned indication eligible states, duplicate, unowned, role/time spoof, stale version | Advisory only; server time/user; 409 duplicate/state/stale, 404 unowned,422 spoof | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not Implemented |
| WORKFLOW-04 | API | FR-03, FR-05 / AC-03, AC-06, AC-15 | Ticket cancellation with multiple Draft/terminal Actions, then reopen | Drafts cancel atomically with Result; terminal work retained; no Action resurrection | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not Implemented |
| DASH-01 | API | FR-07, FR-10 / AC-09, AC-11 | Requester aggregate/list ownership, >5 matches, empty user, injected requesterId | Exact full-set counts, max5 previews; no cross-owner leak; unknown query400 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned / Not Implemented |
| DASH-02 | API | FR-08, FR-10 / AC-10, AC-11 | Staff and Admin all status/priority buckets, ACTIVE ownership, personal completed Actions | Exact database-derived counts, all zero buckets retained, max5 lists; caller-specific performer/owner | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned / Not Implemented |
| DASH-03 | API | FR-07–10 / AC-09–AC-11, AC-16 | Inclusive time bounds, same-time ordering, formal resolvedAt vs updatedAt, null legacy fallback | Seven-day UTC rules; source labels; current terminal eligibility; shared asOf and predicates | `server/tests/lab-04/requester-dashboard.api.test.ts`, `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned / Not Implemented |
| DASH-04 | API | FR-09 / AC-12 | Extended My Tickets/Queue queries and current-user Action pages; invalid date pairs/extra keys/combination | Matching full count and predicate; preserved envelopes/defaults; requester400/staff422 invalid; no identity substitution | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | Planned / Not Implemented |
| DASH-05 | Authorization | FR-11 / AC-13, AC-14 | Direct cross-role dashboard and User Management calls, forced-password reads, lost sessions | Requester operational403; Staff users403; Admin operational allowed; auth/password enforcement | `server/tests/lab-04/authorization.api.test.ts` | Planned / Not Implemented |
| API-FAIL-01 | API | FR-16 / AC-14, AC-20 | Malformed JSON, database failure, safe404/409/422/500 envelope, failed transaction midway | Correct statuses/fields; no secrets/paths/SQL/partial writes; malformed JSON400 | `server/tests/lab-04/error-handling.api.test.ts` | Planned / Not Implemented |

## 5. UI Component Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-ACTION-01 | UI | FR-01–02 / AC-01, AC-04 | List/view, every field, stable order/page controls, Requester read-only | All shared items reachable, correct performer labels, no write controls/Internal Notes | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned / Not Implemented |
| UI-ACTION-02 | UI | FR-02–04 / AC-02, AC-03 | Create/edit form, project character counter, follow-up toggle and local draft restoration, assignee errors | Inline validation; false saves null; no client performer/date input | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned / Not Implemented |
| UI-ACTION-03 | UI | FR-03, FR-12 / AC-05, AC-15, AC-20 | Terminal immutability, duplicate-submit prevention, required requestKey retry, stale conflict, unknown network outcome recovery and Draft preservation | One pending submit; same-key retry is safe; terminal edit controls absent; preserved Draft; authoritative refresh | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned / Not Implemented |
| UI-DASH-01 | UI | FR-07, FR-10 / AC-09, AC-11 | Requester cards/attention/recent/resolved rows and legacy estimate label | API counts used even when preview length differs; proper lists/date labels | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned / Not Implemented |
| UI-DASH-02 | UI | FR-08, FR-10 / AC-10, AC-11, AC-13 | Staff/Admin metrics/buckets/urgent/personal list/navigation | Exact API data; Admin staff navigation plus users; no account-count cards | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned / Not Implemented |
| UI-DASH-03 | UI | FR-09 / AC-12 | All cards/buckets/row/drill-down links, date windows, My Tickets/Queue filter reset/clear | Correct known hash destinations and backend params, page1; Action row focuses relevant item | `client/tests/lab-04/dashboard-drilldown.test.tsx` | Planned / Not Implemented |
| UI-WORKFLOW-01 | UI | FR-05–06 / AC-06–AC-08, AC-13 | Allowed status controls, gate reasons, confirmations and advisory indication | Only matrix options; resolve guard explains missing work; cancellation warning; backend result refresh | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned / Not Implemented |
| UI-STATE-01 | UI | FR-16 / AC-20 | Entire UI state matrix including retained stale dashboard/401 clearing/422/409/500 | Distinct empty/failure; safe feedback, draft preservation, retries and success announcements | `client/tests/lab-04/ui-states.test.tsx` | Planned / Not Implemented |
| UI-A11Y-01 | UI | FR-15 / AC-19 | Labels/aria errors, inert script-like text, keyboard form/checkbox/link operation | Semantic accessible names, associated errors; no executed markup | `client/tests/lab-04/ActionsTaken.test.tsx`, `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned / Not Implemented |

## 6. Migration / Seed / Regression

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Integration | FR-17 / AC-16 | Isolated Lab3-shaped fixture migrated with real chain | Every prior ID/FK/body/status/priority/time and attachment file remains; version1, resolvedAt null, no synthetic Actions | `server/tests/lab-04/migration-regression.integration.test.ts` | Planned / Not Implemented |
| MIG-02 | Integration | FR-06, FR-10, FR-17 / AC-07, AC-11, AC-16 | Zero-Action legacy active/Resolved/Closed data and dashboard fallback | Active new resolution gate applies; legacy closure allowed; honest fallback source and counts | `server/tests/lab-04/migration-regression.integration.test.ts` | Planned / Not Implemented |
| MIG-03 | Integration | FR-17 / AC-16 | Failed transactional migration and backup recovery rehearsal incl. files/new Action export | No partial schema, validated restored relationships/files; no post-backup work silently dropped | `server/tests/lab-04/migration-regression.integration.test.ts` | Planned / Not Implemented |
| SEED-01 | Integration | FR-17 / AC-21 | Two seed runs; user edits/password retained; all statuses/priorities/Action counts/empty cases | No duplicates/resets; non-zero and zero dashboards demonstrable; valid initial credential policy | `server/tests/lab-04/seed.integration.test.ts` | Planned / Not Implemented |
| REG-01 | Regression | FR-11, FR-13 / AC-14, AC-17 | Login/logout/first-password change/session expiry/inactive/reset, all roles | Existing credential/session rules work; no forced-password bypass | `server/tests/lab-03/auth.api.test.ts`, `client/tests/lab-03/App.logout.test.tsx` | Existing / Not rerun |
| REG-02 | Regression | FR-13 / AC-17 | Create/My Tickets/detail/search/filter/sort/page, authenticated ownership/Ticket number/IT Priority copy | Labs1–3 requester behavior preserved; extended statuses do not break NEW | `server/tests/lab-02/create-ticket.api.test.ts`, `server/tests/lab-02/my-tickets.api.test.ts`, `server/tests/lab-02/ticket-detail.api.test.ts`, `client/tests/lab-02/` | Existing / Not rerun |
| REG-03 | Regression | FR-11, FR-13 / AC-17 | Attachment upload/download/preview/soft remove, five-file/5MB/type limits and cross-owner rejection | Earlier file/metadata/ownership behavior preserved, no invented staff download permission | `server/tests/lab-02/attachments.api.test.ts`, `client/tests/lab-02/AttachmentSection.test.tsx` | Existing / Not rerun |
| REG-04 | Regression | FR-13 / AC-13, AC-17 | Queue/search/sort/page/claim/owner/priority; communications privacy/append-only and Admin expansion | Staff baseline works; Admin gains documented operations; Requester/Internal Notes denial unchanged | `server/tests/lab-03/staff-queue.api.test.ts`, `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `server/tests/lab-03/comments-notes.api.test.ts`, `client/tests/lab-03/` | Existing / Requires planned updates |
| REG-05 | Regression | FR-11, FR-13 / AC-17 | User create/edit/search/one role/email uniqueness/password reset/self/last-admin/Owner safeguards | Administrative safety retained; Staff/Requester management denied; assignment history survives deactivation | `server/tests/lab-03/users-admin.api.test.ts`, `client/tests/lab-03/UserManagement.test.tsx` | Existing / Not rerun |
| REG-06 | Regression | FR-13 / AC-17 | Complete legacy unit/API/client/E2E suite against new schema/clients | Full rerun with deliberate permission/version/gate expectation changes documented | `server/tests/lab-01/`, `server/tests/lab-02/`, `server/tests/lab-03/`, `client/tests/`, `e2e/lab-02/`, `e2e/lab-03/` | Existing / Requires planned updates |

Reuse the isolated database approach from `server/tests/helpers/migration-test-database.ts`; note its PostgreSQL binaries are currently macOS-specific. Future tests must validate tool availability or make that dependency portable, not mistake a missing binary for a passing/skipped migration test. Fixtures must exist before migrations, unlike testing only final seeded data. Existing deactivation/last-admin check-then-write behavior needs direct simultaneous-call tests under CONFLICT-04.

## 7. Responsive / UI Style / Accessibility / Performance

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | FR-14 / AC-18 | Dashboards/Actions/Queue/detail/User Management at1440×900,1024×768,390×844,320×568 incl. long text and dialogs | No document overflow, overlap, clipped controls; mobile card lists, usable menu and pagination | `e2e/lab-04/responsive.spec.ts` | Planned / Not Implemented |
| STYLE-01 | UI style | FR-14 / AC-18, AC-23 | Computed Zen Green tokens/buttons/badges/forms and screenshot/manual comparison | One visual language; privacy/priority/status text clear; screenshot evidence reviewed | `e2e/lab-04/responsive.spec.ts` + manual visual checklist | Planned / Not Implemented |
| A11Y-01 | Accessibility | FR-15 / AC-19 | Keyboard-only dashboards/create/edit/complete/cancel/resolve, error focus, modal focus/Escape/restore,200% zoom | All actions reachable/named; visible focus, logical reading/tab order and announced feedback | `e2e/lab-04/accessibility.spec.ts` + manual contrast/zoom review | Planned / Not Implemented |
| PERF-01 | Performance smoke | FR-10, FR-18 / AC-22 | Dashboard/Action/list reads over1,000 Tickets/3,000 Actions, fixed previews and page sizes | Correct counts; max5 per preview; paged rows bounded; no N+1 growth | `server/tests/lab-04/performance-smoke.integration.test.ts` | Planned / Not Implemented |
| HEALTH-01 | API | FR-18 / AC-22 | Existing health after migration/backend fault isolation | 200 `{status:"ok",service:"TokTickIT API"}`, no secrets; does not claim database health | `server/tests/lab-01/health.test.ts` | Existing / Not rerun |
| RELEASE-01 | Manual release | FR-18 / AC-23 | Contract traceability, current test logs, reviewer evidence/README, final integrated main/status | All DoD evidence real and current; no placeholders or credential/generated clutter | Not automated; final release evidence/checklist | Planned / Not Implemented |

Performance-smoke design budget: instrument Prisma queries and compare10-Ticket vs1,000-Ticket fixtures; dashboard/list query count must remain constant in row count (at most20 database statements per request, including auth and transaction control). Record local elapsed timings; median of five warmed dashboard requests should be below1second on the stated development machine, a smoke target rather than production SLA. Investigate an exceeded target with query plans/indexes before adjusting a documented budget. Assert dashboard payload below100KB for fixture text capped at150-character Ticket summaries/normal Action descriptions; independently assert the universal five-row caps, even with maximum valid Action text. No benchmark platform/infrastructure is introduced.

## 8. End-to-End Flows

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-ACTION-01 | E2E | FR-01–04 / AC-01–AC-05 | Staff creates a Draft with a requestKey, assigns a different active assignee, and an authorized user completes the Action; same-key retry and terminal edit attempts; Requester reads | Same-key retry returns one existing Action; terminal edit is rejected; correct shared content and attribution; no Owner change | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned / Not Implemented |
| E2E-WORKFLOW-01 | E2E | FR-05–06, FR-12 / AC-06–AC-08, AC-15 | New→Open→In Progress; blocked resolve; requester advice; qualifying Completed Action; resolve/close/reopen; second browser stale save; cancellation branch | Gate/backend statuses correct, Follow-Up remains informational, advice advisory, terminal Actions unchanged, conflict safe, cancellation atomic | `e2e/lab-04/ticket-resolution.spec.ts` | Planned / Not Implemented |
| E2E-DASH-01 | E2E | FR-07–10 / AC-09–AC-12 | Requester attention/recent/resolved cards, rows, My Tickets filters and empty account | Backend-scope counts/predicates agree; no other Requester's detail | `e2e/lab-04/dashboards.spec.ts` | Planned / Not Implemented |
| E2E-DASH-02 | E2E | FR-08–09, FR-11 / AC-10–AC-13 | Staff/Admin Dashboard buckets/urgent/current-performer drill-down across pages | Correct Query/Detail links, caller scope; Admin retains User Management | `e2e/lab-04/dashboards.spec.ts` | Planned / Not Implemented |
| E2E-REG-01 | E2E | FR-11, FR-13 / AC-14, AC-17 | Initial-password change then Ticket create/attachments/comments; staff claim/note; admin user reset/safety; logout | Representative inherited behavior works with direct backend rejection checks | `e2e/lab-04/regression.spec.ts` | Planned / Not Implemented |
| E2E-FAIL-01 | E2E | FR-16 / AC-15, AC-20 | Delayed response/double-click,500/network lost commit, stale edit/refresh and safe retry | No duplicate Action or draft loss; no false zeros/success; protected data cleared on401 | `e2e/lab-04/actions-taken-flow.spec.ts`, `e2e/lab-04/dashboards.spec.ts` | Planned / Not Implemented |

E2E accounts use untracked environment credentials; create isolated repeatable fixtures rather than relying on a random existing Ticket ID or previously mutated seed state. Test callbacks verify browser behavior plus backend/database invariants for critical writes. Manual screenshot evidence must be reviewed; a screenshot's existence is not proof of acceptable layout.

## 9. Acceptance Criteria Traceability

Every criterion has at least one concrete planned test; inherited candidates supplement them.

| AC | Planned primary coverage |
|---|---|
| AC-01 | ACTION-01, ACTION-05, UI-ACTION-01, E2E-ACTION-01 |
| AC-02 | UNIT-01, UNIT-02, ACTION-02, UI-ACTION-02 |
| AC-03 | ACTION-03, ACTION-04, WORKFLOW-04, E2E-ACTION-01 |
| AC-04 | ACTION-05, ACTION-06, UI-ACTION-01, E2E-ACTION-01 |
| AC-05 | ACTION-04, ACTION-07, UI-ACTION-03 |
| AC-06 | UNIT-03, WORKFLOW-01, UI-WORKFLOW-01, E2E-WORKFLOW-01 |
| AC-07 | UNIT-04, WORKFLOW-02, CONFLICT-03, E2E-WORKFLOW-01 |
| AC-08 | WORKFLOW-03, UI-WORKFLOW-01, E2E-WORKFLOW-01 |
| AC-09 | DASH-01, DASH-03, UI-DASH-01, E2E-DASH-01 |
| AC-10 | DASH-02, DASH-03, UI-DASH-02, E2E-DASH-02 |
| AC-11 | UNIT-05, DASH-01–DASH-03, UI-DASH-01–UI-DASH-02 |
| AC-12 | UNIT-06, DASH-04, UI-DASH-03, E2E-DASH-01–E2E-DASH-02 |
| AC-13 | ACTION-06, WORKFLOW-01, DASH-05, E2E-DASH-02 |
| AC-14 | ACTION-06, DASH-05, API-FAIL-01, E2E-REG-01 |
| AC-15 | CONFLICT-01–CONFLICT-04, UI-ACTION-03, E2E-WORKFLOW-01, E2E-FAIL-01 |
| AC-16 | MIG-01–MIG-03, DASH-03 |
| AC-17 | E2E-REG-01, CONFLICT-04; REG-01–REG-06 reruns |
| AC-18 | RESP-01, STYLE-01 |
| AC-19 | UI-A11Y-01, A11Y-01 |
| AC-20 | API-FAIL-01, UI-STATE-01, E2E-FAIL-01 |
| AC-21 | SEED-01 |
| AC-22 | PERF-01; HEALTH-01 rerun |
| AC-23 | RELEASE-01, STYLE-01 |

## 10. Final Evidence and Intentional Regression Changes

Record successful/failed actual runs with date, commit/branch, fixture environment and command; attach complete test output from final main at release. Update Final only after implementation/execution. Screenshot roots: `artifacts/lab-04/screenshots/staff-dashboard/`, `requester-dashboard/`, `actions-taken/`; add retained-screen evidence where needed. Final tests must not treat known fixture/setup failures as pass.

Lab 3 currently tests Administrator Queue/owner/status denial, communication read-only behavior and resolution without Actions. Those assertions conflict with explicit Lab 4 expansion/gate and must change during feature implementation, with this contract as rationale. Existing mutation tests also need required version tokens, and qualified resolution fixtures. Preserve Requester cross-ownership denial, private-note restrictions, IT Staff user-management denial, file ownership/limits, comment/note append-only rules and all account safety assertions. Do not delete security tests merely to get a green suite.

This task completes the test plan, not product-release verification; code/tests/migrations/reviewer/README remain unmodified here.
