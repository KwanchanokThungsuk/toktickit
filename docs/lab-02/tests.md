# Lab 2 Test Plan and Results

**Project:** TokTickIT IT Service Desk
**Sprint:** Individual Sprint 2 — Requester Ticketing MVP
**Status:** Planned before implementation (Test DD). Result column is filled in as each test is implemented and run.
**Related documents:** `specification.md`, `api-spec.md`, `ui-spec.md`

---

## 1. Test Strategy

This plan is written from the Acceptance Criteria in `specification.md`, before implementation, so that "done" is decided by evidence rather than by the coding agent's claim.

**Levels**

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | Pure logic with no I/O — ticket-number generation, validators, query parsing, safe filenames |
| API / integration | Supertest + Vitest | HTTP contract against a real Express app and a test PostgreSQL database |
| UI component | Vitest + React Testing Library | Screen behavior with the network layer mocked |
| UI style | Vitest + React Testing Library | Required classes, field states, asterisks, message placement, button attributes |
| Responsive / visual | Playwright | Layout at 1280, 768, and 375 px plus screenshot capture |
| E2E | Playwright | Full flows across real frontend, backend, and database |

**Approach (TDD).** For each Issue, the planned tests are written first and confirmed to fail for the expected reason, then the smallest correct implementation is added, then refactoring proceeds while tests stay green.

**Test data.** API tests run against a dedicated test database, reset and reseeded before each suite. The seed is idempotent (BR seed rules), so repeated runs never create duplicates. Fixtures use at least two active Requesters so ownership can be tested from both sides, plus one inactive Requester.

**What is deliberately not tested.** Authentication, IT Staff workflow, comments, status transitions, and administration — all excluded in Lab 2 §3.2. Tests asserting their *absence* are included where a regression would be dangerous (UI-19).

---

## 2. Planned Tests

### 2.1 Unit

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-04 | Ticket Number generator output format | Matches `TKT-<YYYY>-<NNNNNN>` with the current year | `server/tests/lab-02/ticket-number.unit.test.ts` | Pending |
| UNIT-02 | Unit | BR-04, BR-05 | Sequence increments and restarts per year | 000001 for a new year; increments thereafter; no duplicates under repeated allocation | `server/tests/lab-02/ticket-number.unit.test.ts` | Pending |
| UNIT-03 | Unit | AC-10, BR-15, BR-16, BR-19 | Summary and Description validators at boundaries | 9 chars fails, 10 passes, 150 passes, 151 fails; whitespace-only treated as missing; values trimmed | `server/tests/lab-02/validation.unit.test.ts` | Pending |
| UNIT-04 | Unit | AC-15, BR-23 | Attachment type validator | JPG, PNG, WEBP, PDF accepted; TXT rejected; extension/content-type mismatch rejected | `server/tests/lab-02/attachment-rules.unit.test.ts` | Pending |
| UNIT-05 | Unit | AC-14, BR-24 | Attachment size validator at the 5 MB boundary | Exactly 5 MB accepted; 5 MB + 1 byte rejected | `server/tests/lab-02/attachment-rules.unit.test.ts` | Pending |
| UNIT-06 | Unit | AC-29, BR-35, BR-36 | Query-parameter parser | `pageSize=999`, `page=0`, `sortBy=foo` all raise a validation error rather than defaulting | `server/tests/lab-02/query-params.unit.test.ts` | Pending |
| UNIT-07 | Unit | BR-30 | Safe stored-filename generator | Returns UUID plus validated extension; path separators and traversal sequences never survive | `server/tests/lab-02/attachment-rules.unit.test.ts` | Pending |

### 2.2 API

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01, AC-12 | Create valid ticket | 201; one Ticket saved; Ticket Number returned; stored `requesterId` matches the header | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-02 | API | AC-09 | Create with missing Summary | 422 `VALIDATION_ERROR` with `fields.summary`; no Ticket saved | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | AC-10 | Summary length boundary via HTTP | 9 chars → 422; 10 chars → 201 | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-04 | API | BR-17 | Unknown `categoryId` | 422; no Ticket saved; the value is not silently ignored | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-05 | API | BR-11 | Inactive Requester in the context header | 400 `REQUESTER_INVALID`; no Ticket saved | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-06 | API | AC-04, BR-09 | Active-Requester list | 200; the inactive seeded Requester is absent | `server/tests/lab-02/reference-data.api.test.ts` | Pending |
| API-07 | API | AC-08 | Categories endpoint | 200; the four seeded categories in name order | `server/tests/lab-02/reference-data.api.test.ts` | Pending |
| API-08 | API | AC-08 | Related Systems endpoint | 200; at least six active systems | `server/tests/lab-02/reference-data.api.test.ts` | Pending |
| API-09 | API | AC-22, FR-21 | Owned ticket list | 200; only the header Requester's tickets; `meta` carries page, pageSize, totalItems, totalPages | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-10 | API | AC-23, BR-13 | Cross-requester list isolation | Requester B's response contains none of Requester A's ticket numbers | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-11 | API | AC-24, BR-33 | Search by summary substring and by ticket number | Only matching owned tickets returned; case-insensitive | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-12 | API | AC-25 | Filter matching nothing | 200 with `data: []` and `totalItems: 0` | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-13 | API | AC-27 | Pagination page 2 | Returns the next set with no overlap with page 1; `meta.page` is 2 | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-14 | API | AC-28, BR-34 | Sorting by ticket number ascending, and default sort | Order matches request; default is createdAt desc with ticketNumber desc as tie-breaker | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-15 | API | AC-29, BR-36 | Invalid query parameters | `pageSize=999` → 400 `INVALID_QUERY`, not a silent default | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-16 | API | AC-30 | Owned ticket detail | 200; all header fields plus attachment metadata | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-17 | API | AC-03, AC-31, D-07 | Ticket detail for another Requester's ticket | 404 `NOT_FOUND`; body identical to a genuinely missing ticket; no ticket data leaked | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-18 | API | AC-14, BR-24 | Oversized upload | 413 `FILE_TOO_LARGE`; no attachment row created | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-19 | API | AC-15, BR-23 | Unsupported type upload | 400 `UNSUPPORTED_FILE_TYPE`; no file written | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-20 | API | AC-16, BR-25 | Sixth active attachment | 409 `ATTACHMENT_LIMIT_REACHED`; removed attachments do not count toward the limit | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-21 | API | AC-17, FR-18 | Download an active owned attachment | 200; correct content type; `Content-Disposition` carries the original filename | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-22 | API | AC-18, BR-26 | Soft removal with reason | 200; `isRemoved` true; `removedAt`, `removedById`, `removedReason` populated; row still present | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-23 | API | AC-19, BR-28 | Download a removed attachment | 404; no file content returned | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-24 | API | AC-20, BR-27 | Removal without a reason | 422 `VALIDATION_ERROR`; attachment remains active | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-25 | API | BR-29 | Re-removing a removed attachment | 409 `ATTACHMENT_ALREADY_REMOVED` | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-26 | API | BR-13, AC-31 | Download an attachment on another Requester's ticket | 404; no content returned | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-27 | API | Seed rules | Seed idempotency | Running the seed twice produces no duplicate categories, systems, or requesters | `server/tests/lab-02/seed.api.test.ts` | Pending |
| API-28 | API | AC-34, BR-39 | Safe error on datastore failure | 500 with a generic message; no stack trace, SQL text, or file path in the body | `server/tests/lab-02/error-handling.api.test.ts` | Pending |
| API-29 | API | AC-35, FR-23 | Current Status filter | `currentStatus=NEW` returns only owned NEW tickets; `currentStatus=CLOSED` returns 400 `INVALID_QUERY` | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |

### 2.3 UI component

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | AC-04 | Selector renders active Requesters only | Options match the mocked active list; the inactive name is absent | `client/src/tests/lab-02/RequesterSelection.test.tsx` | Pending |
| UI-02 | UI | AC-02, FR-05 | Guarded route without a selection | Navigating to My Tickets renders the Selection screen | `client/src/tests/lab-02/RequesterContext.test.tsx` | Pending |
| UI-03 | UI | AC-05, BR-12 | Change Requester | Shell name updates; cached list, filters, and page position are cleared; data refetched | `client/src/tests/lab-02/RequesterContext.test.tsx` | Pending |
| UI-04 | UI | AC-06 | Requester API failure | Error state with a Retry action; no dropdown rendered | `client/src/tests/lab-02/RequesterSelection.test.tsx` | Pending |
| UI-05 | UI | AC-07 | No active Requesters | Empty state message; Continue not offered | `client/src/tests/lab-02/RequesterSelection.test.tsx` | Pending |
| UI-06 | UI | AC-08 | Create Ticket initial load | Category and Related System options come from the API; Requester field read-only with the selected name | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-07 | UI | AC-09, FR-11 | Submit with empty Summary | Field-level message appears next to Summary; the create API is **not** called | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-08 | UI | AC-11, BR-21 | Double submission | Second click ignored; button disabled and busy; exactly one API call | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-09 | UI | AC-01, AC-12 | Success state | Ticket Number from the response is displayed; View Ticket and Create Another actions offered | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-10 | UI | AC-13, AC-34, BR-22 | Backend failure on submit | Safe error message shown; every entered value still present in the form | `client/src/tests/lab-02/CreateTicket.test.tsx` | Pending |
| UI-11 | UI | AC-14, AC-15 | Invalid file selection | Oversized and unsupported files listed with their reasons; the valid file remains selected | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Pending |
| UI-12 | UI | AC-21, BR-31 | Ticket created but an upload fails | Ticket Number still shown; the failed file is reported with a retry option; the ticket is not discarded | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Pending |
| UI-13 | UI | AC-22 | My Tickets renders list and pagination | Rows match the mocked response; "Showing X to Y of Z" reflects `meta` | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-14 | UI | AC-23 | Requester switch clears the list | After switching, Requester A's ticket numbers are no longer in the document | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-15 | UI | AC-24, BR-38 | Search resets pagination | Searching from page 3 issues a request with `page=1` | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-16 | UI | AC-25 | No-results state | Distinct message plus a Clear Filters action; not the empty-state text | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-17 | UI | AC-26 | Empty state | "No tickets yet" message plus a Create Ticket action; no Clear Filters action | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-18 | UI | AC-28 | Sort control | Clicking a sortable header requests the new sort and updates `aria-sort` | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |
| UI-19 | UI | AC-30, §3.2 | Ticket Detail read-only and scope | All header fields non-editable; no comment box, internal note, Actions Taken, or status control in the document | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | Pending |
| UI-20 | UI | AC-18, AC-19, BR-28 | Removed attachment presentation | Metadata, removal reason, and Removed badge shown; no download control rendered | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Pending |
| UI-21 | UI | AC-20, BR-27 | Removal requires confirmation and reason | Remove action disabled until a valid reason is entered; cancel leaves the attachment active | `client/src/tests/lab-02/AttachmentSection.test.tsx` | Pending |
| UI-22 | UI | FR-31 | Loading states | Each screen renders its loading indicator while the request is pending | `client/src/tests/lab-02/LoadingStates.test.tsx` | Pending |
| UI-23 | UI | AC-35, FR-23, BR-38 | Current Status filter control | Select offers All Statuses and New only; choosing New requests `currentStatus=NEW&page=1`; Clear Filters resets it | `client/src/tests/lab-02/MyTickets.test.tsx` | Pending |

### 2.4 UI style

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI style | ui-spec §1, §5 | Primary button styling | Primary action carries the Zen Green primary class; no inline hex value | `client/src/tests/lab-02/ZenGreenStyle.test.tsx` | Pending |
| STYLE-02 | UI style | ui-spec §3 | Read-only vs editable fields | Read-only fields carry the read-only class and `readOnly`; editable fields do not | `client/src/tests/lab-02/ZenGreenStyle.test.tsx` | Pending |
| STYLE-03 | UI style | ui-spec §4 | Required-field marker | Every required control has an asterisk and `aria-required`; the asterisk is not the only error signal | `client/src/tests/lab-02/ZenGreenStyle.test.tsx` | Pending |
| STYLE-04 | UI style | ui-spec §4 | Validation message placement | The message element follows its control in the DOM and is referenced by `aria-describedby` | `client/src/tests/lab-02/ZenGreenStyle.test.tsx` | Pending |
| STYLE-05 | UI style | AC-11, ui-spec §5 | Busy and disabled buttons | Submitting sets `disabled` and `aria-busy="true"`; disabled controls cannot be activated | `client/src/tests/lab-02/ZenGreenStyle.test.tsx` | Pending |
| STYLE-06 | UI style | ui-spec §11 | Badge text present | Priority and status badges render text, not color alone; class names are consistent across screens | `client/src/tests/lab-02/ZenGreenStyle.test.tsx` | Pending |
| STYLE-07 | UI style | AC-33, ui-spec §13 | Keyboard reachability and focus | Every interactive element is tabbable in visual order with a visible focus indicator | `client/src/tests/lab-02/Accessibility.test.tsx` | Pending |

### 2.5 Responsive and E2E

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | AC-32 | Desktop 1280 × 800 | Multi-column form; ticket table; no horizontal scroll; screenshots captured | `e2e/lab-02/responsive.spec.ts` | Pending |
| RESP-02 | Responsive | AC-32 | Tablet 768 × 1024 | Two-column form; reduced table columns; no overlap; screenshots captured | `e2e/lab-02/responsive.spec.ts` | Pending |
| RESP-03 | Responsive | AC-32 | Mobile 375 × 812 | Fields stacked; ticket cards instead of a table; `scrollWidth <= clientWidth` | `e2e/lab-02/responsive.spec.ts` | Pending |
| RESP-04 | Responsive | AC-32, ui-spec §6 | Mobile navigation | Hamburger toggle opens navigation; Requester name visible; primary actions reachable | `e2e/lab-02/responsive.spec.ts` | Pending |
| E2E-01 | E2E | AC-01, AC-22 | Select Requester → create ticket → find it in My Tickets | Confirmation shows the official Ticket Number and the same number appears in the list | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-17, AC-18, AC-19 | Attachment lifecycle | Upload succeeds, download returns the file, soft removal retains metadata, removed download is blocked | `e2e/lab-02/attachment-lifecycle.spec.ts` | Pending |
| E2E-03 | E2E | AC-03, AC-23, AC-31 | Cross-requester isolation | After switching to Requester B, A's tickets are absent and a direct Ticket Detail URL is rejected | `e2e/lab-02/cross-requester.spec.ts` | Pending |
| E2E-04 | E2E | AC-33 | Keyboard-only ticket creation | The full Create Ticket flow completes without a mouse | `e2e/lab-02/accessibility.spec.ts` | Pending |

---

## 3. Acceptance-Criterion Traceability

Every Acceptance Criterion maps to at least one planned test, and every planned test names its actual file path above.

| AC | Description (short) | Covering tests |
|---|---|---|
| AC-01 | Valid submission saves one ticket with a number | API-01, UI-09, E2E-01 |
| AC-02 | No Requester selected → Selection screen | UI-02 |
| AC-03 | Other Requester's ticket not returned | API-17, E2E-03 |
| AC-04 | Inactive Requester absent from selector | API-06, UI-01 |
| AC-05 | Change Requester reloads context | UI-03 |
| AC-06 | Requester API failure state | UI-04 |
| AC-07 | No active Requesters empty state | UI-05 |
| AC-08 | Reference data from the database; Requester read-only | API-07, API-08, UI-06 |
| AC-09 | Empty Summary → field message, no API call | UI-07, API-02 |
| AC-10 | Summary length boundary | UNIT-03, API-03 |
| AC-11 | Double submit prevented | UI-08, STYLE-05 |
| AC-12 | Ticket Number format and matching requesterId | API-01, UI-09 |
| AC-13 | Backend down → safe error, values preserved | UI-10 |
| AC-14 | Oversized file rejected, valid one accepted | UNIT-05, API-18, UI-11 |
| AC-15 | Unsupported type rejected before upload | UNIT-04, API-19, UI-11 |
| AC-16 | Sixth attachment rejected | API-20 |
| AC-17 | Active attachment downloads | API-21, E2E-02 |
| AC-18 | Soft removal retains metadata | API-22, UI-20, E2E-02 |
| AC-19 | Removed attachment download blocked | API-23, UI-20, E2E-02 |
| AC-20 | Removal without reason rejected | API-24, UI-21 |
| AC-21 | Ticket kept when an upload fails | UI-12 |
| AC-22 | Only owned tickets listed | API-09, UI-13, E2E-01 |
| AC-23 | Switching Requester hides A's tickets | API-10, UI-14, E2E-03 |
| AC-24 | Search filters and resets to page 1 | API-11, UI-15 |
| AC-25 | No-results state distinct, Clear Filters offered | API-12, UI-16 |
| AC-26 | Empty state for a Requester with no tickets | UI-17 |
| AC-27 | Pagination returns the next page | API-13 |
| AC-28 | Sorting applies and indicator updates | API-14, UI-18 |
| AC-29 | Invalid pageSize rejected | UNIT-06, API-15 |
| AC-30 | Ticket Detail read-only, no out-of-scope controls | API-16, UI-19 |
| AC-31 | Direct URL to another's ticket rejected | API-17, API-26, E2E-03 |
| AC-32 | Responsive at 375, 768, 1280 px | RESP-01, RESP-02, RESP-03, RESP-04 |
| AC-33 | Keyboard-only operation | STYLE-07, E2E-04 |
| AC-34 | Safe error, no technical detail leaked | API-28, UI-10 |
| AC-35 | Current Status filter applies and rejects unknown values | API-29, UI-23 |

**Coverage summary:** 35 of 35 Acceptance Criteria covered. No AC is without a test; no test lacks a file path.

*Numbering note:* AC-35 was added after peer review of PR #5. Existing criteria are never renumbered, so a late addition takes the next free number rather than slotting into sequence.

---

## 4. Responsive and Visual Checklist

Completed manually against `ui-spec.md` §14 after the automated suite passes, using the captured screenshots rather than memory.

| Check | Desktop | Tablet | Mobile |
|---|---|---|---|
| Zen Green tokens applied; no stray hex values | ☐ | ☐ | ☐ |
| Active navigation marked by more than color | ☐ | ☐ | ☐ |
| Editable and read-only fields clearly distinct | ☐ | ☐ | ☐ |
| Required asterisks present on every required field | ☐ | ☐ | ☐ |
| Validation messages directly below their control | ☐ | ☐ | ☐ |
| Button hierarchy consistent; one primary per region | ☐ | ☐ | ☐ |
| Submit busy state visible and non-activatable | ☐ | ☐ | ☐ |
| Badges consistent in shape, size, and text | ☐ | ☐ | ☐ |
| Empty vs no-results visibly different | ☐ | ☐ | ☐ |
| Removed attachments show metadata, no download | ☐ | ☐ | ☐ |
| No clipping, overlap, or hidden buttons | ☐ | ☐ | ☐ |
| No unintended horizontal scrolling | ☐ | ☐ | ☐ |
| Focus indicator visible on all controls | ☐ | ☐ | ☐ |
| Attachment filenames truncate rather than overflow | ☐ | ☐ | ☐ |

Screenshot paths are listed in `ui-spec.md` §15.

---

## 5. Test Commands

```bash
# Backend — unit and API
cd server
npm run test                 # Vitest + Supertest, all lab-02 suites
npm run test -- --run tests/lab-02/create-ticket.api.test.ts   # single suite

# Frontend — UI component and style
cd client
npm run test                 # Vitest + React Testing Library

# End-to-end, responsive, and screenshots
npm run test:e2e             # Playwright, all viewports
npm run test:e2e -- --update-snapshots

# Full suite from the repository root
npm run test:all
```

Prerequisites: PostgreSQL running, `.env` configured from `.env.example`, `npx prisma migrate deploy`, and `npm run seed` completed. The seed is safe to run repeatedly.

---

## 6. Final Results

Filled in from the final `main` branch before submission. Paste the actual terminal output alongside this table.

| Suite | Command | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Server unit | `npm run test` (server) | | | | |
| Server API | `npm run test` (server) | | | | |
| Client UI + style | `npm run test` (client) | | | | |
| Playwright responsive | `npm run test:e2e` | | | | |
| Playwright E2E | `npm run test:e2e` | | | | |
| **Total** | | | | | |

**Evidence:** terminal output screenshots stored under `artifacts/lab-02/test-output/`.

**Declaration:** no test in this plan is skipped, disabled, commented out, or passing for a reason unrelated to its stated purpose.

---

## 7. Known Limitations and Deferred Tests

| Item | Reason | Planned sprint |
|---|---|---|
| No authentication or authorization tests | Excluded from Lab 2; the Requester header is a testing mechanism, not a security boundary | Lab 3 |
| No concurrency test for simultaneous ticket creation | BR-05 is covered by the transactional allocation in UNIT-02; a true load test needs tooling outside the Lab 2 stack | Team-project phase |
| No virus or content scanning of uploads | Not in the stakeholder request; type and size validation only | Not planned |
| No cross-browser matrix | Playwright runs Chromium only in Lab 2 to keep the suite fast | Later sprint if required |
| No visual regression baselines | Screenshots are captured for inspection; pixel-diff baselines are deferred until the UI stabilises | Lab 4 |
| Contrast checked manually, not automated | An automated axe pass is planned once the component set is final | Lab 3 |

---

*Prepared with AI specification-agent assistance. Reviewed, corrected, and approved by the student.*