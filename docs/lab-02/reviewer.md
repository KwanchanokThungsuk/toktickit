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
| #10 | feature/10-create-ticket-ui |  |


**feature/5-lab2-spec-contract**
Reviewer comment I received: Everything looks fine but I have a suggestion:
ui-spec.md, on topic 9.1 Layout, you might have "Current status" add to the filter bar. (so after this you should edit the api-spec.md and tests.md too.)
How I responded: I add the current status in the specification.md, ui-spec.md, tests.md,api-spec.md 

**feature/6-data-model-seed**
Reviewer comment I received: Looks good. It aligned with the Lab 2 Sprint engineering contract.
How I responded: Merged.

**feature/7-zen-green-foundation**
Reviewer comment I received: I see no problem. The test passed all correctly and the UI looks good.
How I responded: Merged.

**feature/8-requester-context**
Reviewer comment I received: The requester selector works well but I have a suggestion. According to the Lab 2 sheet, the Development Requester Selection screen must include the TokTickIT title and clearly explain that this selector is only for Lab 2 testing and is not a login/authentication screen. Currently it only says “Select Your Account,” which can make it look like a real login. Maybe you should add TokTickIT title and a short explanation that this selector is for Lab 2 testing only
How I responded: add the toktickit in the selection and the explain about is not a login/authentication screen.

**feature/9-create-ticket-api**
Reviewer comment I received:I think this still needs some changes. requesterId should come from X-Requester-Id, not the request body, according to our API spec. There are also some missing backend validations such as description length, summary max length, requested priority, active category, and active related system. Also, ticket number generation is not inside the same transaction as ticket creation.
How I responded: fixing snd merge.

## Pull Requests I reviewed for my partner
**feature/5-specification-docs**
My comment: Great work getting the engineering contract together. The ACs, test plans, and API routes all match the Lab 2 requirements perfectly.
Partner's response: Merged.