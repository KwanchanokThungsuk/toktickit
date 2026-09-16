# Lab 3 API Specification

## 1. Overview

This document defines the REST API contract for Lab 3 of TokTickIT.

Lab 3 adds authentication, role-based authorization, IT Staff ticket workflow, Public Comments, Internal Notes, and Administrator user management while preserving the Lab 2 Requester Ticket and Attachment APIs.

The backend is the security boundary. Every protected endpoint must authenticate the caller and enforce the caller's role and, where applicable, ticket ownership.

### 1.1 Roles

The system has exactly one role per User:

- `REQUESTER`
- `IT_STAFF`
- `ADMINISTRATOR`

### 1.2 Authentication mechanism

#### Assignment requirements

Lab 3 requires a secure authentication/session contract; the selected
mechanism below stores session state on the server, not in the cookie.

The server must validate protected requests, invalidate the session on
logout, reject inactive users, and never expose passwords, hashes, or
session secrets.

#### Project design choices

Authentication uses cookie-based server-side sessions. The browser receives
only an opaque session identifier; session state and secrets remain on the
server. The session cookie has `HttpOnly` enabled, `Secure` enabled in HTTPS
environments, and `SameSite=Lax`.

Sessions expire after **8 hours of inactivity**. A successful authenticated
request refreshes the inactivity deadline; an expired session is rejected
with `401` and cannot be revived. Logout invalidates the current session on
the server and clears its cookie.

Because authentication uses cookies, every state-changing request requires
a CSRF token validated by the server before mutation. The token exchange
and `X-CSRF-Token` header are defined below.

Password hashes and session secrets must never be returned to the client.
Authentication secrets must not be committed to the repository. The 8-hour
inactivity period and cookie/CSRF settings are project design decisions,
not exact values mandated by the Lab 3 sheet. They bound idle access while
supporting a normal working day; server-side storage permits logout
invalidation.

#### CSRF exchange

`GET /api/auth/csrf` returns `200` with `{ "csrfToken": "opaque-token" }`
and `Cache-Control: no-store`. Before login it establishes a
pre-authentication session with the same cookie attributes and 8-hour
inactivity expiration; it grants no
authenticated access. After login it returns a token bound to the current
server-side session. The CSRF token is intentionally client-readable and
is not the session identifier, signing secret, or an authentication credential.

The client sends `X-CSRF-Token` on every POST, PATCH, PUT, and DELETE,
including login, logout, password changes, and Attachment mutations. The
server rejects missing, invalid, or session-mismatched tokens with safe
`403` (`CSRF_INVALID`) before changing state. Successful login replaces
the pre-authentication session and rotates the token; the client fetches
a fresh token before its next mutation. Logout/expiration invalidates both
the session and its token. Requests with no valid authentication to protected
endpoints return `401` before CSRF validation. CSRF retrieval, current-user,
password change, and logout remain available during mandatory password change;
all other protected operations return `403` (`PASSWORD_CHANGE_REQUIRED`).

The server checks current account activation, role, and password-change
state on every protected request. Deactivated accounts receive `401`;
changed roles take effect immediately.

---

## 2. Authentication

### 2.1 POST `/api/auth/login`

Authenticate an active user using email and password.

#### Request

```json
{
  "email": "requester@example.com",
  "password": "InitialPassword123"
}
```

#### Success Response

```http
200 OK
```

```json
{
  "user": {
    "id": "user-id",
    "email": "requester@example.com",
    "name": "Arun Chaiyasit",
    "role": "REQUESTER",
    "mustChangePassword": true
  }
}
```

A successful login establishes the authenticated session.

If `mustChangePassword` is `true`, the client must show the mandatory Change Password flow and must not expose normal application screens until the password is changed successfully.

#### Failure

```http
401 Unauthorized
```

Invalid credentials and inactive accounts must produce a safe authentication failure without revealing whether a particular email exists.

---

### 2.2 POST `/api/auth/logout`

Invalidate the current authenticated session.

#### Authorization

Authenticated users only.

#### Success Response

```http
204 No Content
```

After logout, protected API requests using the invalidated session must fail with `401 Unauthorized`.

---

### 2.3 GET `/api/auth/me`

Return the currently authenticated user's safe identity information.

#### Authorization

Authenticated users only.

#### Success Response

```http
200 OK
```

```json
{
  "user": {
    "id": "user-id",
    "email": "requester@example.com",
    "name": "Arun Chaiyasit",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```

#### Failure

```http
401 Unauthorized
```

---

### 2.4 POST `/api/auth/change-password`

Change the authenticated user's password.

This endpoint is required when `mustChangePassword` is `true` and remains available for normal authenticated password changes.

#### Authorization

Authenticated users only.

#### Request

```json
{
  "currentPassword": "InitialPassword123",
  "newPassword": "NewPassword123"
}
```

#### Success Response

```http
200 OK
```

```json
{
  "message": "Password changed successfully.",
  "mustChangePassword": false
}
```

#### Failure

```http
400 Bad Request
```

for invalid password input, or:

```http
401 Unauthorized
```

for an invalid current password or unauthenticated request.

Password hashes must never be returned to the client and passwords must never be stored in plaintext.
Use scrypt with a unique random salt, N=32768, r=8, p=1, a 64-byte hash,
and constant-time comparison, as specified in specification.md section 6.6.
Initial, reset, and replacement passwords must contain 12–128 characters
without trimming or composition requirements (count Unicode code points); replacements must differ
from the current password. Confirmation is a UI check, not an API field.

---

## 3. Authorization Model

Authorization is enforced by the backend. Hiding or disabling a frontend control is not a security control.

### 3.1 Requester

A Requester may:

- Create Tickets.
- View and manage only Tickets they own.
- View and manage only permitted Attachments belonging to their own Tickets.
- Add Public Comments to their own Tickets.
- View Public Comments on their own Tickets.
- Indicate that a problem appears resolved for their own Ticket.
- Change their own password.
- Log out.

A Requester may not:

- Access the IT Staff Ticket Queue.
- Claim, assign, or reassign Ticket ownership.
- Change IT Priority.
- Perform IT Staff status transitions.
- Create or view Internal Notes.
- Access Administrator User Management.
- Access another Requester's Ticket or Attachment data.

### 3.2 IT Staff

An IT Staff user may:

- View the IT Staff Ticket Queue.
- Open Tickets available through the staff workflow.
- Claim, assign, or reassign Ticket ownership.
- Change IT Priority.
- Perform permitted Ticket status transitions.
- Add and view Public Comments.
- Create and view Internal Notes.
- Access permitted Attachments through the staff Ticket workflow.
- Change their own password.
- Log out.

### 3.3 Administrator

An Administrator's primary Lab 3 responsibility is User Management.

An Administrator may:

- View users.
- Search users by name or email.
- Optionally filter users by role.
- Create a user with exactly one permitted role.
- Edit a user's name, email, role, and activation state.
- Set a new initial password for a user.
- View Public Comments where the API explicitly permits Administrator read access.
- View Internal Notes where the API explicitly permits Administrator read access.
- Change IT Priority in an authorized Ticket context.
- Change their own password.
- Log out.

An Administrator does not automatically receive IT Staff Ticket-management
permissions. Claim/reassign and status changes are restricted to IT Staff.
Changing IT Priority is the explicit Lab 3 exception: an Administrator may
perform that operation in an authorized Ticket context without receiving
the Staff Queue or general IT Staff workflow permissions.

Read-only communication access does not grant an Administrator the Staff
Queue or a Staff Ticket Detail workflow.

An Administrator may not:

- Deactivate their own account.
- Deactivate or otherwise remove the last active Administrator.
- Delete users.
- Assign multiple roles to a user.

---

## 4. Requester Ticket and Attachment Continuation

Lab 3 must preserve the completed Lab 2 Requester Ticket and Attachment APIs.

The existing Lab 2 endpoint paths and request/response shapes remain unchanged unless explicitly superseded by this document. Authentication and ownership rules are added to those existing endpoints.

The Development Requester selector and client-supplied requester identity must no longer determine ownership.

### 4.1 Ticket ownership rule

For every Requester operation, the backend derives the Requester identity from the authenticated session.

A client-supplied `requesterId` must not be trusted to select another user's data.

### 4.2 GET `/api/tickets`

Return Tickets owned by the authenticated Requester.

#### Authorization

`REQUESTER`

#### Query parameters

The Lab 2 query contract remains supported, including applicable parameters such as:

- `page`
- `pageSize`
- `search`
- `categoryId`
- `relatedSystemId`
- `requestedPriority`
- `sortBy`
- `sortOrder`

#### Success Response

```http
200 OK
```

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

The backend must apply the authenticated Requester's ID to the query regardless of any client-supplied requester identifier.

### 4.3 POST `/api/tickets`

Create a Ticket for the authenticated Requester.

#### Authorization

`REQUESTER`

The submitting Requester identity is taken from the authenticated session.
The separate workflow Ticket Owner starts unassigned, and IT Priority
initially copies Requested Priority.

A client must not be able to create a Ticket owned by another Requester.

#### Success Response

```http
201 Created
```

The response follows the Lab 2 Ticket creation contract.

### 4.4 GET `/api/tickets/:id`

Return a Ticket owned by the authenticated Requester.

#### Authorization

`REQUESTER`

The backend must verify ownership before returning the Ticket.

### 4.5 Attachment APIs

All Lab 2 Attachment endpoints remain available with the same paths and response shapes.

For Requester access, the backend must verify that the authenticated Requester owns the parent Ticket before allowing Attachment upload, metadata retrieval, download, or permitted removal operations.

For staff access, Attachment operations are allowed only through the approved IT Staff Ticket workflow and must still enforce authentication and role authorization.

No Attachment operation may allow a user to bypass Ticket ownership or role restrictions.

---

## 5. IT Staff Ticket Queue

### 5.1 GET `/api/staff/tickets`

Return the IT Staff Ticket Queue.

#### Authorization

`IT_STAFF`

#### Query parameters

The endpoint supports search, suitable filters, sorting, and pagination.

Core parameters required for the Staff Queue are:

- `page`
- `pageSize`
- `search`
- `status`
- `itPriority`
- `sortBy`
- `sortOrder`

`categoryId`, `relatedSystemId`, `requestedPriority`, and `ownerId` are
optional project design choices. If implemented, the same choices must be
documented in the UI and covered by tests; they are not required merely
because this API can support them.

#### Search behavior

`search` searches Ticket number and the Ticket summary/subject field used
by the existing Lab 2 data model. The exact persisted field name is an
implementation detail.

#### Filter behavior

The required queue filters are status and IT Priority. Optional filters
are supported only when the project adopts and documents them consistently.

#### Pagination

The response includes:

- `page`
- `pageSize`
- `totalItems`
- `totalPages`

Invalid pagination, filter, or sort parameters must be rejected with a safe validation error.
Project decisions: `page` is an integer >= 1 (default 1); `pageSize` is
an integer from 1 to 100 (default 20). `sortBy` is `ticketNumber`,
`createdAt`, or `updatedAt` (default `updatedAt`); `sortOrder` is `asc` or
`desc` (default `desc`). Break ties by Ticket ID ascending. Invalid values,
including page sizes above 100, return `422`. A page beyond the last page
returns empty `items` with unchanged totals. Search is case-insensitive.
Status values follow section 6.4; IT Priority is `LOW`, `MEDIUM`, or `HIGH`.

#### Success Response

```http
200 OK
```

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

Requesters and Administrators must not use this endpoint as IT Staff.

---

## 6. IT Staff Ticket Detail and Operations

### 6.1 GET `/api/staff/tickets/:id`

Return a Ticket for the IT Staff workflow.

#### Authorization

`IT_STAFF`

The `200 OK` response must include:

- Ticket information
- Requester information
- Category
- Related System
- Requested Priority
- IT Priority
- Status
- Ticket Owner
- Attachments
- Public Comments
- Internal Notes
- the persisted Requester problem-appears-resolved indication and recorded
  time when present
- active eligible workflow-owner summaries (IT Staff and Administrator)
  needed by the IT Staff reassignment control

Internal Notes must only be included for an authorized IT Staff request.

Success is `200 OK`. A missing Ticket returns `404`; an unauthenticated
request returns `401`; and a non-IT-Staff caller returns `403`.

### 6.2 PATCH `/api/staff/tickets/:id/owner`

Claim, assign, reassign, or unassign a Ticket.

#### Authorization

`IT_STAFF`

#### Request

```json
{
  "ownerId": "user-id"
}
```

To unassign where the UI/workflow permits:

```json
{
  "ownerId": null
}
```

The selected owner must be an active `IT_STAFF` or `ADMINISTRATOR` user.
An inactive user or Requester cannot become a Ticket Owner. Eligibility as
owner does not grant an Administrator general Staff operations; IT Priority
remains separately authorized under section 6.3.

Success is `200 OK` and returns the updated Ticket owner summary. Invalid
or ineligible owners return `422`; a missing Ticket returns `404`; an
unauthenticated request returns `401`; and a non-IT-Staff caller returns
`403`.

### 6.3 PATCH `/api/staff/tickets/:id/priority`

Update IT Priority.

#### Authorization

`IT_STAFF` or `ADMINISTRATOR` in an authorized Ticket context.

#### Request

```json
{
  "itPriority": "HIGH"
}
```

Allowed values are `LOW`, `MEDIUM`, and `HIGH`, matching Lab 2 Requested Priority.

`requestedPriority` is the value submitted by the Requester and must not be modified by this endpoint.

IT Priority initially copies Requested Priority when the Ticket is created
and may later be changed by IT Staff or Administrator in an authorized
Ticket context. This exception does not grant an Administrator Staff Queue,
claim/reassign, or status-transition permissions.

Success is `200 OK` and returns the updated Ticket priority summary.
Unsupported priority values return `422`; `401`, `403`, and `404` apply
for unauthenticated, unauthorized, and missing-Ticket requests.

### 6.4 PATCH `/api/staff/tickets/:id/status`

Update Ticket status through the approved transition matrix.

#### Authorization

`IT_STAFF`

#### Request

```json
{
  "status": "IN_PROGRESS"
}
```

#### Allowed statuses

- `NEW`
- `OPEN`
- `IN_PROGRESS`
- `WAITING_FOR_REQUESTER`
- `RESOLVED`
- `CLOSED`
- `REOPENED`
- `CANCELLED`

Enforce the approved transition matrix in `specification.md` section 8.4.
The UI confirms transitions to Resolved, Closed, or Cancelled. Invalid
transitions must be rejected with a safe error.

A Requester cannot directly set a Ticket to `RESOLVED` or `CLOSED`.

Success is `200 OK` and returns the updated status. Unsupported statuses
return `422`; an invalid transition returns `409`; and `401`, `403`, and
`404` apply for unauthenticated, non-IT-Staff, and missing-Ticket requests.

---

## 7. Public Comments

Public Comments are shared communication visible to Requesters, IT Staff, and Administrators as permitted by Ticket access rules.

Both Public Comments and Internal Notes are append-only in Lab 3. Editing and deletion are excluded.

Each entry records its author and creation time from the backend.

Empty or whitespace-only content must be rejected.

### 7.1 GET `/api/tickets/:id/comments`

Retrieve Public Comments for a Ticket.

#### Authorization

- `REQUESTER`: own Ticket only.
- `IT_STAFF`: permitted staff Ticket access.
- `ADMINISTRATOR`: read access is permitted for the Administrator role.

The response must not expose comments from a Ticket that the caller is not authorized to access.

Success is `200 OK` and returns append-only comment entries containing
safe author display information, body, and backend timestamp. `401`,
`403`, and `404` apply as appropriate without leaking a Requester's
unowned Ticket.

### 7.2 POST `/api/tickets/:id/comments`

Create a Public Comment.

#### Authorization

- `REQUESTER`: own Ticket only.
- `IT_STAFF`: permitted staff Ticket access.
- `ADMINISTRATOR`: not permitted to create Public Comments.

#### Request

```json
{
  "body": "I have tested the suggested solution."
}
```

#### Rules

- `body` must be a string, non-blank, and at most 2,000 characters.
- Count Unicode code points before trimming; reject over-length input without truncation.
- The server determines the author from the authenticated session.
- The client cannot provide or override the author ID.
- The server determines the creation timestamp.
- The client cannot provide or override the creation timestamp.
- Comments are append-only.
- Comment content must be rendered safely to prevent script/injection execution.

#### Success Response

```http
201 Created
```

Blank/whitespace or over-length bodies return `422`; `401`, `403`, and
`404` apply as appropriate. The maximum is 2,000 characters for each body.

---

## 8. Internal Notes

Internal Notes are operational notes visible read-only to IT Staff and
Administrators. Only IT Staff may create them.

### 8.1 GET `/api/staff/tickets/:id/internal-notes`

Retrieve Internal Notes for a Ticket.

#### Authorization

`IT_STAFF` or `ADMINISTRATOR`

The API must not return Internal Note content to Requesters.

Success is `200 OK` and returns append-only note entries containing safe
author display information, body, and backend timestamp. An Administrator
has read-only access only; `401`, `403`, and `404` apply as appropriate.

### 8.2 POST `/api/staff/tickets/:id/internal-notes`

Create an Internal Note.

#### Authorization

`IT_STAFF`

#### Request

```json
{
  "body": "Investigated the network configuration."
}
```

#### Rules

- `body` must be a string, non-blank, and at most 2,000 characters.
- Count Unicode code points before trimming; reject over-length input without truncation.
- Notes are append-only.
- The server determines the author and timestamp.
- The client cannot spoof the author or timestamp.
- Internal Note content must never be returned to Requesters.
- Note content must be rendered safely.

#### Success Response

```http
201 Created
```

Blank/whitespace or over-length bodies return `422`; `401`, `403`, and
`404` apply as appropriate. The maximum is 2,000 characters for each body.

---

## 9. Problem Appears Resolved

### 9.1 POST `/api/tickets/:id/problem-resolved`

Allow a Requester to indicate that the reported problem appears resolved.

#### Authorization

`REQUESTER`

#### Ownership

The authenticated Requester must own the Ticket.

#### Request

```json
{}
```

#### Rules

This action persists a Requester problem-appears-resolved indication and
the backend-determined time of that indication. The storage and response
field names are implementation design choices. It does not give the
Requester permission to directly set the Ticket to `RESOLVED` or `CLOSED`,
and it does not itself change formal Ticket status.

#### Success Response

```http
200 OK
```

The response returns the Ticket's persisted resolution-indication state
and recorded time using the project's documented field names. `401`, `403`,
and `404` apply for unauthenticated, non-Requester, and missing/unowned
Ticket requests; a repeated indication is handled idempotently or as a
documented `409` business-rule conflict.

---

## 10. Administrator User Management

Administrator User Management is limited to the Lab 3 scope: list/search, create, basic edit, activation/deactivation, and initial-password management.

### 10.1 GET `/api/admin/users`

Return users for the Administrator User Management screen.

#### Authorization

`ADMINISTRATOR`

#### Query parameters

- `page`
- `pageSize`
- `search`
- `role` (optional)
- `active` (optional)
- `sortBy`
- `sortOrder`

`search` must support matching by user name or email.

Role filtering is optional. Pagination, active filtering, and sorting are
also optional project design choices; if adopted, their allowed values and
UI/test coverage must be documented consistently. They are not mandatory
Lab 3 User Management requirements.

#### Success Response

```http
200 OK
```

When pagination is adopted, the response is:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

Without pagination, the response may omit pagination metadata. Invalid
adopted query parameters return `422`; unauthenticated and
non-Administrator callers receive `401` and `403` respectively.

### 10.2 POST `/api/admin/users`

Create a user with exactly one permitted role.

#### Authorization

`ADMINISTRATOR`

#### Request

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "role": "REQUESTER",
  "initialPassword": "InitialPassword123",
  "active": true
}
```

#### Rules

- `role` must be exactly one of `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- Email must be unique.
- The email comparison must be case-insensitive after appropriate normalization.
- `active` is a boolean; it defaults to `true` and permits creating an inactive account.
- `mustChangePassword` is set to `true` when an initial password is assigned.
- The password is stored only as a secure password hash.
- The API response must never contain the plaintext password or password hash.

#### Success Response

```http
201 Created
```

Invalid input returns `422`, duplicate email returns `409`, and
unauthenticated/non-Administrator callers receive `401`/`403`. The
response returns safe user information only.

### 10.3 PATCH `/api/admin/users/:id`

Update basic user information and/or activation state.

#### Authorization

`ADMINISTRATOR`

#### Request

Any permitted subset of:

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "IT_STAFF",
  "active": true
}
```

#### Rules

- Users have exactly one role.
- Duplicate email addresses are rejected.
- Users are deactivated instead of deleted.
- An Administrator cannot deactivate their own account.
- The last active Administrator cannot be deactivated or have their role changed away from `ADMINISTRATOR`.
- Non-Administrator users cannot modify User Management data.

A business-rule conflict returns:

```http
409 Conflict
```

Success is `200 OK` and returns safe updated user information. Invalid
input returns `422`; a missing User returns `404`; unauthenticated and
non-Administrator callers receive `401` and `403` respectively.

### 10.4 PATCH `/api/admin/users/:id/password`

Set a new initial password for a user.

#### Authorization

`ADMINISTRATOR`

#### Request

```json
{
  "initialPassword": "NewInitialPassword123"
}
```

#### Rules

- The new password must satisfy the project's password validation rules.
- The password is stored only as a secure password hash.
- `mustChangePassword` is set to `true`.
- The plaintext password is not returned by the API.
- At the user's next login, normal application access remains blocked until the password is changed successfully.

#### Success Response

```http
200 OK
```

Invalid input returns `422`; a missing User returns `404`; unauthenticated
and non-Administrator callers receive `401` and `403` respectively.

---

## 11. Validation and Error Contract

Protected endpoints must distinguish the following cases:

- Unauthenticated request: `401 Unauthorized`
- Authenticated but forbidden: `403 Forbidden`
- Invalid input: `400 Bad Request` or `422 Unprocessable Entity`
- Missing resource: `404 Not Found`
- Business-rule conflict: `409 Conflict`
- Unexpected server failure: `500 Internal Server Error`

Error responses must be safe and must not expose passwords, password hashes, session secrets, or protected data belonging to another user.

For ownership-sensitive resources, return the same safe `404` for missing
and unowned Tickets/Attachments; check role restrictions before lookup so
Requester Internal Note requests return `403` regardless of existence.
Endpoint references to unowned-resource denial use this non-disclosure rule.

Use the following consistent error shape:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not authorized to perform this action."
  }
}
```

The exact error codes may be adjusted during implementation, but they must remain stable enough for frontend tests and safe for users.

---

## 12. Authentication and Security Requirements

The API must:

1. Require authentication for every protected endpoint.
2. Establish an authenticated session only after successful credential validation.
3. Reject inactive users during login.
4. Require an initial password change when `mustChangePassword` is true.
5. Invalidate the authenticated session on logout.
6. Enforce role-based authorization on the backend.
7. Derive Requester ownership from the authenticated identity, not from a client-supplied requester ID.
8. Verify Ticket ownership before Requester Ticket/Attachment operations.
9. Prevent Requesters from accessing Internal Notes.
10. Prevent unauthorized users from accessing another user's protected Ticket or Attachment data.
11. Store passwords only as secure password hashes.
12. Never return password hashes or authentication secrets to the client.
13. Prevent clients from spoofing comment/note authors or timestamps.
14. Use HttpOnly cookies, Secure in HTTPS, and SameSite=Lax; expire sessions
    after 8 hours of inactivity.
15. Validate the session-bound CSRF token on every state-changing request
    as defined in section 1.2.
16. Return safe error messages without leaking protected information.
17. Never commit real credentials, session secrets, or personal passwords to the repository.

---

## 13. Authorization Summary

| Endpoint | Requester | IT Staff | Administrator |
|---|---|---|---|
| GET `/api/auth/csrf` | Yes (also before login) | Yes | Yes |
| POST `/api/auth/login` | Yes | Yes | Yes |
| POST `/api/auth/logout` | Yes | Yes | Yes |
| GET `/api/auth/me` | Yes | Yes | Yes |
| POST `/api/auth/change-password` | Yes | Yes | Yes |
| GET `/api/tickets` | Own | No | No |
| POST `/api/tickets` | Yes | No | No |
| GET `/api/tickets/:id` | Own | No | No |
| Existing Lab 2 Attachment APIs | Own | Permitted staff workflow | No |
| GET `/api/staff/tickets` | No | Yes | No |
| GET `/api/staff/tickets/:id` | No | Yes | No |
| PATCH `/api/staff/tickets/:id/owner` | No | Yes | No |
| PATCH `/api/staff/tickets/:id/priority` | No | Yes | Yes (authorized Ticket context) |
| PATCH `/api/staff/tickets/:id/status` | No | Yes | No |
| GET `/api/tickets/:id/comments` | Own | Permitted | Yes (read) |
| POST `/api/tickets/:id/comments` | Own | Permitted | No |
| GET `/api/staff/tickets/:id/internal-notes` | No | Yes | Yes (read-only) |
| POST `/api/staff/tickets/:id/internal-notes` | No | Yes | No |
| POST `/api/tickets/:id/problem-resolved` | Own | No | No |
| GET `/api/admin/users` | No | No | Yes |
| POST `/api/admin/users` | No | No | Yes |
| PATCH `/api/admin/users/:id` | No | No | Yes |
| PATCH `/api/admin/users/:id/password` | No | No | Yes |

---

## 14. Ticket Ownership, Priority, and Status Rules

### 14.1 Ownership

- A Ticket may initially be unassigned.
- A Ticket may have zero or one primary Ticket Owner.
- The Ticket Owner must be an active IT Staff or Administrator user.
- Being eligible as Ticket Owner does not grant an Administrator Staff
  Queue, claim/reassign, or status permissions. IT Priority is separately
  granted by the explicit Lab 3 authorization rule.
- Requesters are Ticket owners in the sense of submitting/owning their own Tickets, but they are not the IT Staff workflow owner.
- Only IT Staff may claim, assign, or reassign the IT workflow owner through the staff endpoints.

### 14.2 Priority

- `requestedPriority` is the value submitted by the Requester.
- `itPriority` initially copies `requestedPriority`.
- IT Staff and Administrators may change `itPriority` in an authorized
  Ticket context. This does not grant Administrators the Staff Queue,
  claim/reassign, or status workflow.
- Changing `itPriority` must not modify `requestedPriority`.

### 14.3 Status

The required statuses are:

- `NEW`
- `OPEN`
- `IN_PROGRESS`
- `WAITING_FOR_REQUESTER`
- `RESOLVED`
- `CLOSED`
- `REOPENED`
- `CANCELLED`

The approved transition matrix is in `specification.md` section 8.4 and
must be enforced by the API. Only IT Staff may perform these transitions.

Lab 3 does not include Actions Taken; any workflow rule depending on Actions Taken is deferred to Lab 4.

---

## 15. Public Comment and Internal Note Data Rules

A Public Comment or Internal Note contains at minimum:

- `id`
- `ticketId`
- `authorId`
- `body`
- `createdAt`

The backend supplies `authorId` and `createdAt`.

Both content types are append-only in Lab 3. Editing and deletion are excluded.

Public Comment maximum: **2,000 characters**. Internal Note maximum: **2,000 characters**.
2,000 characters is sufficient for normal service-desk communication while providing a bounded payload size and predictable UI/API validation.
UI and backend validation count Unicode code points before trimming. The
API/backend must reject longer bodies with `422` and persist no entry.
The same rule applies to both types; no silent truncation is allowed.

---

## 16. Common HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 204 | Successful request with no response body |
| 400 | Invalid request |
| 401 | Authentication required or invalid credentials |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Business-rule conflict |
| 422 | Validation failure |
| 500 | Unexpected server error |

---

## 17. API Design Principles

1. Authentication and authorization are enforced by the backend.
2. The authenticated identity is the source of truth for Requester ownership.
3. Client-provided role, requester ID, owner ID, author ID, or timestamp must not be trusted without server-side validation.
4. Protected resources must not be exposed through alternate endpoints that bypass authorization.
5. Public Comments and Internal Notes must remain clearly separated by authorization rules.
6. Lab 2 Ticket and Attachment behavior must remain functional after migration.
7. API responses must contain only data the caller is authorized to receive.
8. The API contract must remain consistent with `specification.md`, `ui-spec.md`, and `tests.md`.
