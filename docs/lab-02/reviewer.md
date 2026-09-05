# Lab 1 — Peer Review Record  (fill this in)

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intaratung — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/5-lab2-spec-contract | Commented and approved |
| #6 | feature/6-data-model-seed | approved |
| #7 | feature/7-zen-green-foundation | approved |
| #8 | feature/8-requester-context | Commented and approved |
| #9 | feature/9-create-ticket-api | Commented and approved |
| #10 | feature/10-create-ticket-ui | Commented and approved |
| #11 | feature/11-my-tickets-api | Commented and approved |
| #12 | feature/12-my-tickets-ui | Commented and approved |
| #13 | feature/13-ticket-detail | Commented and approved |
| #14 | feature/14-attachment-lifecycle | Commented and approved |
| #15 | feature/15-final-ux-accessibility | approved |
| #16 | feature/16-final-documentation | approved |


**feature/5-lab2-spec-contract**
- Reviewer comment I received: Everything looks fine but I have a suggestion:
ui-spec.md, on topic 9.1 Layout, you might have "Current status" add to the filter bar. (so after this you should edit the api-spec.md and tests.md too.)
- How I responded: I add the current status in the specification.md, ui-spec.md, tests.md,api-spec.md 

**feature/6-data-model-seed**
- Reviewer comment I received: Looks good. It aligned with the Lab 2 Sprint engineering contract.
- How I responded: Merged.

**feature/7-zen-green-foundation**
Reviewer comment I received: I see no problem. The test passed all correctly and the UI looks good.
How I responded: Merged.

**feature/8-requester-context**
- Reviewer comment I received: The requester selector works well but I have a suggestion. According to the Lab 2 sheet, the Development Requester Selection screen must include the TokTickIT title and clearly explain that this selector is only for Lab 2 testing and is not a login/authentication screen. Currently it only says “Select Your Account,” which can make it look like a real login. Maybe you should add TokTickIT title and a short explanation that this selector is for Lab 2 testing only
- How I responded: add the toktickit in the selection and the explain about is not a login/authentication screen.

**feature/9-create-ticket-api**
- Reviewer comment I received: I think this still needs some changes. requesterId should come from X-Requester-Id, not the request body, according to our API spec. There are also some missing backend validations such as description length, summary max length, requested priority, active category, and active related system. Also, ticket number generation is not inside the same transaction as ticket creation.
- How I responded: fixing snd merge.

**feature/10-create-ticket-ui**
- Reviewer comment I received: 
    1. UI overall looks good but, there are things need to fix. The Lab 2 sheet requires attachment validation on Create Ticket, but right now the file input does not check file type, 5 MB limit, max 5 files, or show an invalid-file error, and there is no test for it. Also the View Ticket button on the success screen currently does nothing. Moreover, the ui doesnt show files that are selected in attachments.
    2. The attachment validation is fixed now, but the selected files are currently only validated and displayed in the UI. They are never uploaded after the ticket is created. There is still a TODO for uploading selectedFiles using the created ticket ID. According to the Lab 2 requirements, supporting attachments should actually be attached to the created ticket. Please complete the upload flow before merging.
    3. The upload flow is fixed now. One thing is still missing: the backend does not enforce file type, 5 MB limit, or max 5 active attachments. These are required by the Lab 2 sheet and should not rely only on frontend validation. Please add these checks and tests before merge.
- How I responded: I fixed all of the pain point that reviewer commented.

**feature/11-my-tickets-api**
- Reviewer comment I received: Everything looks good. The main requirements for search, filters, sorting, pagination, requester switching, and the different UI states are covered.
- How I responded: merge.

**feature/12-my-tickets-ui**
- Reviewer comment I received:Everything looks good. The main requirements for search, filters, sorting, pagination, requester switching, and the different UI states are covered.
- How I responded: merge.

**feature/13-ticket-detail**
- Reviewer comment I received: The ticket detail logic looks good and the ownership / 403 / 404 cases are covered, but this PR adds several .js and .jsx files even though the Lab 2 project is using TypeScript (.ts / .tsx). For example, RequesterTicketDetail.jsx and tickets.detail.get.js also import .ts files directly. Please change these new files to the TypeScript format used by the rest of the project before merging.
- How I responded: fixed

**feature/14-attachment-lifecycle**
- Reviewer comment I received: The attachment lifecycle looks good overall, but I found one thing that doesn't match the Lab 2 contract. BR-24 says the 5 MB attachment size limit must be enforced on both the client and server. The server validates it correctly, but adding an attachment from Ticket Detail currently sends the file directly to the API without checking file.size on the client first. Please add client-side attachment validation before uploading.
- How I responded: fixed

**feature/15-final-ux-accessibility**
- Reviewer comment I received: Looks good. The responsive layouts cover the required desktop, tablet, and mobile viewports. The test and screenshot look fine to me.
- How I responded: merge.

**feature/16-final-documentation**
- Reviewer comment I received: Looks great kub. The README.md file is up to date.
- How I responded: merged.


## Pull Requests I reviewed for my partner
**feature/5-specification-docs**
- My comment: Great work getting the engineering contract together. The ACs, test plans, and API routes all match the Lab 2 requirements perfectly.
- Partner's response: Merged.

**feature/6-data-model-seed**
- My comment: I've reviewed the code and ran schema.integration.test.ts locally. All tests passed successfully. The database schema, tables, and constraints are fully implemented according to the lab requirements. The seed system also perfectly satisfies AC-26. Approved! This is ready to be merged into lab2-staging.
- Partner's response: Merged.

**feature/7-requester-context**
- My comment: tested the requester selection flow, persistence, validation, error/retry handling, backend and UI tests, and responsive layout. Everything passed and looks good.
- Partner's response: Merged.

**feature/8-create-ticket**
- My comment: Reviewed & tested
    - **AC-03/04**: Active reference data and error/retry handling work correctly.
    - **AC-05/06**: Ticket creation, backend Ticket Number, UTC date, and NEW status work correctly.
    - **AC-07/08**: Validation and active Requester/Category/System checks work correctly.
    - **AC-09**: Idempotency tests passed and duplicate creation is prevented.
    - A**C-10**: Form data is preserved when the API/upload fails.
    - **AC-16/17**: Attachment type, signature, size, and 5-file limit validation work correctly.
    - **One thing to verify**: idempotency replay should still return the existing ticket with the same key/payload.
- Partner's response: I already check the idempotency replay. It really need to fix. I will work on that.

**feature/9-my-tickets**
- My comment:

    verall, the My Tickets implementation looks good and the main functionality works as expected. I tested the requester ownership filtering, search, filters, sorting, pagination, and empty states, and the tickets are correctly visible only to their corresponding requester.
    A few minor suggestions:
    - The search placeholder currently mentions only ticket number, summary, and description, while the search also supports category and related system. Consider updating the placeholder to reflect that.
    - It may be worth adding test coverage for changing page size (10/20/50), responsive behavior on mobile/tablet, and sorting when multiple tickets have the same primary sort value.
- Partner's response: fixed

**feature/10-ticket-detail-attachments**
- My comment: Tested the PR locally. All 56 tests passed, and the Ticket Detail and Attachment lifecycle flows are working as expected. The only issue I found is that View Ticket still shows “Ticket Detail is outside Issue 4” instead of navigating to the Ticket Detail page. Please update this flow; everything else looks good.
- Partner's response: fixed, Merged.

**feature/11-e2e-visual-qa**
- My comment: Tested locally. All server/client tests and builds passed, and Playwright E2E passed 9/9 across desktop, tablet, and mobile. Responsive and visual QA also look good. AC-01 to AC-26 are covered. Everything looks good to me.
- Partner's response: Merged.

**feature/12-docs-release**
- My comment: Checked the README instructions and verified the installation, database setup, application startup, tests, builds, and Playwright commands. Everything works as documented.
- Partner's response: Merged.