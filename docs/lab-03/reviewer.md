# Lab 3 — Peer Review Record 

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intaratung — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #17 | feature/17-lab3-spec-contract | Commented and approved |
| #18 | feature/18-authentication | Commented and approved |
| #19 | feature/19-authorization-requester |  |
| #20 | feature/20-staff-ticket-queue |  |
| #21 | feature/21-staff-ticket-operations |  |
| #22 | feature/22-comments-internal-notes |  |
| #23 | feature/23-admin-user-management |  |
| #24 | feature/24-lab3-testing-e2e |  |
| #25 | feature/25-lab3-release |  |
| #26 |  |  |



**feature/17-lab3-spec-contract**
- Reviewer comment I received: Overall the Lab 3 engineering contract covers the required scope well, but I found a few inconsistencies that should be resolved before approval.
    AC-09 allows Administrator access to the Ticket Queue, while the authorization matrix and API contract explicitly restrict the Queue to IT Staff. Please make the acceptance criterion consistent with the approved authorization rules.
    The authentication contract still leaves session expiration, cookie/CSRF decisions as future implementation choices. The Lab 3 sheet requires these decisions to be defined in the API/engineering contract before implementation.
    Public Comment and Internal Note maximum lengths are referenced but not actually defined. The Lab sheet requires justified length limits to be specified.
- How I responded: fixed

**feature/18-authentication**
- Reviewer comment I received: 
    - Authentication implementation is heading in the right direction, but I found a couple of issues that should be resolved before approval:
        - App.tsx still appears to contain the old RequesterProvider / RequesterSelection flow together with the new authenticated-user flow. Lab 3 requires the Development Requester selector and Change Requester behavior to be removed completely, with Requester identity coming from the authenticated account.
        - CreateTicket.tsx still performs the ticket POST directly and does not appear to include the authenticated credentials/CSRF mechanism used by the new API helpers. Please make this consistent with the Lab 3 authentication contract.
        - Please verify that the authentication tests cover the required negative/security cases such as invalid credentials, inactive users, mandatory first-password change, logout invalidation, and authenticated Requester ownership.
- How I responded: Fixed the remaining review feedback for Issue #18.
Added Logout and enforced REQUESTER-only authorization for requester ticket/attachment APIs. 🤤

**feature/19-authorization-requester**
- Reviewer comment I received: The Ticket Queue status filter does not include all Lab 3 ticket statuses. StaffTicketStatus and the Status dropdown currently only include NEW, OPEN, IN_PROGRESS, RESOLVED, and CLOSED, while Lab 3 requires WAITING_FOR_REQUESTER, REOPENED, and CANCELLED as well.
Please update the Queue status type/filter to support all required Lab 3 statuses and add/update the corresponding tests.
- How I responded: 
fixed. pls recheck jubb🫪

**feature/20-staff-ticket-queue**
- Reviewer comment I received: 
- How I responded: 

**feature/21-staff-ticket-operations**
- Reviewer comment I received: 
- How I responded: 

**feature/22-comments-internal-notes**
- Reviewer comment I received: 
- How I responded: 

**feature/23-admin-user-management**
- Reviewer comment I received: 
- How I responded: 

**feature/24-lab3-testing-e2e**
- Reviewer comment I received: 
- How I responded: 

**feature/25-lab3-release**
- Reviewer comment I received: 
- How I responded: 


## Pull Requests I reviewed for my partner
**feature/13-specification-docs-lab3*
- My comment: Create User activation state mismatch
UI Spec allows selecting Active/Inactive when creating a user, but POST /api/admin/users does not define an active request field and currently defaults to active. Please make the UI/API contract consistent.

Create User acceptance/test coverage
AC-28 currently verifies creation and one-role assignment, but does not explicitly cover the required initial password and activation state. Please update the AC and add corresponding tests/traceability.

Overall review:
I reviewed the other parts of the Lab 3 specification, API specification, UI specification, and test plan against the Lab 3 requirements. The remaining sections look consistent and cover the required functionality. I only found the two issues above that need clarification/update.
- Partner's response: thx. I will fix it.

**feature/14-user-model-migration*
- My comment: I found one blocking issue regarding AC-09: the PR does not include the migration-regression.integration.test.ts referenced by docs/lab-03/tests.md for MIG-01 and MIG-02.
Please add the referenced migration/seed regression test, or update the test documentation to reflect the actual test evidence. The AC-09 coverage should demonstrate preservation of existing IDs/ownership/history, Ticket and Attachment relationships, itPriority backfill, required seed data, and safe/idempotent seed reruns without duplicate dat
- Partner's response: Already add the migration.integration.test.ts. Pls recheck the PR.

**feature/15-auth-foundation**
- My comment: I reviewed the authentication flow and found a few things that need to be updated:

    - Requester identity
The client is still sending requesterId in the ticket/attachment flows. According to the Lab 3 spec, requester identity should come from the authenticated session and should not be provided by the client. Could you please update this flow to use the logged-in user's ID instead?
    - Legacy requester selection
The legacy requester-selection flow is still active in the client (RequesterContext, RequesterSelection, and fetchDevelopmentRequesters), and requester screens still use requesterId. Since Lab 3 replaces the Development Requester selector with authenticated identity, could you please remove or replace this flow so the requester is determined by the logged-in user?
    - Change Password validation
The Change Password UI currently says “At least 8 characters,” but the Lab 3 spec requires passwords to be 12–128 characters. Could you please update the client-side validation and displayed requirement to match the spec?
- Partner's response: fixed it. Please review again kub.

****
- My comment: 
- Partner's response: 

****
- My comment: 
- Partner's response: 

****
- My comment: 
- Partner's response: 