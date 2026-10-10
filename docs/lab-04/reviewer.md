# Lab 4 — Peer Review Record

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intaratung — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#71](https://github.com/KwanchanokThungsuk/toktickit/pull/71) | feature/27-lab3-spec-contract | Comment and Approved |
| [#72](https://github.com/KwanchanokThungsuk/toktickit/pull/72) | feature/28-actions-taken-foundation | Comment and Approved  |
| [#73](https://github.com/KwanchanokThungsuk/toktickit/pull/73) | feature/29-actions-taken-ui |   |

**feature/27-lab3-spec-contract**
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
