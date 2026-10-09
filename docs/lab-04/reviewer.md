# Lab 4 — Peer Review Record

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intaratung — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#64](https://github.com/KwanchanokThungsuk/toktickit/pull/64) | feature/27-lab3-spec-contract | Comment and Approved |
| [#65](https://github.com/KwanchanokThungsuk/toktickit/pull/65) | feature/28-actions-taken-foundation |  |

**feature/27-lab3-spec-contract**
PR: [#64](https://github.com/KwanchanokThungsuk/toktickit/pull/64)
- Reviewer comment I received: The Sprint 4 contract and test plan are comprehensive overall, but I found two areas that should be resolved before implementation:

    1. The Lab requires duplicate Actions caused by repeated clicks or network retries to be prevented or safely handled. AC-15/E2E currently expect equivalent retries to produce only one Action, but the API contract still makes requestKey/backend uniqueness optional and otherwise relies mainly on the pending UI state. Please define one deterministic backend retry/idempotency behavior so the API contract, AC, and tests agree.
    2. The Lab submission criteria explicitly require “append-only behavior.” The current DD-03 interprets this as applying only to Public Comments/Internal Notes, while Completed/Cancelled Actions can still have their business content edited without an audit history. Please clarify what the Lab 4 append-only requirement maps to and adjust the Action lifecycle/audit behavior accordingly.
    Minor: reviewer.md currently labels Issues #64 and #65 as PRs and contains a lab3 branch name; this should be corrected as the Lab 4 review record is built.
- How I responded: Thanks for the feedback. I addressed both issues in the Sprint 4 contract.

    1. Action creation now has deterministic backend idempotency. Every create request requires a client-generated requestKey, and the backend enforces uniqueness by Ticket, authenticated creator, and request key. The first request creates the Action with 201; a retry with the same key returns the existing Action with 200 and does not create a duplicate.
    2. The append-only behavior is now explicitly defined for Actions Taken. Draft Actions remain editable, while Completed and Cancelled Actions are terminal and immutable. Corrections or additional work must be recorded as a new Action, and there is no Action delete endpoint.I also simplified the resolution gate so it requires at least one Completed Action with a nonblank Result and no Draft Actions. Follow-Up Required remains informational and does not independently block resolution.
        The related specification, API contract, UI behavior, Acceptance Criteria, and planned tests were updated for consistency. I also corrected the Lab 4 reviewer metadata so Issues and PRs are no longer mislabeled and no Lab 3 branch references remain.

**feature/28-actions-taken-foundation**
PR: [#65](https://github.com/KwanchanokThungsuk/toktickit/pull/65)
- Reviewer comment I received:
- How I responded: