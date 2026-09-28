# Lab 3 — Peer Review Record 

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intaratung — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#51](https://github.com/KwanchanokThungsuk/toktickit/pull/51) | feature/17-lab3-spec-contract | Commented and Approved |
| [#52](https://github.com/KwanchanokThungsuk/toktickit/pull/52) | feature/18-authentication | Commented and Approved |
| [#53](https://github.com/KwanchanokThungsuk/toktickit/pull/53) | feature/19-staff-ticket-queue | Commented and Approved |
| [#54](https://github.com/KwanchanokThungsuk/toktickit/pull/54) | feature/20-staff-ticket-detail | Approved |
| [#55](https://github.com/KwanchanokThungsuk/toktickit/pull/55) | feature/21-priority-status-management | Commented and Approved |
| [#56](https://github.com/KwanchanokThungsuk/toktickit/pull/56) | feature/22-public-comment-internal-note | Approved |
| [#57](https://github.com/KwanchanokThungsuk/toktickit/pull/57) | feature/23-admin-user-management | Approved |
| [#58](https://github.com/KwanchanokThungsuk/toktickit/pull/58) | feature/24-admin-ticket-review | Approved |
| [#60](https://github.com/KwanchanokThungsuk/toktickit/pull/60) | feature/25-final-ui-e2e | Approved |
| Pending | feature/26-final-documentation | Pending peer review/approval |



**feature/17-lab3-spec-contract**
PR: [#51](https://github.com/KwanchanokThungsuk/toktickit/pull/51)
- Reviewer comment I received: Overall the Lab 3 engineering contract covers the required scope well, but I found a few inconsistencies that should be resolved before approval.
    AC-09 allows Administrator access to the Ticket Queue, while the authorization matrix and API contract explicitly restrict the Queue to IT Staff. Please make the acceptance criterion consistent with the approved authorization rules.
    The authentication contract still leaves session expiration, cookie/CSRF decisions as future implementation choices. The Lab 3 sheet requires these decisions to be defined in the API/engineering contract before implementation.
    Public Comment and Internal Note maximum lengths are referenced but not actually defined. The Lab sheet requires justified length limits to be specified.
- How I responded: fixed

**feature/18-authentication**
PR: [#52](https://github.com/KwanchanokThungsuk/toktickit/pull/52)
- Reviewer comment I received: 
    - Authentication implementation is heading in the right direction, but I found a couple of issues that should be resolved before approval:
        - App.tsx still appears to contain the old RequesterProvider / RequesterSelection flow together with the new authenticated-user flow. Lab 3 requires the Development Requester selector and Change Requester behavior to be removed completely, with Requester identity coming from the authenticated account.
        - CreateTicket.tsx still performs the ticket POST directly and does not appear to include the authenticated credentials/CSRF mechanism used by the new API helpers. Please make this consistent with the Lab 3 authentication contract.
        - Please verify that the authentication tests cover the required negative/security cases such as invalid credentials, inactive users, mandatory first-password change, logout invalidation, and authenticated Requester ownership.
- How I responded: Fixed the remaining review feedback for Issue #18.
Added Logout and enforced REQUESTER-only authorization for requester ticket/attachment APIs. 🤤

**feature/19-staff-ticket-queue**
PR: [#53](https://github.com/KwanchanokThungsuk/toktickit/pull/53)
- Reviewer comment I received: The Ticket Queue status filter does not include all Lab 3 ticket statuses. StaffTicketStatus and the Status dropdown currently only include NEW, OPEN, IN_PROGRESS, RESOLVED, and CLOSED, while Lab 3 requires WAITING_FOR_REQUESTER, REOPENED, and CANCELLED as well.
Please update the Queue status type/filter to support all required Lab 3 statuses and add/update the corresponding tests.
- How I responded: 
fixed. pls recheck jubb🫪

**feature/20-staff-ticket-detail**
PR: [#54](https://github.com/KwanchanokThungsuk/toktickit/pull/54)
- Reviewer comment I received: The ownership and Requester “Problem Appears Resolved” flows look aligned with the Lab 3 requirements, including backend authorization and negative-case coverage.
- How I responded: merge

**feature/21-staff-ticket-operations**
PR: [#55](https://github.com/KwanchanokThungsuk/toktickit/pull/55)
- Reviewer comment I received: The priority/status workflow looks aligned overall. Before approval, could you confirm that the status transition matrix implemented here matches the approved Lab 3 specification, and clarify how Administrator users can update IT Priority? The Lab 3 rules permit IT Priority changes by IT Staff or Administrator, while the current Staff Ticket Detail UI is IT Staff-only.
- How I responded: Thanks for the review. I confirmed that the implemented status transition matrix matches the approved Lab 3 specification:

    - NEW → OPEN, CANCELLED
    - OPEN → IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
    - IN_PROGRESS → WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
    - WAITING_FOR_REQUESTER → IN_PROGRESS, RESOLVED, CANCELLED
    - RESOLVED → CLOSED, REOPENED
    - CLOSED → REOPENED
    - REOPENED → IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
    - CANCELLED → REOPENED
        For Administrator access, the backend already allows both IT Staff and Administrator to update itPriority, while only IT Staff can update ticket status.

        The current Staff Ticket Detail UI is intentionally IT Staff-only. The Administrator UI/context for ticket review is planned under Issue #24, so the Admin priority action will be exposed there rather than through the current Staff-only screen.

        Therefore, the authorization is enforced on the backend in this issue, while the Administrator-facing UI is deferred to Issue #24.

**feature/22-comments-internal-notes**
PR: [#56](https://github.com/KwanchanokThungsuk/toktickit/pull/56)
- Reviewer comment I received: Public Comments and Internal Notes follow the required visibility rules, requester access to Internal Notes is protected, author/timestamp handling is backend-controlled, and the 2,000-character validation, Unicode handling, draft preservation, and responsive UI are covered with tests. Approved.
- How I responded: merged

**feature/23-admin-user-management**
PR: [#57](https://github.com/KwanchanokThungsuk/toktickit/pull/57)
- Reviewer comment I received: The create/edit user flows, role and active-status management, duplicate email protection, self-deactivation and last-active-Administrator safeguards, and initial-password reset flow are covered appropriately. Administrator routing and role-specific navigation are also aligned with the required workflow. Good job.
- How I responded: merged

**feature/24-admin-ticket-review**
PR: [#58](https://github.com/KwanchanokThungsuk/toktickit/pull/58)
- Reviewer comment I received: I see no problem here. Administrator users can inspect Ticket information, read Public Comments and Internal Notes, and update IT Priority while Staff-only actions remain unavailable. The corresponding frontend and backend permission coverage is also included.
Approved.
- How I responded: merged

**feature/25-lab3-release**
PR: [#60](https://github.com/KwanchanokThungsuk/toktickit/pull/60)
- Reviewer comment I received: Before approval, there are still a few Lab 3 evidence gaps:
    Authentication screenshot artifacts are missing.
    The current initial-password E2E only verifies that the Change Password screen appears; it does not complete the password change and verify normal application access as specified in tests.md.
- How I responded: Fixed the remaining evidence gaps:

    - Added 3 authentication screenshots.
    - Updated E2E-AUTH-04 to complete the forced-password change flow and verify normal authenticated access.
    - Verified 14/14 authenticated E2E, 16/16 responsive E2E, 3/3 accessibility E2E, 88 client tests, and TypeScript/build.

    The changes have been committed and pushed. Ready for re-review.

**feature/26-final-documentation**
- Reviewer comment I received: 
- How I responded: 

PR: Pending (no PR for this branch is present in the repository history).

Final release PR from `lab3-staging` to `main`: Pending (no merge PR is
present in the repository history).


## Pull Requests I reviewed for my partner
**feature/13-specification-docs-lab3**
PR: [#44](https://github.com/Ttime52/toktickit/pull/44)
- My comment: Create User activation state mismatch
UI Spec allows selecting Active/Inactive when creating a user, but POST /api/admin/users does not define an active request field and currently defaults to active. Please make the UI/API contract consistent.

Create User acceptance/test coverage
AC-28 currently verifies creation and one-role assignment, but does not explicitly cover the required initial password and activation state. Please update the AC and add corresponding tests/traceability.

Overall review:
I reviewed the other parts of the Lab 3 specification, API specification, UI specification, and test plan against the Lab 3 requirements. The remaining sections look consistent and cover the required functionality. I only found the two issues above that need clarification/update.
- Partner's response: thx. I will fix it.

**feature/14-user-model-migration**
PR: [#45](https://github.com/Ttime52/toktickit/pull/45)
- My comment: I found one blocking issue regarding AC-09: the PR does not include the migration-regression.integration.test.ts referenced by docs/lab-03/tests.md for MIG-01 and MIG-02.
Please add the referenced migration/seed regression test, or update the test documentation to reflect the actual test evidence. The AC-09 coverage should demonstrate preservation of existing IDs/ownership/history, Ticket and Attachment relationships, itPriority backfill, required seed data, and safe/idempotent seed reruns without duplicate dat
- Partner's response: Already add the migration.integration.test.ts. Pls recheck the PR.

**feature/15-auth-foundation**
PR: [#46](https://github.com/Ttime52/toktickit/pull/46)
- My comment: I reviewed the authentication flow and found a few things that need to be updated:

    - Requester identity
The client is still sending requesterId in the ticket/attachment flows. According to the Lab 3 spec, requester identity should come from the authenticated session and should not be provided by the client. Could you please update this flow to use the logged-in user's ID instead?
    - Legacy requester selection
The legacy requester-selection flow is still active in the client (RequesterContext, RequesterSelection, and fetchDevelopmentRequesters), and requester screens still use requesterId. Since Lab 3 replaces the Development Requester selector with authenticated identity, could you please remove or replace this flow so the requester is determined by the logged-in user?
    - Change Password validation
The Change Password UI currently says “At least 8 characters,” but the Lab 3 spec requires passwords to be 12–128 characters. Could you please update the client-side validation and displayed requirement to match the spec?
- Partner's response: fixed it. Please review again kub.

**feature/16-requester-regression**
PR: [#47](https://github.com/Ttime52/toktickit/pull/47)
- My comment: Approve — Reviewed the implementation against the Lab 3 documentation and relevant ownership, Public Comment, and Problem Appears Resolved requirements. No blocking implementation issues were found. The local regression test could not be executed because the review environment's database migration history differs from the PR branch.
- Partner's response: Thx kub

**feature/17-staff-ticket-queue**
PR: [#48](https://github.com/Ttime52/toktickit/pull/48)
- My comment: The implementation appears aligned with the documented queue requirements. I only noticed one clarification point: the PR description states 15 server tests and 6 client tests, but the current staff-queue.api.test.ts and StaffTicketQueue.test.tsx contain 3 and 2 test cases respectively. If 15/6 refers to assertions or other coverage, could you clarify the counting? Otherwise, please update the test counts.
- Partner's response: Clarified the counts. The 15 server tests and 6 client tests refer to the complete Lab 3 test run: 5 server test files / 15 cases and 4 client test files / 6 cases. Issue 5 itself adds 3 server cases in staff-queue.api.test.ts and 2 client cases in StaffTicketQueue.test.tsx.

**feature/18-staff-ticket-operations**
PR: [#49](https://github.com/Ttime52/toktickit/pull/49)
- My comment: Overall, the implementation looks good and the other reviewed parts are okay. I only found one issue with the status transition workflow:
        The specification requires CANCELLED → REOPENED to be an allowed transition, but the current implementation has CANCELLED: [].
- Partner's response: I have fixed the issue. Pls review again

**feature/19-admin-user-management**
PR: [#50](https://github.com/Ttime52/toktickit/pull/50)
- My comment: Overall, the User Management implementation looks good. I only found one confirmed issue with password validation:

    The Lab 3 specification requires the 12–128 password limit to be counted by Unicode code points, but the current implementation uses value.length in both the backend and frontend. This can incorrectly count non-BMP characters such as emoji as two characters.

    ould you please update the password validation to count Unicode code points consistently (e.g. [...value].length) and add boundary tests for Unicode passwords?
- Partner's response: I have updated the password validation. Could you pls recheck for me🐴

**feature/20-e2e-regression-qa**
PR: [#51](https://github.com/Ttime52/toktickit/pull/51)
PR: Pending (no merge PR for this branch is present in the repository history).
- My comment: MIG-01 migration regression test is currently not reproducible from a clean database.

    The test searches for a non-lab3-seed-ticket-* Ticket with an Attachment, but it does not create or load a Lab 2-shaped database before running the regression. On a clean database prepared with prisma migrate deploy + prisma:seed, the query returns null because the seeded Tickets are intentionally excluded.

    This means MIG-01 currently does not provide evidence for the documented AC-09 requirement to preserve existing Lab 2 Ticket/Attachment identities, ownership, history, and relationships.

    Please make the migration regression reproducible using an isolated Lab 2-shaped fixture/database containing pre-existing Ticket and Attachment data, then apply the Lab 3 migration chain and verify the preserved records.

    MIG-02 is already passing; this request is specifically about the missing MIG-01 migration-preservation evidence.
- Partner's response: I have fixed the MIG01 test. pls check

****
- My comment: 
- Partner's response: 
