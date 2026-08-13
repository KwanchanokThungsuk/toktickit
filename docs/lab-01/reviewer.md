# Lab 1 — Peer Review Record  (fill this in)

**Author:** Kwanchanok Thungsuk — 67070501006 — GitHub: @KwanchanokThungsuk
**Peer reviewer:** Vera Intaratung — 67070501043 — GitHub: @Ttime52

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/1-project-foundation | Approved |
| #6 | feature/2-health-check | Commented and Approved |
|    | feature/3-category-seed |  |
|    | feature/4-category-list |  |

**feature/1-project-foundation**
Reviewer comment I received: There is no problem. Opinion: Frontend and Backend work successfully and Bootstrap is installed. No secrets committed.
How I responded: Merged.

**feature/2-health-check**
Reviewer comment I received: Supertest passed successfully (HTTP returns 200) but the frontend didn't return an error message (backend status). pls fix that
How I responded: I updated App.tsx to correctly catch the error and display the offline message, then pushed the new commit.

## Pull Requests I reviewed for my partner
**feature/1-project-foundation**
My comment: Everything looks great Both the frontend and backend work fine. I also tested it locally on both the client and server, and the results are correct. No .env files or secrets were committed.
Partner's response: Merged.

**feature/2-health-check**
My comment: The GET /api/health status has already been changed from 501 to 200, and everything else looks good according to Issue 2. I don't see any issues with your branch.
Partner's response: Merged.