# Lab 2 Sprint Engineering Specification

**Project:** TokTickIT IT Service Desk
**Sprint:** Individual Sprint 2 — Requester Ticketing MVP with UI Foundation
**Course:** CPE 334, Semester 1/2026
<!-- **Status:** Approved before implementation -->
**Related documents:** `docs/lab-02/ui-spec.md`, `docs/lab-02/api-spec.md`, `docs/lab-02/tests.md`

---

## 1. Sprint Goal

Deliver a professional, responsive Requester-facing ticketing experience that lets an end user describe an IT problem, classify it, attach supporting evidence, and submit it — then find, open, and manage that ticket afterwards. The sprint also establishes the reusable Zen Green visual system, form and list conventions, and backend ownership enforcement that every later sprint will build on. At the end of this sprint the IT department can accept real support requests from Requesters, with each ticket stored safely in PostgreSQL under a unique system-generated Ticket Number.

---

## 2. Stakeholder Request Interpretation

The stakeholder wants the first genuinely usable slice of the product: the part a normal employee touches. Concretely, they are asking for four screens (Requester selection, Create Ticket, My Tickets, Ticket Detail) backed by a real database, with three non-negotiable qualities — the backend owns the Ticket Number, one Requester can never see another Requester's data, and the interface looks and behaves consistently rather than being four differently-styled pages.

Because authentication arrives in Lab 3, the stakeholder accepts a temporary substitute: a Development Requester selector that establishes "who is using the app right now" for testing purposes. This is a scaffold, not a security feature, and the specification treats it as such — ownership is still enforced on the server so that swapping the selector for real authentication in Lab 3 is a change of identity source, not a rewrite of the authorization logic.

The stakeholder request is deliberately incomplete. This document resolves the gaps (validation limits, query contract, attachment lifecycle, failure behavior) and records those resolutions as numbered rules.

---

## 3. Scope

### 3.1 Included

- Development Requester Selection screen; selected-Requester context; Change Requester action.
- Create Ticket: form, reference data loaded from the database, client and server validation, submission, success state showing the generated Ticket Number.
- My Tickets: paginated list of the selected Requester's own tickets with search, filters, sorting, empty state, no-results state, and failure state.
- Requester Ticket Detail: read-only ticket header information for an owned ticket.
- Attachment lifecycle: upload at creation time and on an existing ticket, metadata listing, download of active attachments, soft removal with reason.
- Ownership enforcement on every ticket and attachment endpoint, verified in the backend.
- Zen Green theme, reusable form/list/badge/state components, responsive desktop, tablet, and mobile layouts.
- Automated tests at unit, API, UI component, UI style, responsive, and E2E levels.
- Seed data: categories, related systems, active and inactive Development Requesters.

### 3.2 Explicitly excluded

- **Authentication and security:** login, logout, passwords, hashing, sessions, tokens, real role-based authorization. The Development Requester selector is a testing mechanism only.
- **IT Staff workflow:** IT Staff dashboard or queue, claiming or reassigning tickets, Ticket Owner assignment, IT Priority.
- **Collaboration and work tracking:** Public Comments, Internal Notes, Actions Taken, Event Log.
- **Ticket lifecycle beyond creation:** any status change after the initial `NEW` status — resolution, confirmation, closing, reopening, cancelling.
- **Administration:** user management, role assignment, reference-data management screens.
- **Hard deletion** of tickets or attachments, and ticket editing after creation.

Anything in this list that appears in the illustrative screenshots (Ticket Owner, IT Priority, Public Comments tabs) is out of scope for Lab 2 and must not be implemented.

---

## 4. Functional Requirements

### Development Requester context

- **FR-01** The system shall provide a Development Requester Selection screen that loads all active Development Requesters from PostgreSQL through the API.
- **FR-02** The system shall persist the selected Requester in browser storage so the context survives a page reload within the same browser.
- **FR-03** The application shell shall display the currently selected Requester's name on every screen.
- **FR-04** The system shall provide a Change Requester action that returns the user to the Selection screen and clears the previous selection.
- **FR-05** The system shall redirect any attempt to reach Create Ticket, My Tickets, or Ticket Detail without a selected Requester to the Selection screen.
- **FR-06** The system shall reload all Requester-specific data whenever the selected Requester changes.

### Create Ticket

- **FR-07** The system shall provide a Create Ticket screen that loads active Categories and Related Systems from the database.
- **FR-08** The Create Ticket screen shall display the Requester as a read-only value derived from the selected Development Requester.
- **FR-09** The Create Ticket screen shall display Ticket Number, Ticket Date, and Current Status as read-only, system-generated values that are unavailable before submission.
- **FR-10** The system shall validate Summary, Description, Category, Related System, and Requested Priority on the client before submission and again on the server.
- **FR-11** The system shall display field-level validation messages next to the offending control.
- **FR-12** The system shall create exactly one Ticket per successful submission and return its official Ticket Number.
- **FR-13** The system shall display a success state containing the generated Ticket Number and a clear next action (view the ticket, or create another).
- **FR-14** The system shall preserve all entered form values when submission fails for any reason.

### Attachments

- **FR-15** The system shall allow a Requester to select up to five attachments during ticket creation and to add attachments to an existing owned ticket, subject to the five-active-attachment limit.
- **FR-16** The system shall reject files whose type or size violates the attachment constraints, with a message identifying the offending file and the reason.
- **FR-17** The system shall list attachment metadata (display filename, size, content type, upload timestamp, state) on the Ticket Detail screen.
- **FR-18** The system shall allow download of active attachments belonging to an owned ticket.
- **FR-19** The system shall allow the owning Requester to soft-remove an active attachment after confirming the action and supplying a removal reason.
- **FR-20** The system shall continue to display removed attachments as metadata, visually marked as removed, with download and preview disabled.

### My Tickets

- **FR-21** The system shall list only the selected Requester's own tickets, scoped in the database query rather than filtered in the client.
- **FR-22** The system shall support keyword search across Ticket Number and Summary.
- **FR-23** The system shall support filtering by Category, Related System, Requested Priority, and Current Status. In Lab 2 the Current Status filter offers only `NEW`, since no other status can exist (BR-02); the control is specified now so that later sprints extend its option list rather than introduce a new control.
- **FR-24** The system shall support sorting by Ticket Number, Created Date, and Last Updated, ascending or descending.
- **FR-25** The system shall paginate the ticket list and return pagination metadata (current page, page size, total items, total pages).
- **FR-26** The system shall distinguish an empty state (the Requester has no tickets at all) from a no-results state (filters or search matched nothing) and offer a Clear Filters action in the latter.
- **FR-27** The system shall provide a Create Ticket action from the My Tickets screen.

### Ticket Detail

- **FR-28** The system shall present all stored Ticket header information as read-only on the Ticket Detail screen.
- **FR-29** The system shall reject any request for a Ticket or Attachment that does not belong to the selected Requester, without disclosing whether the resource exists.
- **FR-30** The system shall provide navigation back to My Tickets from Ticket Detail.

### Cross-cutting

- **FR-31** Every screen that loads or submits data shall present a loading state, a success state, and a safe failure state.
- **FR-32** The system shall return safe, non-technical error messages to the client and log technical detail on the server only.

---

## 5. Business Rules

### Ticket identity and defaults

- **BR-01** The official Ticket Number is generated by the backend and must be unique. The client never supplies or predicts it.
- **BR-02** A new Ticket begins with Current Status `NEW`. No other status transition exists in Lab 2.
- **BR-03** Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication.
- **BR-04** The Ticket Number format is `TKT-<YYYY>-<NNNNNN>`, where `YYYY` is the creation year and `NNNNNN` is a zero-padded sequence that restarts each year (for example `TKT-2026-000042`).
- **BR-05** The Ticket Number is allocated inside the same database transaction that inserts the Ticket, so a failed insert consumes no number and concurrent creations cannot collide.
- **BR-06** Ticket Date is the server-side creation timestamp. Client clocks are never trusted.
- **BR-07** Ticket Owner, IT Priority, and Resolution Summary remain null in Lab 2 and are not displayed on Requester screens.
- **BR-08** A Ticket is immutable after creation in Lab 2. Only its attachment collection may change.

### Requester selection and ownership

- **BR-09** Only Requesters with `isActive = true` appear in the Development Requester selector.
- **BR-10** An inactive Requester may still own historical tickets; deactivation never deletes or hides existing data from the backend.
- **BR-11** The `requesterId` stored on a Ticket is taken from the server-validated selection, and the server rejects a request whose Requester does not exist or is inactive.
- **BR-12** Changing the selected Requester clears all cached Requester-specific state (list results, filters, page position, open ticket).
- **BR-13** Every ticket and attachment endpoint verifies ownership on the server. Client-side hiding is never the only protection.
- **BR-14** Ownership failure and missing-resource cases return the same response shape, so the API does not reveal that another Requester's ticket exists.

### Validation

- **BR-15** Summary is required, trimmed, and between 10 and 150 characters. The lower bound rejects meaningless entries such as "help"; the upper bound keeps the list column readable at all viewport sizes.
- **BR-16** Description is required, trimmed, and between 20 and 5000 characters. The lower bound forces enough context for IT Staff to triage; the upper bound bounds the payload and the detail layout.
- **BR-17** Category, Related System, and Requested Priority are required, and each submitted value must match an active reference row. Unknown identifiers are rejected as invalid input, not silently ignored.
- **BR-18** Requested Priority is one of `LOW`, `MEDIUM`, `HIGH`, and defaults to `MEDIUM` in the form.
- **BR-19** All string inputs are trimmed before validation and before storage; a value that is only whitespace is treated as missing.
- **BR-20** Client validation is a convenience. The server revalidates every field and is the authority.
- **BR-21** The Submit button is disabled and shows a busy state while a submission is in flight, preventing duplicate submissions from repeated clicks.
- **BR-22** A submission that fails validation or fails at the server never clears the form; the Requester can correct and resubmit without retyping.

### Attachments

- **BR-23** Allowed attachment types are JPG/JPEG, PNG, WEBP, and PDF. The server validates the declared content type and the file extension, and rejects any mismatch.
- **BR-24** Maximum attachment size is 5 MB per file, enforced on both client and server.
- **BR-25** A Ticket may have at most five *active* attachments. Soft-removed attachments do not count toward this limit.
- **BR-26** Attachment removal is always soft: the row is retained and marked removed, with `removedAt`, `removedReason`, and the removing Requester recorded.
- **BR-27** A removal reason is required and the user must confirm the action before it is applied.
- **BR-28** A removed attachment remains visible as metadata but cannot be downloaded or previewed. Requests for its content return a not-found style response.
- **BR-29** Removal is permitted only to the Requester who owns the parent Ticket, and only on an attachment that is currently active. Re-removing an already-removed attachment is rejected.
- **BR-30** Stored files are written under a server-generated safe name (UUID plus a validated extension) outside the web root. The original filename is kept only as display metadata and is never used as a filesystem path.
- **BR-31** Ticket creation and attachment upload are separate operations. If the Ticket is created but one or more attachments fail to upload, the Ticket is kept, the Requester is shown which files failed, and the failed files can be retried from Ticket Detail. The Ticket is never rolled back because of an attachment failure.
- **BR-32** If a file is written to disk but its metadata row cannot be created, the orphaned file is deleted so that storage and database stay consistent.

### List behavior

- **BR-33** Search is case-insensitive and matches a partial value in Ticket Number or Summary.
- **BR-34** Default sorting is Created Date descending, with Ticket Number descending as a stable secondary sort.
- **BR-35** Permitted page sizes are 10, 20, and 50; the default is 10. Page numbering starts at 1.
- **BR-36** Invalid, unknown, or out-of-range query parameters are rejected with a validation error rather than being silently replaced with defaults, so a broken client is visible instead of quietly wrong.
- **BR-37** Search and filter values are combined with AND. Clearing filters restores the unfiltered list and resets to page 1.
- **BR-38** Any change to search, filters, sorting, or page size resets pagination to page 1.

### Failure and transition

- **BR-39** When the backend or database is unavailable, the UI shows a safe error state naming the failed action and offering a retry, and never displays a stack trace, SQL text, or file path.
- **BR-40** In Lab 3, the Development Requester selector is replaced by authentication. The Requester model is designed so that credential fields can be added and the selector removed without changing the Ticket–Requester relationship or the ownership checks.

---

## 6. UI Specification Summary

Full detail lives in `docs/lab-02/ui-spec.md`. This section states the binding summary.

### Design tokens

| Token | Value | Use |
|---|---|---|
| Primary green | `#006B3C` | App header, primary buttons, strong emphasis |
| Secondary green | `#0B7A46` | Active tab, focus accent, links, hover |
| Pale green | `#EAF6EF` | Selected rows, success surfaces, subtle section emphasis |
| Page background | `#F5F7F6` | Application background |
| Surface | `#FFFFFF` | Cards and panels, subtle border, restrained shadow |
| Text | Dark charcoal-green (not pure black) | Body and label text |
| Error | Dark red | Message and border, placed directly below the field |
| Warning | Amber | Callouts and badges only, never decoration |

### Structure and components

- **Application shell:** TokTickIT identity, My Tickets and Create Ticket navigation with a clear active-page indicator, selected Requester display, Change Requester action, collapsing mobile navigation.
- **Screens:** Development Requester Selection, Create Ticket, My Tickets, Requester Ticket Detail.
- **Fields:** labels above controls; editable fields white with a neutral border; read-only fields shaded soft gray-green and clearly non-interactive; one consistent input height; Description taller and resizable only within layout bounds.
- **Required fields** carry a red asterisk, which supplements rather than replaces the validation message.
- **Buttons** carry visible text; icon-only controls carry an accessible label and tooltip; disabled controls are visually distinct and non-activatable; the Submit button shows a busy state while in flight.
- **Badges:** Requested Priority and Current Status use consistent shape, color, and text. Meaning is never carried by color alone.
- **States:** every data-bound area defines initial, loading, success, empty, no-results, validation-failure, and API-failure presentations.
- **Focus indicators** remain visible for keyboard users on all interactive elements.

### Responsive rules

| Viewport | Behavior |
|---|---|
| Desktop ≥ 992 px | Multi-column form; ticket table; content centered with a sensible maximum width |
| Tablet 768–991 px | Two-column form where practical; Summary and Description keep adequate width |
| Mobile < 768 px | Fields stack vertically; ticket list becomes cards; touch-friendly controls; no horizontal page scrolling |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names |

---

## 7. Data Changes

### Models

| Model | Purpose | Key fields |
|---|---|---|
| `RequesterUser` | Temporary Lab 2 Development Requester | `id`, `name`, `email` (unique), `isActive`, `createdAt` |
| `Category` | Ticket classification (extends Lab 1) | `id`, `name` (unique), `isActive`, `createdAt` |
| `RelatedSystem` | Affected service, application, or device | `id`, `name` (unique), `isActive`, `createdAt` |
| `Ticket` | The support request | `id`, `ticketNumber` (unique), `requesterId`, `categoryId`, `relatedSystemId`, `summary`, `description`, `requestedPriority`, `currentStatus`, `createdAt`, `updatedAt` |
| `Attachment` | File attached to a Ticket | `id`, `ticketId`, `originalFilename`, `storedFilename`, `contentType`, `fileSize`, `uploadedById`, `uploadedAt`, `isRemoved`, `removedAt`, `removedById`, `removedReason` |
| `TicketNumberSequence` | Per-year counter for Ticket Number allocation | `year` (PK), `lastNumber` |

### Enums

- `Priority`: `LOW`, `MEDIUM`, `HIGH`
- `TicketStatus`: `NEW` (Lab 2 only writes this value; later statuses are added in a later migration, not pre-declared here)

### Relationships

- `RequesterUser` 1 — N `Ticket` (required foreign key, restrict on delete)
- `Ticket` 1 — N `Attachment` (cascade on delete of the parent ticket)
- `Category` 1 — N `Ticket` (required, restrict)
- `RelatedSystem` 1 — N `Ticket` (required, restrict)
- `RequesterUser` 1 — N `Attachment` as uploader and as remover (both optional back-relations)

### Constraints and indexes

- Unique: `Ticket.ticketNumber`, `RequesterUser.email`, `Category.name`, `RelatedSystem.name`.
- Composite index on `Ticket(requesterId, createdAt DESC)` — every My Tickets query filters by owner and sorts by creation date, so this index serves the sprint's dominant read path directly.
- Index on `Ticket(ticketNumber)` (implied by uniqueness) supports search by number.
- Index on `Attachment(ticketId, isRemoved)` supports the active-attachment count check enforcing BR-25.
- Nullable: all removal fields on `Attachment`; `ticketOwnerId`, `itPriority`, and `resolutionSummary` are not introduced in this sprint.

### Justified design decision

Soft removal is represented as an `isRemoved` boolean plus `removedAt`, `removedById`, and `removedReason`, rather than as a single nullable `removedAt` timestamp. The boolean gives the five-active-attachment rule (BR-25) a cheap, indexable predicate, and keeping the reason and actor as first-class columns means the removal audit survives without a separate audit table — which the later labs' Event Log can then read from directly. The redundancy between `isRemoved` and `removedAt` is accepted deliberately and is kept consistent by writing both in a single update.

### Migration decisions

- One additive migration for the sprint. The Lab 1 `Category` table is extended with `isActive` (default `true`), so existing seeded rows remain valid.
- The seed is idempotent, implemented with `upsert` keyed on each model's unique field, and safe to run repeatedly.
- Seed contents: the four required Categories; at least six Related Systems (Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission App, Printer, Corporate Laptop); at least four active Development Requesters; at least one inactive Development Requester, which must not appear in the selector.

---

## 8. API Contract

Full request and response shapes, status codes, and error bodies are defined in `docs/lab-02/api-spec.md`. All endpoints are prefixed `/api` and return JSON. The selected Requester is transmitted as an explicit request parameter or header and is validated server-side on every call — it is never trusted as proof of identity.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check (from Lab 1) |
| GET | `/api/categories` | Active Categories |
| GET | `/api/related-systems` | Active Related Systems |
| GET | `/api/requesters` | Active Development Requesters for the selector |
| POST | `/api/tickets` | Create one validated Ticket for the selected Requester |
| GET | `/api/tickets` | Paginated list of the selected Requester's tickets, with search, filter, and sort |
| GET | `/api/tickets/:id` | One owned Ticket, including attachment metadata |
| POST | `/api/tickets/:id/attachments` | Upload one attachment to an owned Ticket (multipart) |
| GET | `/api/tickets/:id/attachments` | Attachment metadata for an owned Ticket |
| GET | `/api/attachments/:id/download` | Stream an active attachment the Requester owns |
| PATCH | `/api/attachments/:id/remove` | Soft-remove an owned active attachment with a reason |

### Query contract for `GET /api/tickets`

`search`, `categoryId`, `relatedSystemId`, `requestedPriority`, `sortBy` (`ticketNumber` \| `createdAt` \| `updatedAt`), `sortOrder` (`asc` \| `desc`), `page`, `pageSize`. Responses carry `data` plus `meta` containing `page`, `pageSize`, `totalItems`, and `totalPages`.

### Status codes

| Status | Use |
|---|---|
| 200 | Successful retrieval, download, or soft removal |
| 201 | Ticket or Attachment created |
| 400 | Invalid input, invalid query parameter, unsupported file type, missing removal reason |
| 404 | Ticket or Attachment not found, **or** owned by a different Requester, **or** already removed |
| 409 | Active-attachment limit reached, or attachment already removed |
| 413 | Uploaded file exceeds 5 MB |
| 422 | Field-level validation failure on ticket creation |
| 500 | Unexpected server error, returned as a safe generic message |

Every error response uses one shape: `{ "error": { "code": string, "message": string, "fields"?: Record<string,string> } }`.

---

## 9. Acceptance Criteria

**Requester context**

- **AC-01** Given valid Ticket data, when the Requester submits the form, then one Ticket is saved and the official Ticket Number is displayed.
- **AC-02** Given no Development Requester is selected, when the user attempts to open My Tickets, then the Requester Selection screen is shown.
- **AC-03** Given Requester B is selected, when a Ticket belonging to Requester A is requested, then the Ticket data is not returned.
- **AC-04** Given the seeded data includes an inactive Requester, when the Selection screen loads, then that Requester does not appear in the dropdown.
- **AC-05** Given a Requester is selected, when the user triggers Change Requester and selects a different Requester, then the shell shows the new name and all Requester-specific data is reloaded.
- **AC-06** Given the requesters endpoint fails, when the Selection screen loads, then a safe error state with a retry action is shown and no dropdown is rendered.
- **AC-07** Given no active Requesters exist, when the Selection screen loads, then an empty state explains that no active Requesters are available.

**Create Ticket**

- **AC-08** Given the Create Ticket screen opens at a desktop viewport, when reference data loads, then Category and Related System options come from the database and the Requester field shows the selected Development Requester as read-only.
- **AC-09** Given the Summary field is empty, when the Requester submits, then a field-level message appears next to Summary and no API call is made.
- **AC-10** Given a Summary of 9 characters, when the Requester submits, then a length validation message is shown; given 10 characters, then validation passes.
- **AC-11** Given a valid submission is in flight, when the Requester clicks Submit again, then the button is disabled and only one Ticket is created.
- **AC-12** Given a successful creation, when the response returns, then the success state shows a Ticket Number matching `TKT-<YYYY>-<NNNNNN>` and the saved Ticket in the database carries the matching `requesterId`.
- **AC-13** Given the backend is stopped, when the Requester submits, then a safe error state is shown and every entered value is preserved in the form.

**Attachments**

- **AC-14** Given a 2 MB PNG and a 7 MB PNG are selected, when the Requester submits, then the oversized file is rejected with a size message and the valid file is accepted.
- **AC-15** Given a `.txt` file is selected, when validation runs, then the file is rejected as an unsupported type before any upload is attempted.
- **AC-16** Given a Ticket already has five active attachments, when the Requester uploads another, then the request is rejected and the limit is explained.
- **AC-17** Given an active attachment on an owned Ticket, when the Requester downloads it, then the file content is returned with its original display filename.
- **AC-18** Given an active attachment, when the Requester confirms removal with a reason, then the attachment is marked removed, remains visible as metadata, and its download control is unavailable.
- **AC-19** Given a removed attachment, when its download URL is requested directly, then the request is rejected and no file content is returned.
- **AC-20** Given removal is attempted without a reason, when the Requester confirms, then the action is rejected with a validation message.
- **AC-21** Given a Ticket is created but an attachment upload fails, when the response returns, then the Ticket is retained, the Ticket Number is shown, and the failed file is reported to the Requester.

**My Tickets**

- **AC-22** Given Requester A has tickets, when My Tickets loads, then only Requester A's tickets are listed with pagination metadata.
- **AC-23** Given Requester A's list is displayed, when the user switches to Requester B, then Requester A's tickets are no longer shown.
- **AC-24** Given a search term matching a Summary substring, when the search is applied, then only matching owned tickets are returned and pagination resets to page 1.
- **AC-25** Given a Category filter is applied and no ticket matches, when the list loads, then the no-results state with a Clear Filters action is shown, distinct from the empty state.
- **AC-26** Given a Requester with no tickets at all, when My Tickets loads, then the empty state invites them to create their first ticket.
- **AC-27** Given more tickets than one page holds, when the user navigates to page 2, then the next set is returned and the active page indicator updates.
- **AC-28** Given sorting by Ticket Number ascending is selected, when the list reloads, then results are ordered accordingly and the sort indicator reflects the state.
- **AC-29** Given `pageSize=999`, when the list is requested, then the API returns a validation error rather than silently applying a default.
- **AC-35** Given the Current Status filter is set to New, when the list loads, then only tickets with status `NEW` are returned and pagination resets to page 1; given an unsupported status value, then the API returns a validation error.

**Ticket Detail and cross-cutting**

- **AC-30** Given an owned Ticket, when Ticket Detail opens, then all header fields are displayed read-only and no comment, internal note, or status control is present.
- **AC-31** Given a Ticket ID belonging to another Requester, when Ticket Detail is opened directly by URL, then access is rejected without revealing whether the Ticket exists.
- **AC-32** Given any screen at 375 px, 768 px, and 1280 px widths, when it renders, then no horizontal page scrolling, clipping, or overlap occurs and all primary actions remain reachable.
- **AC-33** Given a keyboard-only user, when they tab through Create Ticket, then every control is reachable with a visible focus indicator and the form can be submitted without a mouse.
- **AC-34** Given the database is unavailable, when any screen loads data, then a safe error message is displayed and no stack trace, SQL text, or file path is exposed.

Every Acceptance Criterion maps to at least one planned test in `docs/lab-02/tests.md`.

---

## 10. Definition of Done

### Product completion

**Implementation**
- [ ] All in-scope screens are implemented; nothing from section 3.2 has been built.
- [ ] Every Functional Requirement and Business Rule in this document is implemented or explicitly marked deferred with justification.
- [ ] Ownership is enforced in the backend on every ticket and attachment endpoint.
- [ ] Migration applies cleanly to an empty database and the seed runs twice without creating duplicates.

**Testing**
- [ ] Unit, API, UI component, UI style, responsive, and E2E tests all exist and pass from documented commands in the final `main` branch.
- [ ] Every Acceptance Criterion is linked to at least one passing test in `tests.md`.
- [ ] No test is skipped, disabled, commented out, or passing for a reason unrelated to its stated purpose.
- [ ] Failure paths are tested, not only happy paths: validation, ownership rejection, oversized and unsupported files, removed-attachment download, backend unavailable.

**UI**
- [ ] Implemented screens match `ui-spec.md` for color tokens, field states, validation placement, and button hierarchy.
- [ ] Desktop, tablet, and mobile screenshots are captured under `artifacts/lab-02/screenshots/` for Create Ticket, My Tickets, and Ticket Detail.
- [ ] The visual checklist is completed: no clipping, overlap, unintended horizontal scrolling, inconsistent field styling, or missing states.
- [ ] Loading, empty, no-results, success, validation-failure, and API-failure states are each demonstrable.

**Documentation**
- [ ] `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md` are current and consistent with the implementation.
- [ ] `README.md` setup, seed, run, and test instructions are accurate on a clean clone.
- [ ] `ai-use.md` records the LLM used, selected key prompts, and reflection.
- [ ] No secrets, `.env` files, uploaded files, or `node_modules` are committed.

### Course delivery

- [ ] Every Issue is tracked on the GitHub Project board and ends in Done.
- [ ] All work reached `lab2-staging` through peer-reviewed Pull Requests from feature branches; no direct commits to `main` or `lab2-staging`.
- [ ] Review comments received and given are recorded with responses in `docs/lab-02/reviewer.md`.
- [ ] One release Pull Request from `lab2-staging` to `main` is merged after integration testing.
- [ ] The submission PDF follows the Answer Part 1–9 format with readable screenshots and working links.

---

## 11. Assumptions and Decisions

| # | Decision | Rationale |
|---|---|---|
| D-01 | The selected Requester is stored in `localStorage` and sent to the API on each request. | Survives reload, keeps the mechanism obviously non-secure, and is trivial to delete when Lab 3 introduces real sessions. |
| D-02 | The server validates the submitted Requester on every call instead of trusting the client. | Ownership logic then remains identical when the identity source changes in Lab 3. |
| D-03 | Ticket Numbers use a per-year counter table rather than the primary key. | Produces the required human-readable format, avoids leaking row counts, and keeps allocation transactional and collision-free. |
| D-04 | `TicketStatus` declares only `NEW`. | Lab 2 excludes the status workflow; pre-declaring unused values would imply unimplemented behavior. |
| D-05 | Attachments are stored on the local filesystem with UUID filenames, with metadata in PostgreSQL. | Cloud storage is out of scope; UUID naming removes path-traversal and collision risk while original names survive as display metadata. |
| D-06 | Ticket creation and attachment upload are separate API calls. | Keeps the multipart concern out of ticket creation, makes partial failure recoverable, and lets attachments be added later from Ticket Detail. |
| D-07 | Ownership failures return 404 rather than 403. | Prevents the API from confirming that another Requester's ticket exists. |
| D-08 | Invalid query parameters return 400 rather than falling back to defaults. | A malformed request is a bug, and silent correction hides it. |
| D-09 | Priority is limited to `LOW`, `MEDIUM`, `HIGH`. | Matches the illustrative screens; an urgency tier can be added with IT Priority in a later sprint. |
| D-10 | Tickets are immutable after creation in Lab 2. | Editing is not in the stakeholder request and would require change tracking that belongs with the Event Log. |
| D-11 | Category gains `isActive` rather than being replaced. | Additive migration preserves Lab 1 seed data and keeps the reference-data pattern uniform across models. |

**Open assumptions to confirm with the stakeholder:** whether a Requester may create tickets on behalf of another person (assumed no); whether attachment previews are required in-browser or download-only (assumed download-only); whether Related System should be filterable by Category (assumed no coupling in Lab 2).

---

*Prepared with AI specification-agent assistance. Reviewed, corrected, and approved by the student, who remains responsible for the contents of this contract.*