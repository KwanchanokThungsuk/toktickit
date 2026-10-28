# Lab 4 — Peer Review Record

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intharathang — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#71](https://github.com/KwanchanokThungsuk/toktickit/pull/71) | feature/27-sprint4-contract-test-plan | Comment and Approved |
| [#72](https://github.com/KwanchanokThungsuk/toktickit/pull/72) | feature/28-actions-taken-foundation | Comment and Approved  |
| [#73](https://github.com/KwanchanokThungsuk/toktickit/pull/73) | feature/29-actions-taken-ui |  Comment and Approved |
| [#74](https://github.com/KwanchanokThungsuk/toktickit/pull/74) | feature/30-complete-ticket-workflow | Comment and Approved |
| [#75](https://github.com/KwanchanokThungsuk/toktickit/pull/75) | feature/31-it-staff-requester-dashboards | Comment and Approved |
| [#76](https://github.com/KwanchanokThungsuk/toktickit/pull/76) | feature/32-lab4-tests-regression | Approved |
| [#77](https://github.com/KwanchanokThungsuk/toktickit/pull/77) | feature/33-final-regression-accessibility-release |  |

**feature/27-sprint4-contract-test-plan**
PR: [#71](https://github.com/KwanchanokThungsuk/toktickit/pull/71)
- Reviewer comment I received: The Sprint 4 contract and test plan are comprehensive overall, but I found two areas that should be resolved before implementation:

    1. The Lab requires duplicate Actions caused by repeated clicks or network retries to be prevented or safely handled. AC-15/E2E currently expect equivalent retries to produce only one Action, but the API contract still makes requestKey/backend uniqueness optional and otherwise relies mainly on the pending UI state. Please define one deterministic backend retry/idempotency behavior so the API contract, AC, and tests agree.
    2. The Lab submission criteria explicitly require “append-only behavior.” The current DD-03 interprets this as applying only to Public Comments/Internal Notes, while Completed/Cancelled Actions can still have their business content edited without an audit history. Please clarify what the Lab 4 append-only requirement maps to and adjust the Action lifecycle/audit behavior accordingly.
    Minor: reviewer.md currently labels Issues #64 and #65 as PRs and contains a lab3 branch name; this should be corrected as the Lab 4 review record is built.
- How I responded: Thanks for the feedback. I addressed both issues in the Sprint 4 contract.

    1. Action creation now has deterministic backend idempotency. Every create request requires a client-generated requestKey, and the backend enforces uniqueness by Ticket, authenticated creator, and request key. The first request creates the Action with 201; a retry with the same key returns the existing Action with 200 and does not create a duplicate.
    2. The append-only behavior is now explicitly defined for Actions Taken. Draft Actions remain editable, while Completed and Cancelled Actions are terminal and immutable. Corrections or additional work must be recorded as a new Action, and there is no Action delete endpoint.I also simplified the resolution gate so it requires at least one Completed Action with a nonblank Result and no Draft Actions. Follow-Up Required remains informational and does not independently block resolution.
        The related specification, API contract, UI behavior, Acceptance Criteria, and planned tests were updated for consistency. I also corrected the Lab 4 reviewer metadata so Issues and PRs are no longer mislabeled and no Lab 3 branch references remain.

**feature/28-actions-taken-foundation**
PR: [#72](https://github.com/KwanchanokThungsuk/toktickit/pull/72)
- Reviewer comment I received: The Actions Taken backend foundation is strong overall, but I found three consistency/completion issues before approval:

    1. The Action API currently returns the raw Prisma object (safeAction returns the object unchanged), so the actual response exposes internal fields such as requestKey/foreign-key IDs and uses creator, performer, and assignee, while the approved API contract defines createdBy, performedBy, and assignedTo and excludes private implementation data. Please serialize the documented Action DTO explicitly and cover the response shape in tests.
    2. The Lab 4 required seed data calls for realistic Tickets covering the major Ticket statuses. The current clean seed only creates NEW, OPEN, and IN_PROGRESS Tickets. Please extend the seed/status coverage while keeping the existing zero/one/multiple Action fixtures.
    3. docs/lab-04/reviewer.md still links PR #64/#65 and contains feature/27-lab3-spec-contract, although the actual Lab 4 PRs are #71/#72. Please correct the review evidence.
    The migration preservation, authorization, Action lifecycle, idempotency, terminal immutability, and stale-update handling otherwise look aligned with the Lab 4 requirements.
- How I responded: Thanks for the review. I’ve addressed both requested fixes:

    - The Actions Taken API now uses an explicit DTO serializer for all GET/POST/PATCH and retry/recovery paths, exposing createdBy, performedBy, and assignedTo while hiding internal fields such as requestKey and raw foreign-key IDs.
    - The seed now covers all eight Ticket statuses while preserving the existing 0/1/multiple Action fixtures, with updated seed integration coverage.
    - fixed reveiwer.md
    I also re-ran the full local verification successfully: 17/17 test files passed and 100/100 tests passed. Build and Prisma validation also pass.

**feature/29-actions-taken-ui**
PR: [#73](https://github.com/KwanchanokThungsuk/toktickit/pull/73)
- Reviewer comment I received: The Actions Taken UI is well covered overall, but I found two consistency/recovery issues before approval:

    1. AdminTicketInspection still describes the page as “Read-only inspection”, while Lab 4 now permits Administrators to create/update Actions Taken and this PR exposes those controls. Please update the page messaging so it matches the actual Lab 4 permissions.
    2. TICKET_NOT_ACTIVE recovery is not fully connected to the real Ticket Detail state. The Actions panel preserves the local draft and refreshes the Actions list, but it does not refresh the parent Ticket status. Therefore, if another user closes/resolves/cancels the Ticket, the page can still show the stale active status while telling the user to reopen it. The component test currently simulates recovery by manually rerendering with CLOSED then OPEN, which does not represent the actual application wiring. Please refresh/synchronize the authoritative Ticket status after this conflict while preserving the Action draft.
- How I responded: Addressed both review comments.

    1. Admin messaging
        - Updated AdminTicketInspection so it no longer describes the whole page as read-only.
        - The page now clarifies that Ticket details are read-only, while Administrators can still update IT Priority and manage Actions Taken.
    2. TICKET_NOT_ACTIVE recovery
        - ActionsTakenPanel now requests an authoritative Ticket refresh from the parent when an Action mutation returns TICKET_NOT_ACTIVE.
        - The panel still preserves the current Action draft and refreshes the Actions list.
        - Staff, Admin, and Requester Ticket Detail parents now refetch the Ticket detail and pass the refreshed currentStatus back into the Actions panel.
        - While the Ticket is inactive, Actions Taken stays read-only.
        - When the Ticket is reopened and the authoritative status becomes active again, write controls are restored without losing the local draft.
    Tests were also updated to verify the real callback -> Ticket refetch -> refreshed status flow instead of relying only on manual prop rerendering.
    - Verification:
        - Full client suite: 15 files / 107 tests passed
        - Build passed
        - git diff --check passed

**feature/30-complete-ticket-workflow**
PR: [#74](https://github.com/KwanchanokThungsuk/toktickit/pull/74)
- Reviewer: The backend enforces the documented status-transition matrix, resolution gate, Requester advisory behavior, Administrator operational permissions, version-based stale-update protection, and Ticket cancellation behavior for Draft Actions. The Staff/Admin UI also exposes only permitted workflow transitions and refreshes authoritative Ticket state.
No blocking workflow issues found.
- How I responded: Merged

**feature/31-it-staff-requester-dashboards**
PR: [#75](https://github.com/KwanchanokThungsuk/toktickit/pull/75)
- Reviewer: I found a few issues in the Dashboard → Ticket flow that should be fixed before approval.

    1. Requester Recently Resolved drill-down fails
    The dashboard sends recentlyResolvedFrom/To, but MyTickets also adds the default sortBy and sortOrder. The backend rejects this combination, so the page can return 400 INVALID_QUERY.
    2. Requester filters can conflict after drill-down
    If the user enters My Tickets with statusGroup=active and then selects a specific currentStatus, both filters are kept. The backend rejects statusGroup + currentStatus.
    3. Admin cannot open Ticket Detail from the new dashboard
    Admin dashboard links use #/staff/tickets/:id, which renders StaffTicketDetail and calls GET /api/staff/tickets/:id. However, that endpoint still uses the staff-only guard, so Administrators are rejected even though the UI routes them there.
    Please normalize/clear mutually exclusive Requester filters, allow Administrator access to the operational Ticket Detail endpoint, and add tests for the full Dashboard → Ticket/List flows.

    The rest of the dashboard metrics, ownership scoping, empty/error states, and drill-down definitions look good.
- How I responded: Thanks for the review. I fixed all three Dashboard → Ticket flow issues:

    - Recently Resolved no longer sends conflicting sortBy / sortOrder.
    - Selecting a specific Requester status clears statusGroup.
    - Administrator can open operational Ticket Detail and use the related operational actions.
    I also added Dashboard → destination flow coverage and authorization regression tests.

    Verification is green:
    - Client: 133/133 tests passed
    - Server: 130/130 tests passed
    - Client/server builds passed
    - Prisma validation passed
    - git diff --check passed
    Ready for re-review.

**feature/32-lab4-tests-regression**
PR: [#76](https://github.com/KwanchanokThungsuk/toktickit/pull/76)
- Reviewer: The added tests cover the remaining Action ordering/ownership, field boundaries and no-partial-mutation behavior, terminal Action immutability, forced-password authorization, and duplicate-submit protection. The test evidence and AC traceability were also updated consistently.
The remaining browser E2E, responsive/accessibility, performance, and final release evidence are clearly documented as future Issue 33 work.
No blocking issues found. Approved.
- How I responded: Merged

**feature/33-final-regression-accessibility-release**
PR: [#77](https://github.com/KwanchanokThungsuk/toktickit/pull/77)
- Reviewer: The final regression and release evidence looks strong overall, but I found two remaining cleanup issues before approval:
    server/tests/helpers/migration-test-database.ts still hard-codes PostgreSQL executables under /Applications/Postgres.app/.... This causes the migration/seed regression tests to fail on non-macOS environments even though the README only requires PostgreSQL generally. Since this is the final regression/release PR, please make these commands portable/configurable (for example, use psql, createdb, and dropdb from PATH) or document the required environment consistently.
    docs/lab-04/reviewer.md still lists PR #71 as feature/27-lab3-spec-contract, while the actual branch was feature/27-sprint4-contract-test-plan. The PR #76 detail section is also still blank even though it is marked Approved in the summary. Please clean up the final peer-review evidence so it accurately matches the PR history.
    The E2E, responsive, accessibility, screenshot, performance, and AI-use evidence otherwise look complete and consistent.
- How I responded: Thanks for the review. I fixed the remaining cleanup items:

    Replaced the macOS-specific PostgreSQL CLI paths with PATH-resolved psql, createdb, and dropdb.
    Updated the Lab 3/4 migration regression tests to use the shared portable helper.
    Corrected the Lab 4 reviewer evidence for PR docs: define Lab 4 engineering contract and test plan #71 and PR test(lab4): complete issue 32 regression coverage #76.
    Also corrected my partner’s name in the Lab 1, Lab 2, and Lab 3 reviewer headers; those are documentation-only fixes.
    Relevant migration/seed checks, server build, Prisma validation, and git diff --check all pass.

    Please recheck PR #77.

## Pull Requests I reviewed for my partner
**feature/13-specification-docs-lab3**
PR: [#63](https://github.com/Ttime52/toktickit/pull/63)
- My comment: Please align the stale-write HTTP status mapping across specification.md, api-spec.md, ui-spec.md, and tests.md, and standardize Action terminology/field naming. Also make the client-editable Action Date/Time behavior explicit as a project design decision.
- Partner's response:
    - Align stale-write HTTP status code mappings across all files:
        - Malformed precondition -> 400 VALIDATION_ERROR
        - Missing If-Match/expectedTicketVersion -> 428 PRECONDITION_REQUIRED
        - Stale ETag/version -> 412 STALE_WRITE
        - Changed idempotency payload -> 409 IDEMPOTENCY_KEY_REUSED
    - Standardize terminology to "Action Taken" (including ActionTaken model and all 7 JSON fields).
    - Clarify actionAt behavior: editable by IT Staff/Admin, read-only for Requester. UI uses Asia/Bangkok and sends explicit UTC without auto-updating to current time on edit.
    - Add UI-to-API field mapping and update test cases to cover these behaviors and codes.
    - Resolve Administrator ambiguity to retain the existing IT Priority control.

**feature/23-actions-taken-model**
PR: [#64](https://github.com/Ttime52/toktickit/pull/64)
- My comment: Everything looks good overall. One small consistency issue remains: the spec uses TIMESTAMPTZ, while the Prisma schema/migration use TIMESTAMP(3). Please align these so the documentation matches the implementation.
- Partner's response: Already fixed the Prisma schema/migration to use the timestamptz. ple re-check.

**feature/24-actions-taken-api**
PR: [#65](https://github.com/Ttime52/toktickit/pull/65)
- My comment:
    Requesting changes because the implementation does not yet match the documented concurrency/idempotency contract.
Main blockers:
    - Idempotency-Key is optional but documented as required.
    - Ticket/Action If-Match preconditions are optional, with missing versions defaulting to current DB versions.
    - Idempotency uses a process-local Map instead of durable persistence.
    - Tests do not cover missing/malformed/stale preconditions, replay/conflict behavior, or rollback safety.
Authorization and basic create/read/update behavior look correct. The Lab 1/2 failures appear to be pre-existing baseline failures rather than regressions from this PR.
- Partner's response: Summary

    - Enforced Idempotency-Key, If-Match, and expectedTicketVersion according to the API contract
    - Added durable idempotency persistence using PostgreSQL transactions
    - Properly handled replay/conflict and stale-write scenarios (HTTP 409, 412, 428)
    - Implemented Ticket/Action ETags and optimistic concurrency control
    - Added integration tests for preconditions, replays, conflicts, and rollback safety

        Testing
        - npm run build passed
        - Lab 3/4: 39 tests passed
        - Lab 1/2: Still contains the original baseline failures as noted in the PR review

**feature/25-actions-taken-ui*
PR: [#66](https://github.com/Ttime52/toktickit/pull/66)
- My comment: The backend/setup side looks good and I was able to reproduce the fresh database setup after regenerating Prisma Client.
The remaining concerns are on the UI test coverage: stale-write recovery/idempotent retry, Staff/Admin integration, and documented validation boundaries are still not fully covered.
I’d like those tests added before approval.
- Partner's response: Added UI test coverage. pls re-check.

**feature/26-ticket-workflow**
PR: [#67](https://github.com/Ttime52/toktickit/pull/67)
- My comment: I found one remaining contract mismatch in the workflow UI.
    The Lab 4 UI spec requires the Resolved and Closed status changes to use a confirmation dialog with the required evidence, confirmation checkbox, and keyboard/focus behavior.
    The current implementation renders those controls inline in the Work Controls section instead of using the required dialog.
    Please update the Resolved/Closed workflow UI to match the documented confirmation-dialog behavior before approval.
- Partner's response: Fixed the Resolved and Closed status changes to use a confirmation dialog with the required evidence, confirmation checkbox,  and keyboard/focus behavior. Ready to re-review.

**feature/27-dashboards**
PR: [#68](https://github.com/Ttime52/toktickit/pull/68)
- My comment: Dashboard drill-down windows are not tied to the dashboard snapshot.
The dashboard captures a fixed asOf value for its metrics, but the drill-down links use relative filters such as updatedWithin=7d / resolvedWithin=7d, and the destination list recomputes the window at request time. This can cause the card count and drill-down results to disagree around the reporting boundary. The drill-down should preserve the exact server-captured window used for the dashboard metrics.
- Partner's response: Implemented the dashboard drill-down snapshot fix. Please recheck again.
