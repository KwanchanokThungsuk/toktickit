# Lab 3 Test Plan and Traceability

## 1. Test Strategy

Lab 3 uses multiple test levels:

1. Unit tests
2. API/integration tests
3. Authorization tests
4. Client/UI tests
5. Regression tests
6. End-to-end tests
7. Responsive and visual inspection

Unit coverage within the listed server suites includes password validation
and hashing, role/ownership decisions, every status-matrix edge, and both
communication length validators. Client suites include Zen Green style,
accessibility, and feedback assertions alongside behavior checks.

Tests are written alongside implementation and mapped to Acceptance
Criteria from `specification.md`.

The final status of each test will be updated before the Lab 3 release.


## 2. Test Environment

### Server

- Node.js
- Express
- Prisma
- PostgreSQL
- Vitest
- Supertest or the existing project API test utilities

### Client

- React
- TypeScript/JavaScript according to existing project setup
- Vitest
- React Testing Library

### E2E

- Playwright


## 3. Required Server Test Files

The Lab 3 server tests are organized as:

    server/tests/lab-03/
    ├── auth.api.test.ts
    ├── authorization.api.test.ts
    ├── staff-queue.api.test.ts
    ├── staff-ticket-detail.api.test.ts
    ├── comments-notes.api.test.ts
    └── users-admin.api.test.ts

These paths follow the required Lab 3 repository structure.


## 4. Authentication Tests

File:

    server/tests/lab-03/auth.api.test.ts

### AUTH-01
Active user can log in with valid credentials.

Expected:

- 200 response
- authenticated session created
- user identity returned
- role returned

### AUTH-02
Invalid password is rejected.

Expected:

- 401
- safe error
- no session created

### AUTH-03
Unknown account is rejected.

Expected:

- 401
- safe error

### AUTH-04
Inactive user cannot log in.

Expected:

- 401
- safe error

### AUTH-05
Successful login requiring password change returns the
password-change-required state.

### AUTH-06
Current authenticated user can be retrieved.

### AUTH-07
Password change succeeds with valid current and new password.

### AUTH-08
Password change rejects incorrect current password.

### AUTH-09
Invalid replacement passwords (11 or 129 characters, or equal to current
password) return `400`; 12 and 128 characters are accepted with a valid
current password. Confirmation mismatch is tested in ChangePassword.test.tsx
because confirmation is not an API field.

### AUTH-10
Logout invalidates the authenticated session.

### AUTH-11
Protected endpoint rejects access after logout.

### AUTH-12
Password hashes are never returned through the API.

### AUTH-13
Current-user retrieval returns only safe identity fields, including role and
password-change-required state.

### AUTH-14
Cookie-based server-side sessions use HttpOnly, Secure in HTTPS environments,
and SameSite=Lax. Cookie contents are opaque identifiers, not session state.

### AUTH-15
Using a controlled clock, verify session access just before 8 hours of
inactivity, expiry at 8 hours, and `401` thereafter. A successful authenticated
request refreshes the deadline. Expired sessions cannot be revived.
The 8-hour period is a project design decision, not a Lab-sheet requirement.

### AUTH-16
Retrieve a pre-login CSRF token from `/api/auth/csrf`, log in with
`X-CSRF-Token`, then retrieve a fresh session-bound token. Missing, invalid,
old, or other-session tokens return `403` (`CSRF_INVALID`) on state-changing
requests without mutation. Cover login, logout, password changes, Ticket,
Attachment, communication, and Administrator mutations. Valid tokens allow
otherwise authorized requests. Logout invalidates the session/token pair.

### AUTH-17
Password-change-required users may retrieve current user/CSRF state, change
password, or log out; all other protected operations return `403` until a
valid replacement is saved. Deactivation invalidates access with `401`;
role changes take effect on the next protected request.

### AUTH-18
Passwords are stored as scrypt hashes with unique salts and the parameters
in specification.md section 6.6. Verify valid/invalid password comparison;
responses never expose hashes, plaintext passwords, or session secrets.
Review tracked fixtures/configuration for committed authentication secrets.


## 5. Authorization Tests

File:

    server/tests/lab-03/authorization.api.test.ts

### AUTHZ-01
Unauthenticated user cannot access protected endpoints.

### AUTHZ-02
Requester cannot access IT Staff Ticket Queue.

### AUTHZ-03
Requester cannot access Administrator User Management.

### AUTHZ-04
IT Staff cannot access Administrator User Management.

### AUTHZ-05
Administrator receives `403` for Staff Queue, Staff Ticket Detail,
claim/assign/reassign, Staff status transitions, Public Comment creation,
and Internal Note creation. An authorized Ticket context does not bypass
these denials; IT Priority remains separately permitted.

### AUTHZ-06
Requester cannot access another Requester's Ticket.

### AUTHZ-07
Requester cannot access another Requester's Attachment.

### AUTHZ-08
Requester cannot access Internal Notes.

### AUTHZ-09
Client-supplied requester identity cannot override authenticated
ownership.

### AUTHZ-10
Missing and unowned Requester Tickets/Attachments both return safe `404`.
Requester Internal Note access returns `403` before lookup regardless of
existence. Unauthorized requests reveal no protected data.

### AUTHZ-11
Unauthorized status changes are rejected.

### AUTHZ-12
Unauthorized IT Priority changes are rejected.

### AUTHZ-13
Unauthorized ownership changes are rejected.

### AUTHZ-14
Administrator has no Staff Queue, claim/reassign, or status-transition
permission merely because an Administrator can be an eligible Ticket Owner.
Administrator IT Priority access is tested separately as an explicit Lab 3
authorization rule.

### AUTHZ-15
Administrator communication access is read-only: the Administrator may not
create Public Comments or Internal Notes.


## 6. IT Staff Queue Tests

File:

    server/tests/lab-03/staff-queue.api.test.ts

### QUEUE-01
IT Staff can retrieve the Ticket Queue.

### QUEUE-02
Requester cannot retrieve the Ticket Queue.

### QUEUE-03
Search matches the documented searchable fields.

### QUEUE-04
Status filter works.

### QUEUE-05
IT Priority filter works.

### QUEUE-06
If an ownership filter is adopted in API/UI, test assigned/unassigned filtering.
Otherwise verify both ownership states display correctly without requiring a filter.

### QUEUE-07
If an owner filter is adopted in API/UI, test it; otherwise no owner-filter
control is required.

### QUEUE-08
Supported sort fields work.

### QUEUE-09
Ascending and descending sorting work.

### QUEUE-10
Default ordering is applied when no sort is supplied.

### QUEUE-11
Pagination returns correct page metadata.

### QUEUE-12
Invalid page values are rejected.

### QUEUE-13
Invalid page size values are rejected.

### QUEUE-14
Page sizes above 100 return `422`; default page size is 20. Verify sizes
1 and 100, page default 1, and empty results beyond the final page.

### QUEUE-15
Empty queue returns a valid empty result.

### QUEUE-16
Queue does not expose Internal Notes to Requesters.

### QUEUE-17
Administrator cannot retrieve the Ticket Queue: `403`, with no queue data.
Repeat with an Administrator assigned as Ticket Owner.

### QUEUE-18
Invalid status, priority, sort field, or sort direction returns `422`.
Default ordering is updatedAt descending with Ticket ID ascending ties.


## 7. IT Staff Ticket Detail Tests

File:

    server/tests/lab-03/staff-ticket-detail.api.test.ts

### DETAIL-01
IT Staff can retrieve an accessible Ticket Detail.

### DETAIL-02
IT Staff can claim an unassigned Ticket.

### DETAIL-03
Claim assigns the Ticket to the authenticated IT Staff identity.

### DETAIL-04
IT Staff can reassign a Ticket to an eligible active owner.

### DETAIL-05
Invalid/inactive owner cannot be assigned.

### DETAIL-05a
An active Administrator is an eligible Ticket Owner, while an inactive
Administrator is not.

### DETAIL-06
IT Staff can update IT Priority.

### DETAIL-07
Requested Priority remains unchanged after IT Priority update.

### ADMIN-TICKET-01
Administrator can update IT Priority on an authorized Ticket.

### ADMIN-TICKET-02
Administrator cannot modify Requested Priority when updating IT Priority.

### DETAIL-08
IT Staff can perform every permitted transition in specification.md section 8.4.

### DETAIL-09
Every transition outside specification.md section 8.4 returns `409`;
unknown status values return `422`. No Actions Taken prerequisite applies.

### DETAIL-10
Requester cannot perform IT Staff status transition.

### DETAIL-11
Requester cannot change IT Priority.

### DETAIL-12
Requester cannot change Ticket ownership.

### DETAIL-13
Requester problem-resolved indication does not directly set
Resolved or Closed.

### DETAIL-13a
Requester problem-resolved indication is persisted with a backend-determined
time and appears in IT Staff Ticket Detail workflow context.

### DETAIL-14
Existing Attachment functionality remains available in Ticket Detail.


## 8. Public Comments and Internal Notes Tests

File:

    server/tests/lab-03/comments-notes.api.test.ts

### COMMENT-01
Requester can create a Public Comment on an owned Ticket.

### COMMENT-02
IT Staff can create a Public Comment.

### COMMENT-03
Public Comments can be retrieved by permitted users.

### COMMENT-04
Blank Public Comment is rejected.

### COMMENT-05
Whitespace-only Public Comment is rejected.

### COMMENT-06
Public Comment with 2,001 characters returns `422` and creates no entry.
Exactly 2,000 non-blank characters succeeds. Count Unicode code points
before trimming, including non-ASCII cases, without truncating input.

### COMMENT-07
Comment author is determined by authenticated identity.

### COMMENT-08
Comment timestamp is determined by the backend.

### COMMENT-09
Requester cannot create Internal Notes.

### COMMENT-10
IT Staff can create Internal Notes.

### COMMENT-11
IT Staff can retrieve Internal Notes.

### COMMENT-12
Requester cannot retrieve Internal Notes.

### COMMENT-13
Blank Internal Note is rejected.

### COMMENT-14
Whitespace-only Internal Note is rejected.

### COMMENT-15
Internal Note with 2,001 characters returns `422` and creates no entry.
Exactly 2,000 non-blank characters succeeds. Count Unicode code points
before trimming, including non-ASCII cases, without truncating input.

### COMMENT-16
API preserves comment/note text without executing content; corresponding
UI tests verify HTML/script payloads render as inert text.

### COMMENT-17
Administrator can retrieve Public Comments read-only in an authorized
communication-review context, without receiving Staff workflow access.

### COMMENT-18
Administrator can retrieve Internal Notes read-only in an authorized
communication-review context, but cannot create them.

### COMMENT-19
Public Comments and Internal Notes have no edit/delete API operations;
attempts cannot change or remove entries. Note author/timestamp spoofing
cannot override backend values, as for COMMENT-07/08.

Both content types have a 2,000-character maximum.
2,000 characters is sufficient for normal service-desk communication while providing a bounded payload size and predictable UI/API validation.


## 9. Administrator User Management Tests

File:

    server/tests/lab-03/users-admin.api.test.ts

### ADMIN-01
Administrator can retrieve the User list.

### ADMIN-02
Non-Administrator cannot retrieve the User list.

### ADMIN-03
Administrator can search users by name.

### ADMIN-04
Administrator can search users by email.

### ADMIN-05
Administrator can optionally filter users by role.

### ADMIN-06
Administrator can create active or inactive users (`active` defaults true),
each with exactly one role and `mustChangePassword=true`.

### ADMIN-07
User creation requires exactly one role.

### ADMIN-08
Duplicate normalized email is rejected with `409` on create and edit.

### ADMIN-09
Invalid user input is rejected.

### ADMIN-10
Administrator can edit user name.

### ADMIN-11
Administrator can edit user email.

### ADMIN-12
Administrator can edit user role.

### ADMIN-13
Administrator can activate a user.

### ADMIN-14
Administrator can deactivate a user.

### ADMIN-15
Administrator can set a new initial password.

### ADMIN-16
User with a new initial password is required to change it at next login.

### ADMIN-17
Administrator cannot deactivate their own account.

### ADMIN-18
Administrator cannot deactivate or demote the last active Administrator;
reject with `409`, including concurrent edits that would leave none active.

### ADMIN-19
User deletion endpoint is not available.

### ADMIN-20
Multiple roles cannot be assigned to one user.


## 10. Requester Regression Tests

These tests verify that Lab 2 functionality survives the authentication
and identity migration.

### REG-01
Authenticated Requester can view My Tickets.

### REG-02
Authenticated Requester can create a Ticket.

### REG-03
Created Ticket is owned by the authenticated Requester.

### REG-04
Requester cannot create a Ticket for another Requester.

### REG-05
Requester can retrieve own Ticket Detail.

### REG-06
Requester cannot retrieve another Requester's Ticket Detail.

### REG-07
Requester can access permitted Attachments for own Tickets.

### REG-08
Requester cannot access another Requester's Attachments.

### REG-09
Existing Ticket data survives database migration.

### REG-10
Existing Attachment data survives database migration.

### REG-10a
Existing Development Requester records map to real authenticated User
accounts while preserving each migrated Requester's existing Ticket access.

### REG-11
Development Requester selector and its client-controlled identity state are removed.

### REG-12
Change Requester action is removed.

### REG-13
Migration supplies initial passwords through untracked local input, stores
hashes, and requires first-login change. Reruns preserve credentials and
Ticket/Attachment relationships. Seed reruns are idempotent and preserve
at least four active/one inactive Requesters, three active/one inactive IT
Staff, and one active Administrator, plus realistic Tickets and communications.

### REG-14
New Ticket IT Priority copies Requested Priority, with no workflow owner.
Changing IT Priority preserves Requested Priority. Migrated Tickets retain
Requested Priority and receive its value as their initial IT Priority.

Regression API/migration cases run in `server/tests/lab-03/authorization.api.test.ts`
(REG-01 through REG-10a, REG-13/14); Requester UI cases run in the existing
Lab 2 Requester component tests and authentication E2E for REG-11/12.


## 11. Client/UI Tests

Required files:

    client/.../lab-03 tests/
    ├── Login.test.tsx
    ├── ChangePassword.test.tsx
    ├── StaffTicketQueue.test.tsx
    ├── StaffTicketDetail.test.tsx
    └── UserManagement.test.tsx

The exact directory shall follow the existing client test structure.


### Login.test.tsx

Tests:

- renders login form
- validates email
- validates password
- shows loading state
- shows safe authentication failure
- handles inactive account
- redirects to Change Password when required
- redirects to application after successful login
- clears protected data and returns to Login on inactivity expiry (`401`)
- obtains/refetches CSRF token and sends it on login/logout/password mutations


### ChangePassword.test.tsx

Tests:

- renders password fields
- validates required fields
- validates confirmation and 12–128-character replacement-password boundaries
- shows saving state
- handles failure
- shows success
- continues to authenticated application after success

Existing Requester Ticket Detail component tests also verify Public Comment
2,000/2,001-character boundaries, safe rendering, resolution indication, and
absence of Internal Notes. Shared shell tests verify all three roles and
Administrator Queue denial.


### StaffTicketQueue.test.tsx

Tests:

- renders queue
- search control works
- filters work
- sorting works
- pagination works
- status badges render
- Requested Priority badge renders
- IT Priority badge renders
- owner/unassigned state renders
- opens Ticket Detail
- loading state
- empty state
- no-results state
- forbidden state
- failure state
- responsive representation


### StaffTicketDetail.test.tsx

Tests:

- renders Ticket information
- renders owner
- claim action
- reassign action
- IT Priority control
- status transition control
- Public Comments
- Internal Notes
- Attachment information
- Problem Appears Resolved indication
- persisted Requester resolution indication and backend-recorded time
- validation
- saving state
- safe failure state
- role restrictions
- both composers show a 2,000-character counter/limit; allow 2,000 and block
  2,001 characters with inline feedback; preserve drafts on backend `422`
- Public Comments and Internal Notes render script/HTML as inert text
- no edit/delete controls and no Internal Notes exposed to Requesters
- confirm Resolved/Closed/Cancelled transitions
- not-found and conflict feedback


### UserManagement.test.tsx

Tests:

- renders user list
- displays Name
- displays Email
- displays Role
- displays Status
- displays Edit action
- search by name
- search by email
- optional role filter
- create user with active/inactive selection
- one-role selection
- duplicate email validation
- edit user
- activation/deactivation
- initial password reset
- self-deactivation feedback
- last Administrator feedback
- forbidden state
- responsive layout
- Administrator communication review renders Public Comments and Internal
  Notes read-only, permits authorized IT Priority updates, and exposes no
  Queue, claim/reassign, status, or comment/note creation controls
- not-found and conflict feedback


## 12. E2E Tests

Required files:

    e2e/lab-03/
    ├── authentication.spec.ts
    ├── staff-ticket-flow.spec.ts
    └── user-administration.spec.ts


### authentication.spec.ts

Scenario:

1. Open Login.
2. Login with valid active credentials.
3. Verify authenticated user's name and role.
4. Verify role-specific navigation.
5. Logout.
6. Verify protected access is blocked.
7. Login with an initial password.
8. Verify mandatory Change Password.
9. Change password.
10. Verify normal application access.


### staff-ticket-flow.spec.ts

Scenario:

1. Login as IT Staff.
2. Open Ticket Queue.
3. Search/filter/sort Tickets.
4. Open Ticket Detail.
5. Claim an unassigned Ticket.
6. Change IT Priority.
7. Perform a permitted status transition.
8. Add Public Comment.
9. Add Internal Note.
10. Verify Internal Note is not visible to Requester.
11. Verify Attachment continuity.
12. Verify responsive layout.


### user-administration.spec.ts

Scenario:

1. Login as Administrator.
2. Open User Management.
3. Search for a User.
4. Create a new User.
5. Assign exactly one role.
6. Edit User information.
7. Deactivate a User.
8. Reactivate that User, then set a new initial password.
9. Login as that User.
10. Verify mandatory password change.
11. Log out, log back in as Administrator, and verify self-deactivation is rejected.
12. Verify last active Administrator cannot be deactivated or demoted.
13. Verify no Staff Queue navigation and direct Queue access is forbidden.
14. Verify Administrator can change authorized IT Priority but cannot claim,
    reassign, change status, or create comments/notes.


## 13. Responsive and Visual QA

Required screenshot directories:

    artifacts/lab-03/screenshots/
    ├── authentication/
    ├── staff-queue/
    ├── staff-ticket-detail/
    └── user-management/

At desktop, tablet, and mobile viewports, verify all required screens,
keyboard navigation, focus, accessible labels/feedback, Zen Green styles,
and absence of clipping, overlap, or unintended horizontal overflow.
Authentication and Administrator E2E scenarios also run at these viewports.

Screenshots should demonstrate:

### Authentication

- Login
- validation/failure
- Change Password
- authenticated shell
- role display

### Staff Queue

- desktop
- mobile
- filters/search
- empty/no-results state

### Staff Ticket Detail

- ownership
- IT Priority
- status
- comments
- Internal Notes

### User Management

- desktop
- mobile
- user list
- create/edit state
- validation


## 14. Acceptance Criteria Traceability

| AC | Test Coverage |
|---|---|
| AC-01 | AUTH-01, AUTH-14 |
| AC-02 | AUTH-02, AUTH-03 |
| AC-03 | AUTH-04 |
| AC-04 | AUTH-05, AUTH-07, AUTH-09, AUTH-17, E2E authentication |
| AC-05 | AUTH-10 |
| AC-06 | AUTH-11, AUTH-15 |
| Session/CSRF/security contract | AUTH-12 through AUTH-18 |
| Current authenticated user | AUTH-06, AUTH-13 |
| AC-07 | AUTHZ-06, REG-06 |
| AC-08 | AUTHZ-08, COMMENT-12 |
| AC-09 | QUEUE-01, QUEUE-02, QUEUE-17, AUTHZ-02, AUTHZ-05, AUTHZ-14 |
| AC-10 | ADMIN-01 |
| AC-11 | AUTHZ-03, AUTHZ-04, ADMIN-02 |
| AC-12 | REG-02, REG-03, REG-14 |
| AC-13 | AUTHZ-09, REG-04 |
| AC-14 | REG-09, REG-10a |
| AC-15 | REG-10 |
| AC-16 | QUEUE-01 |
| AC-17 | QUEUE-03 through QUEUE-11 |
| AC-18 | QUEUE-12, QUEUE-13, QUEUE-14, QUEUE-18 |
| AC-19 | DETAIL-02, DETAIL-03 |
| AC-20 | DETAIL-04, DETAIL-05, DETAIL-05a |
| AC-21 | DETAIL-06, DETAIL-07, ADMIN-TICKET-01, ADMIN-TICKET-02 |
| Administrator IT Priority authorization | ADMIN-TICKET-01, ADMIN-TICKET-02, AUTHZ-14 |
| AC-22 | DETAIL-08 |
| AC-23 | DETAIL-09 |
| AC-24 | COMMENT-01, COMMENT-02, COMMENT-07, COMMENT-08, COMMENT-17 |
| AC-25 | COMMENT-04, COMMENT-05, COMMENT-06, COMMENT-13, COMMENT-14, COMMENT-15 |
| AC-26 | COMMENT-10, COMMENT-11, COMMENT-18 |
| AC-27 | COMMENT-09, COMMENT-12 |
| Problem Appears Resolved | DETAIL-13, DETAIL-13a |
| Administrator read-only communications | AUTHZ-15, COMMENT-17, COMMENT-18 |
| Migration identity preservation | REG-09, REG-10, REG-10a, REG-11, REG-12, REG-13 |
| Append-only communications | COMMENT-19 |
| AC-28 | ADMIN-06, ADMIN-07 |
| AC-29 | ADMIN-08 |
| AC-30 | ADMIN-10 through ADMIN-14 |
| AC-31 | ADMIN-17 |
| AC-32 | ADMIN-18 |
| AC-33 | ADMIN-15, ADMIN-16 |
| AC-34 | Login.test.tsx, E2E authentication |
| AC-35 | Login.test.tsx, StaffTicketQueue.test.tsx, UserManagement.test.tsx, role-navigation E2E checks |
| AC-36 | responsive/visual QA, E2E responsive checks |


## 15. Test Status

At specification stage:

    Status: PLANNED

After implementation, each test group shall be updated with:

- actual test file path
- number of tests
- passing tests
- failing tests
- final status

Example:

| Test Group | File | Status |
|---|---|---|
| Authentication | `server/tests/lab-03/auth.api.test.ts` | Planned |
| Authorization | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| Staff Queue | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| Staff Ticket Detail | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| Comments/Notes | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| Admin | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| Login UI | `Login.test.tsx` | Planned |
| Change Password UI | `ChangePassword.test.tsx` | Planned |
| Staff Queue UI | `StaffTicketQueue.test.tsx` | Planned |
| Staff Detail UI | `StaffTicketDetail.test.tsx` | Planned |
| User Management UI | `UserManagement.test.tsx` | Planned |
| Authentication E2E | `authentication.spec.ts` | Planned |
| Staff Workflow E2E | `staff-ticket-flow.spec.ts` | Planned |
| User Administration E2E | `user-administration.spec.ts` | Planned |


## 16. Final Release Test Requirement

Before Lab 3 is considered complete:

- all server tests pass;
- all client tests pass;
- authorization tests pass;
- Requester regression tests pass;
- E2E authentication passes;
- E2E IT Staff workflow passes;
- E2E Administrator workflow passes;
- responsive/visual inspection is complete;
- final test output is collected from the `main` branch.

The final repository state is the source of truth for actual test status.
