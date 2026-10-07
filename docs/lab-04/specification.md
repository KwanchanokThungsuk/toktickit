# Lab 4 – Sprint 4 Engineering Specification

**Status:** Proposed engineering contract; no Sprint 4 implementation or test success is claimed. IDs in this directory are Lab 4 IDs, independent of Lab 3 IDs.

**Authority:** [Lab 4 handout](Lab_4_sheet.pdf), especially sections 4–8 and submission Part 6. The [Lab 3 specification](../lab-03/specification.md), [UI](../lab-03/ui-spec.md), [API](../lab-03/api-spec.md), [tests](../lab-03/tests.md), peer review record, and actual source establish the inherited baseline. [UI details](ui-spec.md), [REST contract](api-spec.md), and [test traceability](tests.md) complete this contract.

## 1. Sprint Goal

Complete the service-desk work cycle with attributable Actions Taken, guarded formal resolution, and concise dashboards that lead users to existing detailed screens. Preserve authenticated Requester ownership, communication privacy, attachments, user administration, and the Zen Green interface while hardening concurrency, failure recovery, accessibility, and final regression.

## 2. Stakeholder Request

The service desk needs to record actual work separately from conversations. One Ticket Owner coordinates the Ticket, while several people may contribute Actions Taken. Requesters need visibility into that work and attention-required Tickets; staff need an operational starting point. Requester resolution indications remain advisory, and authorized service-desk staff review work before formally resolving a Ticket.

The handout's submission rubric additionally mentions Action assignment, status, completion, cancellation, inactive assignees, and append-only behavior. Section 13 defines a minimal interpretation rather than silently omitting those grading requirements.

## 3. Scope

### Included

- Actions Taken list, create, view, permitted edit, assignment, completion, and cancellation under Ticket Detail; all items visible to the submitting Requester.
- Final Ticket transition matrix, backend resolution gate, authenticated attribution, stale-write and duplicate-create protection.
- Requester Dashboard; IT Staff Dashboard reused by Administrator; backend counts, bounded recent lists, and working drill-down filters.
- Additive PostgreSQL/Prisma migration, legacy compatibility, safe repeatable seeds, and recovery verification.
- Expanded Administrator operational permissions explicitly required by Lab 4 section 4.3, with existing User Management retained.
- Labs 1–3 regression and final responsive, accessibility, security, error-state, and demonstration hardening.

### Excluded

The handout explicitly excludes automatic SLA clocks, escalation engines, on-call scheduling, breach notifications; email/SMS/LINE/push or other external notifications; inventory consumption, spare parts, purchasing and service cost accounting; timesheet billing, payroll and detailed labor costs; multi-level approvals and electronic signatures; advanced BI, custom report builders and export warehouses; multi-tenant organizations and production-scale cloud operations; and unapproved new product features.

This contract adds no new file-upload mechanism, Action deletion, user deletion, multiple roles, reporting engine, or authentication redesign. Attachment Notes are plain text referring to existing Ticket files.

### Inherited implementation and gap

| Area | Observed Lab 3 baseline | Proposed Lab 4 increment |
|---|---|---|
| Authentication | Express cookie sessions; 8-hour inactivity; CSRF; mandatory password change | Reuse; close missing password-change/CSRF guards on protected inherited routes |
| Tickets | Eight Prisma statuses; one nullable `assignedToUserId`; separate Requested/IT Priority | Same status edges; resolution gate; integer concurrency version; formal resolution timestamp |
| Workflow | `server/src/routes/staff-ticket-detail.ts`; read then unconditional write | Atomic version checks and related-record gate serialization |
| Actions/dashboard | No model, routes, screens or tests | Additive model, API, UI, tests |
| Requester lists | `GET /api/tickets` accepts only `NEW` as a status filter | Accept all eight statuses and defined dashboard filters; retain existing response/defaults |
| Staff lists | Paginated queue; status/priority/search/sort; no owner filter | Add `owner=me|unassigned`, active status group and recent cutoff |
| Administrator | Queue/status/claim/comment/note writes denied; inspection and IT Priority allowed | Handout-required Staff capabilities; retain inspection links and user administration |
| Seed | Three sample Ticket statuses; existing upserts can overwrite demo records; initial password literal is 11 characters despite 12-character policy | Dedicated Lab 4 fixtures covering all statuses; safe reruns; valid locally supplied initial credentials |

The baseline findings are planning gaps, not changes made in this task. Existing Lab 3 role-denial tests and gate-free resolution tests need intentional Sprint 4 expectation changes; their historical documents remain intact.

## 4. Functional Requirements

| ID | Required observable behavior | Criteria |
|---|---|---|
| FR-01 | List all Actions Taken on accessible Tickets in stable recording-date/ID order; display all documented fields without Internal Notes | AC-01, AC-04 |
| FR-02 | IT Staff and Administrator create Actions Taken under one existing Ticket with authenticated attribution and validated fields | AC-01, AC-02 |
| FR-03 | IT Staff and Administrator assign/edit nonterminal Actions and complete/cancel them; reject inactive assignees and terminal edits | AC-03, AC-05 |
| FR-04 | Require Follow-up Note when Follow-Up Required is true; clear persisted note when false | AC-02 |
| FR-05 | Enforce the complete Ticket matrix and advisory Requester indication on the backend | AC-06, AC-08 |
| FR-06 | Formally resolve only when the defined Action gate holds, and persist formal resolution time | AC-07 |
| FR-07 | Return owned-only Requester Dashboard metrics and bounded attention/recent lists | AC-09, AC-11 |
| FR-08 | Return Staff/Administrator operational counts and bounded Ticket/current-user Action lists | AC-10, AC-11, AC-13 |
| FR-09 | Open real filtered My Tickets/Queue or Ticket Detail destinations from dashboard links | AC-12 |
| FR-10 | Compute dashboard metrics on the backend across all matching records, including legacy and empty data | AC-09–AC-11, AC-16 |
| FR-11 | Enforce role, session, password-change, CSRF and Requester ownership checks independently of UI visibility | AC-04, AC-13, AC-14 |
| FR-12 | Reject stale writes and prevent accidental duplicate Action creation without overwriting another user's work | AC-15 |
| FR-13 | Preserve earlier Ticket, attachment, communication, authentication and administration behavior except documented permission/gate refinements | AC-17 |
| FR-14 | Preserve Zen Green components and usable desktop/tablet/mobile layouts | AC-18 |
| FR-15 | Provide keyboard access, visible focus, semantic labels, accessible validation/dialogs and non-color status cues | AC-19 |
| FR-16 | Distinguish busy, success, empty, validation, forbidden, not-found, conflict and safe failure states; preserve recoverable drafts | AC-20 |
| FR-17 | Preserve records through migration/recovery and seed repeatably without overwriting user work | AC-16, AC-21 |
| FR-18 | Demonstrate bounded API responses, regression evidence, peer review, current setup instructions and clean final integration | AC-22, AC-23 |

## 5. Business Rules

| ID | Rule |
|---|---|
| BR-01 | An Action Taken belongs to exactly one existing Ticket; its Ticket relationship never changes. A Ticket may have zero or many Actions. |
| BR-02 | Ticket Owner (`assignedToUserId`) coordinates the Ticket. Action assignee, authenticated performer, and creator are separate identities and need not equal that Owner. Creating, assigning or completing an Action never changes the Ticket Owner. |
| BR-03 | Active, password-changed IT Staff and Administrators may create/update Actions on any Ticket accessible through the operational queue. Permission is not restricted to the Ticket Owner or original Action creator. Requesters cannot write Actions. |
| BR-04 | A Requester sees all Action business fields, including Result, Follow-up Note and Attachment Notes, only for Tickets whose `requesterId` matches server identity. These are shared content, never a place for private Internal Notes. |
| BR-05 | Server supplies creator and recording date/time. Performed By is null for a draft/cancelled unfinished Action and is the authenticated user completing it, or creating it already Completed. Client identity/timestamp overrides are rejected. Later edits cannot reattribute the performer. |
| BR-06 | Action Description is a nonblank string. Result is optional in Draft but nonblank when Completed or Cancelled (cancellation explanation). Follow-Up Required is a required boolean. Notes are nullable plain text. The project adopts the existing Lab 3 2,000-character limit for these fields as a design decision; reject over-limit input without truncation. Whitespace-only optional notes normalize to null. |
| BR-07 | When Follow-Up Required is true, Follow-up Note must be nonblank. When false, server persists null even if a note is submitted. A completed Action with follow-up true blocks Ticket resolution until an authorized user updates that Action to clear the flag. |
| BR-08 | Action assignee is optional; when supplied it must be an active IT Staff or Administrator. Revalidate any retained assignee on edit/completion; an ineligible one must be reassigned or cleared. Creator/performer historical relations remain valid after deactivation or role change. No Action-only assignment adds a new account-deactivation prohibition. |
| BR-09 | Action states are `DRAFT`, `COMPLETED`, `CANCELLED`. Create defaults Draft or explicitly Completed; creation directly Cancelled is rejected. Draft may edit/assign, then transition to Completed or Cancelled. Terminal state cannot transition back. No Action DELETE endpoint exists. |
| BR-10 | Actions have no delete operation. Updates use the current Action version and replace editable fields; the authenticated creator, performer and server dates remain server-controlled. Public Comments and Internal Notes remain append-only. |
| BR-11 | Only IT Staff and Administrator perform formal Ticket transitions; section 6 is exhaustive. Requesters never set formal Ticket status, owner or IT Priority. Requested Priority remains unchanged by operational edits. |
| BR-12 | The submitting Requester may indicate Problem Appears Resolved only in In Progress or Waiting for Requester and once per Ticket under inherited behavior. Server persists user/time, leaves status unchanged, rejects duplicate with `409`. Do not automatically clear the indication on reopen; display its time as historical advice. |
| BR-13 | Entering Resolved requires at least one Completed Action with a nonblank Result, no Draft Actions, and no Completed Action with Follow-Up Required=true. Cancelled Actions do not satisfy the completed-work requirement or block the gate. The user reviews Actions before confirmation. No automatic resolution follows Action completion. Closing is permitted only from Resolved; legacy already-Resolved Tickets can close without fabricating Actions. |
| BR-14 | New/edited Actions on Resolved, Closed or Cancelled Tickets return `409 TICKET_NOT_ACTIVE`; reopen first. Cancelling a Ticket updates its Draft Actions with a cancellation explanation and preserves completed work. No resolution gate applies to cancellation. |
| BR-15 | All status/Action/owner/priority writes and Requester indication verify the expected Ticket version inside an atomic database transaction. A stale expected version returns `409 STALE_UPDATE` with no partial mutation; successful mutations increment the Ticket version. Related Action updates also check Action version, and gate evaluation occurs in the same transaction as the write. |
| BR-16 | The UI disables duplicate submission while an Action request is pending. The backend may use a simple unique request key where needed; an accidental repeated submission must not silently create multiple equivalent Actions. |
| BR-17 | Requester Dashboard and its drill-down always scope to authenticated `requesterId`; Staff Dashboard uses all Tickets with separately defined current-user owner/performer predicates. Administrator reuses Staff Dashboard with its own authenticated ID. |
| BR-18 | Dashboard definitions in section 9 are authoritative. Count database records, not fetched page length; Action count is not Ticket count. Fill all status/priority buckets with integer zero and return empty arrays when no records match. |
| BR-19 | Dashboard metrics and preview lists use the same backend `asOf` value and the same documented predicates. Time values are UTC instants; recent means `[asOf−7×24 hours, asOf]`. Display dates in Asia/Bangkok with an explicit zone label. Drill-down uses the returned window boundaries, not a newly computed browser date. |
| BR-20 | Do not fabricate historical work or resolution times. Existing Tickets with no Actions remain visible and counted. Section 8 defines legacy resolved-time fallback. No migration changes prior status or communications. |
| BR-21 | Existing login/logout, first-password change, Ticket creation, attachment ownership/limits/soft removal, append-only Public Comments/Internal Notes and Administrator safety rules persist. Administrator gains approved Staff operations under Lab 4, but IT Staff still cannot access User Management. |
| BR-22 | Render all submitted content as inert text; safe errors never expose passwords, hashes, session tokens, storage paths, SQL or other Requesters' records. Failed loading is not a zero dashboard. Repeated-click prevention is paired with backend duplicate safety. |

### Final authorization matrix

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Requester Dashboard / My Tickets / create Ticket | Own / yes | No | No |
| Staff Dashboard / Queue / Staff Detail | No | Yes | Yes |
| View Actions | Owned Tickets | All accessible Tickets | All accessible Tickets |
| Create, assign, update, complete/cancel Actions | No | Yes | Yes |
| Claim/reassign Ticket; IT Priority; permitted status transition | No | Yes | Yes |
| Problem Appears Resolved | Own, BR-12 | No | No |
| Read/create Public Comments | Own | Yes | Yes |
| Read/create Internal Notes | No | Yes | Yes |
| Existing attachment upload/download/remove APIs | Own | No | No |
| Attachment metadata in Staff Detail | No (own detail instead) | Yes | Yes |
| User Management | No | No | Yes |
| Existing Administrator Ticket Inspection | No | No | Retained |

Administrator operational expansion is an explicit handout override of Lab 3's role restrictions, not an accidental authorization regression. Staff file-download permission is not invented: existing operational detail only shows attachment metadata.

## 6. Ticket Status Transition Matrix

UI labels below correspond to existing uppercase snake-case API/Prisma values. Every edge requires current authorization and matching `expectedVersion`. Same-state requests are invalid transitions (`409`). No other edge is allowed.

| Current status | Next status | Role | Conditions |
|---|---|---|---|
| New | Open | IT Staff / Administrator | Review received Ticket |
| New | Cancelled | IT Staff / Administrator | Confirm; BR-14 draft cleanup |
| Open | In Progress | IT Staff / Administrator | Begin work |
| Open | Waiting for Requester | IT Staff / Administrator | Requester input needed |
| Open | Cancelled | IT Staff / Administrator | Confirm; BR-14 |
| In Progress | Waiting for Requester | IT Staff / Administrator | Requester input needed |
| In Progress | Resolved | IT Staff / Administrator | Confirm and BR-13 gate |
| In Progress | Cancelled | IT Staff / Administrator | Confirm; BR-14 |
| Waiting for Requester | In Progress | IT Staff / Administrator | Resume work |
| Waiting for Requester | Resolved | IT Staff / Administrator | Confirm and BR-13 gate |
| Waiting for Requester | Cancelled | IT Staff / Administrator | Confirm; BR-14 |
| Resolved | Closed | IT Staff / Administrator | Confirm; no new Action prerequisite for legacy resolved records |
| Resolved | Reopened | IT Staff / Administrator | Work needs review again |
| Closed | Reopened | IT Staff / Administrator | Work needs review again |
| Reopened | In Progress | IT Staff / Administrator | Resume work |
| Reopened | Waiting for Requester | IT Staff / Administrator | Requester input needed |
| Reopened | Cancelled | IT Staff / Administrator | Confirm; BR-14 |
| Cancelled | Reopened | IT Staff / Administrator | Resume through inherited edge; cancelled Actions stay cancelled |

The matrix was verified against `server/src/routes/staff-ticket-detail.ts`, the Lab 3 detail API tests, and the Lab 3 specification: those sources implement the listed edges, including New/Open cancellation and both Closed → Reopened and Cancelled → Reopened. Lab 4 carries those inherited edges forward and adds only the resolution gate on transitions into Resolved; no additional Reopened edge is invented. Reopened Tickets use the same gate over current Actions; a fresh Action per reopen cycle is not mandated. Each entry to Resolved updates `resolvedAt`; reopen preserves the prior value but removes the Ticket from recently-resolved results until resolved again.

## 7. Actions Taken Data Model

Conceptual design only; implementation must later update Prisma and migrate PostgreSQL.

| Field | Type / meaning |
|---|---|
| `id` | Generated positive integer identifier, matching existing IDs |
| `ticketId` | Required immutable Ticket foreign key |
| `actionDateTime` | Server recording instant, UTC; immutable, displayed as Action Date/Time |
| `actionDescription` | Required text, BR-06 |
| `result` | Nullable draft text, required terminal text |
| `createdById` | Required User relation, authenticated creator |
| `performedById` | Nullable User relation, authenticated completion actor; never assignee inference |
| `assignedToUserId` | Nullable Action assignee User relation; separate from Ticket field of same name |
| `status` | Draft/Completed/Cancelled enum, separate from TicketStatus |
| `followUpRequired` | Boolean |
| `followUpNote`, `attachmentNotes` | Nullable bounded plain text |
| `completedAt` | Backend instant on completion, immutable |
| `createdAt`, `updatedAt` | Backend persistence timestamps |
| `version` | Integer initialized 1 and atomically incremented on update |
| `requestKey` | Optional short-lived request key used only if the implementation needs a database uniqueness guard for duplicate creates |

The current Action row and its `updatedAt`/`version` represent the latest state. No deletion API is exposed.

Ticket adds `version` (default 1) and nullable `resolvedAt`. Detail responses expose version to permitted callers. All mutations that participate in BR-15 increment parent version. Existing timestamps retain their meaning; new Action/operational writes also refresh Ticket.updatedAt. Existing comment/note/file timestamp behavior is retained; recently updated means Ticket.updatedAt, not a claim to capture every communication event.

### Justified database decisions

1. **Separate child relation:** normalized Actions avoid overloading append-only communications. Required Ticket and User relations prevent orphaned work and preserve attribution. No product Ticket/User deletion is added.
2. **Integer versions:** timestamp-only comparison can collide; a simple integer version detects stale browser edits and returns `409 Conflict`. A normal database transaction keeps each individual write atomic without additional concurrency infrastructure.
3. **Query indexes:** Action `(ticketId, actionDateTime, id)` supports stable pagination; `(performedById, completedAt, id)` supports current-user activity. Ticket `(requesterId, updatedAt, id)`, `(assignedToUserId, currentStatus)`, and `(currentStatus, resolvedAt)` support dashboard/list predicates. Retain existing requester/createdAt and attachment indexes; validate additional indexes with the performance smoke plan rather than creating an analytics warehouse.
4. **Formal resolution timestamp:** `updatedAt` changes on closure/priority edits, so new resolutions need their own timestamp. Nullable data avoids falsely asserting an actual historical resolution instant.

## 8. Migration and Backfill Strategy

1. Back up database and attachment storage; record current schema/migration version and record/relationship counts. Rehearse using an isolated Lab 3-shaped database, not the developer database.
2. Apply additive migration: Action table, enums, constraints, indexes; Ticket.version default 1 and nullable resolvedAt. Preserve all User/Ticket/Attachment/comment/note IDs, foreign keys, bodies, status, owner, priorities and timestamps. Do not rewrite prior migration files.
3. Do not generate synthetic Actions. Legacy lists return zero items. Legacy active Tickets must acquire real qualifying work before a new resolution; already-Resolved legacy Tickets may close. Backfill version only; leave unknown resolvedAt null.
4. For recently-resolved calculations, eligible legacy Resolved/Closed Tickets use `COALESCE(resolvedAt, updatedAt)` with `resolutionTimeSource=LEGACY_UPDATED_AT`; show an estimated-time label. New formal transitions store resolvedAt and use `FORMAL_RESOLUTION`. This fallback is an honest estimate, not reconstructed history. Closure of a legacy Ticket may change the estimate; acknowledge that limitation.
5. Extend seeds with dedicated deterministic fixture identity, preserving existing credentials and user edits on rerun. Do not adopt the existing unconditional Ticket overwrite pattern for Lab 4 fixtures. Provide all eight statuses, all priorities, assigned/unassigned Tickets, at least two Requesters plus an empty-dashboard Requester, different owners/performers, Draft/Completed/Cancelled Actions, zero/one/many Actions, follow-up true/false, recent/outside-window timestamps, and a staff user with no personal work. Reruns create missing fixture records only and never reset live workflow or passwords. Initial credentials must meet the existing 12–128-character policy and come from untracked local configuration; do not reuse the 11-character seed literal.
6. Verify migration and repeat-seed integrity plus aggregate queries. Do not reinterpret old priority, ownership or indication data. Preserve file contents and soft-removal metadata.
7. Recovery: take a database and attachment backup before migration, verify migration failure leaves no partial write, and use a forward corrective migration after new Actions exist. A restore rehearsal is sufficient; no special rollback service is required.

## 9. Dashboard Definitions

These definitions apply identically in UI/API/tests. No frontend collection counting. `ACTIVE={NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED}`. Terminal Tickets are Resolved, Closed, Cancelled. Backend `asOf` sets the inclusive 7-day UTC rolling window. Recent lists are capped at 5 per list; this is a presentation limit, never the metric calculation limit. Ticket ordering is `updatedAt desc, id asc`; recently resolved ordering is effective resolution time desc, id asc; current-user Actions order `completedAt desc, id asc`.

Each metric includes `{count, drillDown:{destination,query}}`. Destinations are logical hash-screen paths without `#`; API query keys mirror existing list naming. Counts show 0; lists show “No matching tickets/actions” and keep a useful list link. No percentages or division calculations are introduced.

### Requester Dashboard

Every predicate includes `Ticket.requesterId=authenticated user ID`.

| Metric key / label | Exact count predicate | Drill-down destination and API query |
|---|---|---|
| `openTickets` / Open Tickets | Current status in ACTIVE | `/tickets`, `statusGroup=active` |
| `waitingForRequester` / Waiting for Requester | Current status WAITING_FOR_REQUESTER | `/tickets`, `currentStatus=WAITING_FOR_REQUESTER` |
| `recentlyUpdated` / Recently Updated Tickets | updatedAt in returned window, any status | `/tickets`, `updatedFrom=window.start&updatedTo=window.end&sortBy=updatedAt&sortOrder=desc` |
| `recentlyResolved` / Recently Resolved Tickets | Current status RESOLVED or CLOSED and effective resolution time in window | `/tickets`, `recentlyResolvedFrom=window.start&recentlyResolvedTo=window.end` |

Lists: `attentionRequired` uses waitingForRequester predicate; `recentTickets` uses recentlyUpdated; `resolvedTickets` uses recentlyResolved. Each row opens `/tickets/:id`. All list/count scope is enforced even if the client attempts to substitute requester identity. My Tickets retains existing page sizes 10/20/50 and `{data,meta}` response.

### IT Staff / Administrator Dashboard

All Tickets are accessible operationally; `me` always means the authenticated caller, including Administrator.

| Metric key / label | Exact count predicate | Drill-down destination and API query |
|---|---|---|
| `unassignedTickets` / Unassigned Active Tickets | assignedToUserId null and current status in ACTIVE | `/staff/tickets`, `owner=unassigned&statusGroup=active` |
| `myTickets` / My Active Tickets | assignedToUserId=me and current status in ACTIVE | `/staff/tickets`, `owner=me&statusGroup=active` |
| `byStatus.<status>` / Tickets by Status | Each of all eight statuses, all Tickets | `/staff/tickets`, `status=<status>` |
| `byItPriority.<priority>` / Active Tickets by IT Priority | ACTIVE and each LOW/MEDIUM/HIGH | `/staff/tickets`, `statusGroup=active&itPriority=<priority>` |
| `recentlyUpdated` / Recently Updated Tickets | updatedAt in returned window, any status | `/staff/tickets`, `updatedFrom=window.start&updatedTo=window.end&sortBy=updatedAt&sortOrder=desc` |
| `myActions` / My Completed Actions This Week | Action status COMPLETED, performedById=me and completedAt in window, regardless of Ticket status | `/staff/dashboard/actions`, `completedFrom=window.start&completedTo=window.end` |

Lists: `recentTickets` uses recentlyUpdated; `urgentTickets` uses ACTIVE and HIGH IT Priority, ordered updatedAt desc/id asc; `myRecentActions` uses myActions. Urgent list “View all” opens the HIGH active Queue filter; rows open `/staff/tickets/:id`. Action rows open that Ticket and focus `action-<id>`. `/staff/dashboard/actions` is a small paginated current-performer drill-down list, not a new work-management system. Administrator reuses exactly these metrics; optional user-account counts are omitted to avoid extra scope. User Management remains a separate navigation entry.

## 10. API Contract Summary

[api-spec.md](api-spec.md) defines nested Action list/create/update, existing status/owner/priority/claim endpoint extensions, Requester indication concurrency, two dashboard reads, current-user Action drill-down, and additive list filters. Keep `/api/tickets` and `/api/staff/tickets` conventions and existing response envelopes. All new business validation uses existing `422`, with `400` for malformed requests, `401/403/404` for access, `409` for conflicts and safe `500` for unexpected failures.

UI summary: extend AppShell hash navigation and existing Ticket Detail panels; use Actions create/view/edit modes, status confirmations, bounded metric cards and lists. [ui-spec.md](ui-spec.md) defines the shared-content warning, form rules, mobile representation and feedback.

## 11. Acceptance Criteria

| ID | Testable criterion |
|---|---|
| AC-01 | Given a permitted staff/admin user, when a valid Action is created, then it belongs to the selected Ticket, creator/date are server supplied, other Ticket ownership is unchanged, and all fields appear in stable order. |
| AC-02 | Given Action input, when required strings, booleans, the project 2,000-character boundary or follow-up dependencies are invalid, then `422` identifies fields and saves nothing; false follow-up persists null note. |
| AC-03 | Given a Draft Action, when staff/admin edits, assigns, completes or cancels it, then valid changes persist with a higher version; inactive/nonstaff assignees and unsupported transitions are rejected. |
| AC-04 | Given two Requesters, when one reads owned Actions or attempts another Ticket's Actions, then all owned items are readable, unowned access yields safe `404`, writes yield `403`, and no Internal Notes are included. |
| AC-05 | Given terminal Actions, when a permitted user submits an allowed correction, then the version changes while performer/date remain server-controlled; attempted identity/date change or deletion is rejected. |
| AC-06 | Given each Ticket status, when any target is submitted, then exactly the 18 matrix edges can succeed with matching version and applicable gate; other edges return `409`, unknown enums `422`. |
| AC-07 | Given zero Actions, only cancelled Actions, a Draft, or unresolved completed follow-up, when Resolved is requested, then `409 RESOLUTION_BLOCKED` leaves all state unchanged; qualifying work allows resolution and formal resolvedAt, then closure. |
| AC-08 | Given an owned In Progress/Waiting Ticket, when Requester indicates resolution, then authenticated indication/time persist with no formal status change; repeat/disallowed state returns `409` and staff sees the advice. |
| AC-09 | Given mixed Requester data, when Requester Dashboard is retrieved, then each count/list matches section 9 for that authenticated Requester and cannot include another Requester's data. |
| AC-10 | Given mixed Ticket statuses/priorities/owners and performers, when Staff or Administrator Dashboard is retrieved, then every bucket and personal metric matches section 9, and recent lists are capped at 5. |
| AC-11 | Given empty datasets and date-boundary fixtures, when dashboards are read, then all buckets contain zero/empty arrays as applicable and inclusive seven-day UTC boundaries and Asia/Bangkok display are consistent. |
| AC-12 | Given any actionable dashboard metric/row, when its link is followed, then the existing list uses the same predicate/window and backend scope, resets to page 1, and opens the correct detail; current-user Action drill-down remains paginated. |
| AC-13 | Given Administrator, IT Staff and Requester sessions, when operational endpoints are called directly, then Administrator has approved Staff behavior and retained User Management, IT Staff cannot manage users, and Requester operational writes remain forbidden. |
| AC-14 | Given missing/expired/deactivated sessions, forced-password accounts or missing/wrong CSRF tokens, when protected operations are attempted, then `401/403` prevents read/write as applicable without exposing sensitive data. |
| AC-15 | Given stale parent/Action versions or simultaneous Action/resolution writes, when saves compete, then at most the correctly serialized changes commit and conflicts preserve drafts; equivalent create retries produce one Action, changed-body retries conflict. |
| AC-16 | Given an isolated database containing Lab 1–3 records, when migration/recovery is rehearsed, then IDs, relationships, status, content and files remain intact; zero-Action and unknown legacy resolution times behave as documented. |
| AC-17 | Given existing user roles and fixtures, when representative Labs 1–3 flows run, then login/logout, forced password change, owned Ticket creation/list/detail, attachments, Public Comments, Queue/owner/priority, Internal Notes and User Management safety remain correct except explicit Lab 4 permission/gate changes. |
| AC-18 | Given 1440×900, 1024×768, 390×844 and 320×568 viewports, when new and retained screens are used, then no page overflow/clipping/overlap prevents reading or operating controls and Zen Green tokens remain consistent. |
| AC-19 | Given keyboard-only operation, when navigating dashboards, Actions and workflow, then controls have meaningful names, visible focus, associated errors, logical tab order and accessible confirmation focus behavior; statuses are conveyed with text. |
| AC-20 | Given loading, empty, validation, forbidden, missing, conflict and failed API responses, when screens handle them, then feedback is distinct and safe, duplicate submissions are blocked, recoverable drafts survive, and success refreshes authoritative detail/dashboard data. |
| AC-21 | Given repeatable dedicated seeds, when run twice, then all required status/priority/Action/owner/empty fixtures exist without duplicates or altered credentials/user work. |
| AC-22 | Given the performance smoke fixture, when dashboard/list calls execute, then counts remain correct, list payloads bounded and query growth independent of total rows as defined in tests.md; health remains `200` with its existing safe response. |
| AC-23 | Given a release candidate, when final review occurs, then full current test output, visual/accessibility evidence, peer approvals, current README and clean integrated main demonstrate the Product Definition of Done without placeholder completion claims. |

## 12. Definition of Done

This is a future product-release checklist, not the completion claim for this documentation task.

- [ ] Four contracts agree on IDs, roles, fields, gates, metrics, filters, errors and tests; contract predates implementation PR completion.
- [ ] Actions support documented modes, assignment/lifecycle, shared visibility, server attribution, version checks and duplicate-submit safety.
- [ ] All Ticket edges, resolution/cancellation rules, advisory indication and stale-update behavior are enforced by backend transactions.
- [ ] Dashboards/drill-downs use accurate backend queries with zero/boundary/legacy evidence; Administrator expansion is verified.
- [ ] Additive Prisma migration, legacy backfill policy, repeatable safe seeds and recovery rehearsal preserve all earlier data/files.
- [ ] Authorization, ownership, CSRF, account safety and password-change gates are tested by direct API calls.
- [ ] Unit, API/integration, UI, authorization, workflow, migration/regression, performance-smoke and E2E plans are implemented and passing with actual file paths/results from final main.
- [ ] Responsive and keyboard/accessibility review passes for new and inherited screens; screenshots and checklist under `artifacts/lab-04/screenshots/` cover staff-dashboard, requester-dashboard and actions-taken, plus representative retained screens.
- [ ] No broken drill-down links, unfinished controls, temporary selector, duplicate navigation, console errors or placeholder content remain; recoverable forms retain entered data.
- [ ] README documents current setup, configuration, migration, seed, tests and demonstration; no real credentials or generated clutter are committed.
- [ ] Issues follow existing Kanban flow, feature PRs receive peer review, feature work integrates through `lab4-staging` then `main`; reviewer/AI-use/submission evidence is completed during release, not fabricated here.
- [ ] Final main is clean and matches verified release evidence; handout's one-PDF submission has working links and readable evidence in Answer Parts 1–9.

## 13. Assumptions and Design Decisions

| ID | Decision and reason / review point |
|---|---|
| DD-01 | Interpret section 4.3 “Administrator perform IT Staff behavior” broadly for queue/detail, ownership/status and communication writes, not solely Actions. This supersedes conflicting Lab 3 denials while retaining one-role accounts and Requester-only file APIs. Review this deliberate scope interpretation. |
| DD-02 | Main Action field list lacks assignment/lifecycle, but submission Part 6 explicitly requires them. Adopt the minimal Draft/Completed/Cancelled lifecycle and optional eligible assignee; no SLA, action priorities, scheduling or separate task module. Enum names are project choices. |
| DD-03 | “Append-only” applies to Public Comments/Internal Notes. Actions are updateable because the handout requires update behavior; no separate audit structure is added. |
| DD-04 | Performed By means the authenticated completing actor; creator records drafts and assignee plans work. This avoids claiming the assignee performed work. The example “approved assignee” is handled as a separate identity, not a client-controlled performer. |
| DD-05 | Action Date/Time means server record-creation time, consistent with section 8.3's “Action create date/time”; completion time is separate. Backdated/future work dates are not added. Review if instructor expects editable actual-work time. |
| DD-06 | Resolution gate in BR-13 is a proposed policy because the handout requires a gate but does not define its predicate. Require completed evidence, no unfinished Actions and no completed follow-up flags. Do not require Requester acknowledgement, owner equality, a new Action per reopen, or synthetic work on legacy resolutions. |
| DD-07 | Use existing 2,000-character communication limit for Action text; seven rolling days, five recent rows, UTC calculations and Asia/Bangkok display provide consistent small dashboards. These values are design choices, not handout mandates. |
| DD-08 | Reuse Staff Dashboard for Administrator without account-count cards; add only filters and a bounded personal Action drill-down needed to make links real. |
| DD-09 | Use integer versions, ordinary atomic database writes, and frontend pending-state protection. A simple uniqueness key may be used for duplicate creates; no additional concurrency infrastructure is required. |
| DD-10 | Leave unknown legacy resolution instants null and explicitly label updatedAt fallback estimates. Existing records still contribute to useful dashboards without fabricated dates. |

Unresolved handout wording is exposed in DD-01 through DD-06; the proposed contract provides one implementable interpretation for each. These assumptions should be reviewed before feature implementation. No document-only review here claims they have instructor approval.
