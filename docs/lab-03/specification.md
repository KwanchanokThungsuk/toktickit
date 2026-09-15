# Lab 3 Engineering Specification

## 1. Sprint Goal

Lab 3 evolves TokTickIT from the Lab 2 development-requester workflow
into a real authenticated, role-based IT service desk application.

The system shall replace the temporary Development Requester selector
with authenticated user accounts and shall support three roles:
- Requester
- IT Staff
- Administrator

The existing Lab 2 Requester ticket and attachment functionality must
continue to work using the authenticated user's identity.

Lab 3 additionally introduces:
- Authentication and logout
- Mandatory first-login password change
- Server-side role-based authorization
- Authenticated Requester ownership
- IT Staff Ticket Queue
- IT Staff Ticket Detail workflow
- Ticket ownership and reassignment
- IT Priority
- Public Comments
- Internal Notes
- Administrator User Management
- Migration from Development Requester records
- Responsive Zen Green UI extensions


## 2. Stakeholder Request

The temporary Requester selector was useful for development, but the
system now needs real users.

Administrators need a simple User Management screen where they can:
- view users
- create users
- assign one role
- update basic account information
- activate or deactivate accounts
- set a new initial password

A user signing in with an initial password must change the password
before entering the normal application.

Requesters must continue using the ticket functions built in Lab 2,
but the current Requester must now come from the authenticated account.

IT Staff need a professional Ticket Queue where they can:
- find work
- open Ticket Detail
- claim or reassign Tickets
- set IT Priority
- communicate with Requesters through Public Comments
- record private Internal Notes
- update Tickets through the permitted workflow

Requesters may indicate that a problem appears resolved, but IT Staff
remain responsible for formally resolving or closing the Ticket.

Every protected API and screen must be protected according to role and
ownership. Hiding a frontend button is not considered authorization.

The Lab 2 Zen Green design language and reusable components shall
continue to be used.


## 3. Scope

### 3.1 Included

The following capabilities are included in Lab 3:
1. User authentication
2. Logout
3. Current authenticated-user retrieval
4. Mandatory first-login password change
5. Three roles: Requester, IT Staff, Administrator
6. Server-side role-based authorization
7. Authenticated Requester ownership
8. Migration from Development Requester identity
9. Continued Lab 2 Requester Ticket functionality
10. Continued Lab 2 Attachment functionality
11. IT Staff Ticket Queue
12. Ticket search, filtering, sorting, and pagination
13. IT Staff Ticket Detail
14. Ticket claim, assignment, and reassignment
15. IT Priority
16. Permitted Ticket status transitions
17. Public Comments
18. Internal Notes
19. Administrator User Management
20. User activation and deactivation
21. Setting a new initial password
22. Database migration and seed data
23. UI authorization and role-specific navigation
24. Responsive Zen Green presentation
25. Unit, API/integration, authorization, UI, regression, and E2E tests


### 3.2 Explicitly Excluded

The following are outside the scope of Lab 3:
- Email invitations
- Password-reset email
- Multi-factor authentication
- Social login
- Single sign-on
- Self-registration
- Requester-created accounts
- Actions Taken by IT Staff
- Formal SLA calculation
- Escalation rules
- Notification services
- Dashboards and KPI analytics beyond simple queue counts
- Multi-tenant organizations
- Departments and customer administration
- Production-grade deployment or cloud infrastructure changes
- Multiple roles assigned to one user
- User deletion
- Bulk user operations
- User import/export
- Account-history screens
- Extended user profiles
- Profile photos
- Email delivery of initial passwords or reset links
- Account unlocking
- Administrator approval workflows
- Advanced identity-management features
- Mandatory user-list pagination
- Multi-column user-list sorting
- Multiple simultaneous user-list filters


### 3.3 Functional Requirements

| ID | Required behavior | Acceptance criteria / rules |
|---|---|---|
| FR-01 | Authenticate active users, retrieve current user, enforce first-login change, and log out using the session contract | AC-01–AC-06; section 6 |
| FR-02 | Enforce exactly one role, role navigation, and backend ownership/authorization | AC-07–AC-11, AC-13, AC-34–AC-35 |
| FR-03 | Preserve authenticated Requester Ticket and Attachment functions and migrate Development Requesters without data loss | AC-12–AC-15; BR-26 |
| FR-04 | Provide IT Staff Queue search, filters, sorting, pagination, and Ticket Detail | AC-09, AC-16–AC-18 |
| FR-05 | Permit eligible owner assignment, authorized IT Priority changes, and Staff status transitions | AC-19–AC-23; BR-11–BR-13, BR-24–BR-25 |
| FR-06 | Provide append-only Public Comments and restricted Internal Notes with backend attribution and shared validation | AC-24–AC-27; BR-04, BR-14–BR-17 |
| FR-07 | Persist Requester Problem Appears Resolved without changing formal status | BR-05; DETAIL-13/13a in tests.md |
| FR-08 | Provide minimalist User Management and account safety protections | AC-10–AC-11, AC-28–AC-33 |
| FR-09 | Provide responsive, accessible Zen Green screens and meaningful feedback | AC-34–AC-36; sections 16–17 |

## 4. User Roles

### 4.1 Requester

A Requester may:
- authenticate
- change their password when required
- view their own Tickets
- create Tickets
- manage permitted fields of their own Tickets
- access permitted Attachments belonging to their own Tickets
- create and view Public Comments on accessible Tickets
- indicate that a reported problem appears resolved
- log out

A Requester may not:
- access another Requester's Tickets
- access another Requester's Attachments
- access Internal Notes
- access the IT Staff Ticket Queue
- assign or reassign Ticket ownership
- change IT Priority
- perform IT Staff status transitions
- access Administrator User Management


### 4.2 IT Staff

An IT Staff user may:
- authenticate
- change their password when required
- access the IT Staff Ticket Queue
- search and filter Tickets
- sort and paginate the Ticket Queue
- open Ticket Detail
- claim Tickets
- assign or reassign Ticket ownership
- update IT Priority
- perform permitted Ticket status transitions
- create and view Public Comments
- create and view Internal Notes
- access permitted Ticket Attachments
- log out

IT Staff shall not manage user accounts under the approved authorization matrix. Lab 3 keeps Ticket operations
and User Management conceptually separate.


### 4.3 Administrator

An Administrator may:
- authenticate
- change their password when required
- view users
- search users by name or email
- optionally filter users by role
- create users
- assign exactly one role
- update name
- update email
- update role
- activate or deactivate users
- set a new initial password
- log out

Administrator responsibilities are primarily limited to User Management.
Administrator has no general IT Staff workflow permissions.
Administrator communication access is read-only, with the separate explicit
Lab 3 authorization to change IT Priority in an authorized Ticket context.
It does not grant Ticket Queue, claim/reassign, or status-transition access.


## 5. Authorization Matrix

Every protected operation shall be authorized on the server.
Frontend visibility is only a user-experience mechanism and is not a
security control.

| Operation | Requester | IT Staff | Administrator |
|---|:---:|:---:|:---:|
| Login | Yes | Yes | Yes |
| Logout | Yes | Yes | Yes |
| Current User | Yes | Yes | Yes |
| Change Own Password | Yes | Yes | Yes |
| Create Ticket | Yes | No | No |
| View Own Tickets | Yes | No | No |
| Manage Own Tickets | Yes | No | No |
| Access Own Attachments | Yes | No | No |
| IT Staff Ticket Queue | No | Yes | No |
| View Staff Ticket Detail | No | Yes | No |
| Claim/Reassign Ticket | No | Yes | No |
| Change IT Priority | No | Yes | Yes (authorized Ticket context) |
| Perform Staff Status Changes | No | Yes | No |
| Create Public Comment | Yes | Yes | No |
| View Public Comments | Yes | Yes | Yes (read-only) |
| Create Internal Note | No | Yes | No |
| View Internal Notes | No | Yes | Yes (read-only) |
| Indicate Problem Appears Resolved | Yes | No | No |
| View Users | No | No | Yes |
| Create User | No | No | Yes |
| Edit User | No | No | Yes |
| Activate/Deactivate User | No | No | Yes |
| Set Initial Password | No | No | Yes |

Administrators may read Public Comments and Internal Notes in an authorized
Ticket context. They may also change IT Priority there, but this does not
grant a Staff Queue, claim/reassign, or status-transition permission.

### Authorization principles

1. Authentication is required before accessing protected resources.
2. Role authorization is enforced by the backend.
3. Requester ownership is enforced by the authenticated identity.
4. Client-supplied requester identity must not override the authenticated
   identity.
5. Protected resources belonging to another Requester must not reveal
   sensitive existence information.
6. Forbidden operations must return a safe authorization error.
7. A hidden or disabled UI control does not replace backend authorization.


## 6. Authentication Specification

### 6.1 Login

A user authenticates using:
- email
- password

Only an active user with valid credentials may authenticate.
Invalid credentials and inactive accounts shall return safe authentication
errors without exposing sensitive account information.

### 6.2 Authenticated Session

### Assignment requirements

TokTickIT will use a server-managed authenticated session.
Authentication state must be validated by the server for protected
requests, logout must invalidate it, and authentication secrets must not
be exposed to the client.

### Project design choices

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
and `X-CSRF-Token` header are defined in `api-spec.md` section 1.2.

Password hashes and session secrets must never be returned to the client.
Authentication secrets must not be committed to the repository. The 8-hour
inactivity period and cookie/CSRF settings are project design decisions,
not exact values mandated by the Lab 3 sheet. They bound idle access while
supporting a normal working day; server-side storage permits logout
invalidation.

### 6.3 Current User

The application shall provide a current-user operation that returns the
authenticated user's non-sensitive account information, including:
- user ID
- name
- email
- role
- active state where appropriate
- password-change-required state where appropriate

Passwords and password hashes must never be returned to the client.

### 6.4 Logout

Logout shall invalidate the authenticated session.
After logout:
- protected API requests shall no longer be authorized
- protected application screens shall not remain accessible through
  authenticated API access
- the user shall be returned to the Login screen

### 6.5 First-login Password Change

Every newly created or reset user must be marked as requiring a password change.
A user with this state:
1. may authenticate with the initial password;
2. must be directed to the Change Password flow;
3. cannot enter the normal application until the password is changed;
4. must provide a valid replacement password;
5. is cleared from the password-change-required state after success.

### 6.6 Password Storage

Passwords must never be stored in plaintext.
The server shall store only a secure password hash.
Project decision: use scrypt with a unique random salt per password and
parameters N=32768, r=8, p=1, deriving a 64-byte hash. Store the salt and
parameters with the hash, only on the server; use constant-time comparison.

The assignment requires a valid replacement password but does not
prescribe a particular composition rule. The project rule is 12–128 characters, without trimming or composition
requirements; count Unicode code points. A replacement must differ from the current password. Apply
this rule to initial, reset, and replacement passwords in API, UI, and
tests. This is a design choice rather than an assignment-mandated limit.


## 7. Business Rules

### BR-01 Active Authentication
Only an active user with valid credentials may authenticate.

### BR-02 Mandatory Password Change
A user marked as requiring a password change cannot enter the normal
application until a valid new password has been saved.

### BR-03 Authenticated Ownership
Requester ownership is determined by the authenticated user identity,
not by a requesterId supplied by the client.

### BR-04 Public Comments and Internal Notes
Public Comments are visible to Requesters, IT Staff, and Administrators
according to the approved access rules.
Internal Notes are visible only to IT Staff and Administrators.

### BR-05 Requester Resolution Indication
A Requester may indicate that a reported problem appears resolved,
but cannot formally change a Ticket to Resolved or Closed.
The backend must persist the indication and its backend-determined time.
The exact database/API field name is an implementation design choice.
The indication must be visible in the IT Staff Ticket Detail workflow and
does not itself change the formal Ticket status.

### BR-06 Logout
After logout, the authenticated session is invalid and protected
operations must be rejected.

### BR-07 Inactive User
An inactive user cannot authenticate.
If an existing authenticated account is deactivated, subsequent
authenticated requests must reject the session with `401`. The backend
checks current activation, role, and password-change state on every
protected request so account changes cannot leave stale permissions.

### BR-08 Unique Email
Each User email address must be unique.
Email comparison shall use a consistent normalization rule.

### BR-09 One Role
Each User has exactly one permitted role:
- Requester
- IT Staff
- Administrator

The API values are `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
Multiple roles are not supported.

### BR-10 Requester Ownership
A Requester may only access and manage Tickets and Attachments they own
through their authenticated identity.

### BR-11 Ticket Owner
A Ticket may have zero or one primary Ticket Owner.
A Ticket Owner must be an active IT Staff or Administrator account.
Eligibility to be the workflow owner does not grant Staff Queue access or
any Ticket mutation permission.
Tickets may initially be unassigned.

### BR-12 Requested Priority
Requested Priority remains the value originally submitted by the
Requester.

### BR-13 IT Priority
IT Priority initially copies Requested Priority.
After creation, IT Priority may be changed only by IT Staff or
Administrator in an authorized Ticket context.

### BR-14 Public Comments
Public Comments are append-only.
Existing comments cannot be edited or deleted in Lab 3.

### BR-15 Internal Notes
Internal Notes are append-only.
Existing notes cannot be edited or deleted in Lab 3.

### BR-16 Comment/Note Validation
Comment and Internal Note content must not be empty or whitespace-only.
Public Comments and Internal Notes each have a maximum of **2,000 characters**.
2,000 characters is sufficient for normal service-desk communication while providing a bounded payload size and predictable UI/API validation.
Count Unicode code points in the submitted body before trimming; reject
over-length bodies without truncation. UI and backend use the same rule.
Render content as text, never executable HTML or script.

### BR-17 Backend Timestamps
Comment and Internal Note author and creation time are determined by the
backend.
Clients cannot choose or override these values.

### BR-18 Administrator User Creation
An Administrator may create a User with exactly one permitted role.

### BR-19 Duplicate Email Prevention
An Administrator cannot create or update a User using an email address
already assigned to another User.

### BR-20 Administrator Self-Deactivation
An Administrator cannot deactivate their own account.

### BR-21 Last Active Administrator
The system must prevent removal, deactivation, or role demotion of the
last active Administrator account, including concurrent updates.

### BR-22 User Deactivation
Lab 3 uses account deactivation instead of user deletion.

### BR-23 Initial Password Reset
When an Administrator sets a new initial password for a User, that User
must be required to change the password at the next login.

### BR-24 IT Staff Assignment
Ticket ownership operations may only assign an eligible active account.
The final assignment target must satisfy the Ticket Owner rules.

### BR-25 Status Transition
Ticket status changes must follow the approved Lab 3 status-transition
matrix.
Invalid transitions must be rejected by the backend.

### BR-26 Regression
Existing Lab 2 Requester Ticket and Attachment functionality must remain
available after migration, but the temporary Development Requester
selector and client-controlled Requester identity must no longer be
used.


## 8. Ticket Ownership, Priority, and Status

### 8.1 Ticket Owner
Each Ticket has:
- zero or one primary Ticket Owner
- an eligible active IT Staff or Administrator owner when assigned

A Ticket may remain unassigned.
Only IT Staff may access the Staff Queue or claim, assign, reassign, or
change status. IT Staff and Administrators may change IT Priority in an
authorized Ticket context. This explicit Administrator authorization is
separate from general IT Staff workflow permissions.

### 8.2 Priority
Two priority values are maintained:
- Requested Priority
- IT Priority

Requested Priority represents the Requester's original requested level.
IT Priority initially copies Requested Priority and may subsequently be
changed by IT Staff or Administrator in an authorized Ticket context.

### 8.3 Required Statuses
Lab 3 supports the following Ticket statuses:
- New
- Open
- In Progress
- Waiting for Requester
- Resolved
- Closed
- Reopened
- Cancelled

### 8.4 Approved Status Transition Matrix
The following matrix is the approved Lab 3 project decision.

| Current Status | Allowed Next Status | Role |
|---|---|---|
| New | Open, Cancelled | IT Staff |
| Open | In Progress, Waiting for Requester, Cancelled | IT Staff |
| In Progress | Waiting for Requester, Resolved, Cancelled | IT Staff |
| Waiting for Requester | In Progress, Resolved, Cancelled | IT Staff |
| Resolved | Closed, Reopened | IT Staff |
| Closed | Reopened | IT Staff |
| Reopened | In Progress, Waiting for Requester, Cancelled | IT Staff |
| Cancelled | Reopened | IT Staff |

Requester:
- cannot formally set Resolved
- cannot formally set Closed
- may only indicate that the problem appears resolved

### 8.5 Status Validation
The server shall reject:
- unsupported statuses
- invalid transitions
- transitions performed by unauthorized roles

The UI requires confirmation before Resolved, Closed, or Cancelled transitions.
The UI shall only present permitted transitions, but the backend remains
the final enforcement point.
Actions Taken by IT Staff are not part of Lab 3 and shall not be used as
a prerequisite for resolving a Ticket.


## 9. Public Comments and Internal Notes

### 9.1 Public Comments
Public Comments provide communication shared between the Requester and
IT Staff.
They are:
- append-only
- associated with one Ticket
- associated with one author
- timestamped by the backend
- visible to permitted users

### 9.2 Internal Notes
Internal Notes are operational notes for staff use.
They are:
- append-only
- associated with one Ticket
- associated with one author
- timestamped by the backend
- restricted to IT Staff and Administrator visibility

Requesters must never receive Internal Note content.
Administrators may view Internal Notes read-only in the authorized
communication-review context. They cannot create, edit, delete, or use
notes to change a Ticket workflow state.

### 9.3 Validation
Both comment types:
- reject empty content
- reject whitespace-only content
- enforce a maximum of 2,000 characters for each Public Comment and Internal Note
- render user content safely
- do not interpret submitted content as executable HTML or script


## 10. Database Changes

The Lab 2 PostgreSQL and Prisma data model shall be evolved without
discarding existing Ticket or Attachment data.

The database must support:
- real Users
- credentials
- roles
- account activation state
- password-change-required state
- Ticket ownership
- IT Priority
- Public Comments
- Internal Notes
- required Ticket workflow fields
- a persisted Requester problem-appears-resolved indication

### 10.1 User
A User shall conceptually contain:
- id
- name
- email
- password hash
- role
- active/inactive state
- password-change-required state
- created timestamp
- updated timestamp

The exact field names and Prisma types will be defined in the database
implementation.

### 10.2 Relationships
The data model shall support:
- one User has one role
- one Requester may own many submitted Tickets
- one Ticket has zero or one primary Ticket Owner
- one Ticket has many Public Comments
- one Ticket has many Internal Notes
- each Comment has one author
- each Internal Note has one author
- a Ticket may record a Requester's problem-appears-resolved indication
  and its backend-determined time

Existing:
- Categories
- Related Systems
- Tickets
- Attachments
must remain valid after migration.


## 11. Migration from Lab 2

The temporary Lab 2 Development Requester identity must be migrated to
the real User model.

Migration requirements:
1. Existing Requester records must become or map to real User accounts.
2. Existing Ticket ownership must remain correct.
3. Existing Attachment relationships must remain valid.
4. Existing Tickets must not be discarded.
5. Existing Attachments must not be discarded. Preserve Requested Priority;
   initialize IT Priority from it and leave the new workflow owner unassigned.
6. The local migration operator supplies per-user initial passwords through
   untracked local input, hashes them using section 6.6, and sets
   `mustChangePassword=true`. Credentials are shared locally outside the
   repository; reruns preserve existing hashes and password-change state.
7. The temporary Development Requester selector must be removed.
8. Client-side state that previously controlled Requester identity must
   no longer determine ownership.
9. Regression tests must verify that migrated Requesters retain access
   to their own existing Tickets.
10. Regression tests must verify that migrated Requesters cannot access
    another Requester's Tickets.

The migration must be repeatable or otherwise safely documented for the
development environment.


## 12. Seed Data

The Lab 3 seed process must remain idempotent.
Minimum seed data:
- at least 4 active Requester accounts
- at least 1 inactive Requester account
- at least 3 active IT Staff accounts
- at least 1 inactive IT Staff account
- at least 1 active Administrator account
- realistic Tickets distributed across Requesters
- multiple Ticket statuses
- multiple priorities
- assigned and unassigned Tickets
- example Public Comments
- example Internal Notes

Seeded credentials are for local development only.
No real personal passwords or secrets may be committed to the repository.


## 13. REST API Requirements

The API specification will define the exact paths, HTTP methods,
request/response schemas, status codes, authentication behavior,
validation rules, and safe error responses.

The API must support:

### Authentication
- login
- logout
- current authenticated user
- mandatory password change

### Requester
- authenticated continuation of Lab 2 Ticket APIs
- authenticated continuation of Lab 2 Attachment APIs
- authenticated ownership enforcement
- Public Comments
- problem-appears-resolved indication

### IT Staff
- Ticket Queue
- search
- filtering
- sorting
- pagination
- Ticket Detail
- claim
- assign/reassign
- IT Priority
- permitted status changes
- Public Comments
- Internal Notes

### Administrator
- User list
- search by name/email
- optional role filter
- create User
- update User
- activate/deactivate User
- set new initial password


## 14. API Authorization and Safe Errors

Protected API operations must distinguish between:
- unauthenticated access
- authenticated but forbidden access
- invalid input
- missing resources
- conflicts
- unexpected server errors

The API must not leak whether another user's protected Ticket,
Attachment, or Internal Note exists.

Example error categories:

| Situation | Expected behavior |
|---|---|
| No authentication | Unauthorized response |
| Wrong role | Forbidden response |
| Invalid input | Validation response |
| Duplicate email | Conflict response |
| Missing accessible resource | Not-found or safe equivalent |
| Unexpected server failure | Generic safe server error |

The API must not expose:
- password hashes
- authentication secrets
- session secrets
- internal database details
- stack traces
- sensitive information about another user's resources


## 15. IT Staff Ticket Queue

The IT Staff Ticket Queue shall support:
- Ticket search
- suitable filters
- sorting
- pagination
- assigned/unassigned ownership
- status information
- Requested Priority
- IT Priority
- opening Ticket Detail

### Project Decision
The queue will support searching by appropriate Ticket identifiers and
text fields defined in `api-spec.md`.
The queue will support filters for relevant workflow fields such as:
- status
- ownership
- priority

The exact searchable and sortable fields, default ordering, and page
sizes shall be documented in `api-spec.md`.
Invalid query parameters must be rejected safely.


## 16. UI Specification

Lab 3 shall continue the Zen Green design language established in Lab 2.
The application shell shall:
- display the authenticated user's name
- display the authenticated user's role
- provide Logout
- provide permitted password actions
- show role-specific navigation
- avoid presenting unauthorized destinations
- use consistent badges
- preserve editable/read-only field styling
- reuse existing form and card conventions
- remain responsive

### 16.1 Required Screens

#### Login
Must support:
- email
- password
- validation
- loading state
- invalid credentials
- inactive account handling
- safe failure feedback

#### Change Password
Must support:
- current/initial password handling as appropriate
- new password
- password confirmation
- validation
- saving state
- success feedback
- failure feedback

The user cannot enter the normal application until a required password
change succeeds.

#### Requester
Existing Lab 2 Requester functionality shall continue without the
Development Requester selector.
The Requester shall see:
- authenticated identity
- My Tickets
- Ticket Detail
- Public Comments
- problem-appears-resolved action where applicable

#### IT Staff Ticket Queue
Must support:
- realistic queue data
- search
- filters
- sorting
- pagination
- assigned/unassigned state
- status badges
- Requested Priority badges
- IT Priority badges
- open-detail action
- loading state
- empty state
- no-results state
- failure state
- responsive layout

#### IT Staff Ticket Detail
Must support:
- Ticket information
- ownership
- claim/reassign
- IT Priority
- permitted status changes
- Public Comments
- Internal Notes
- Attachment continuity
- Requester resolution indication
- validation
- safe failure feedback

#### Administrator User Management
Must support:
- user list
- Name
- Email
- Role
- Status
- Edit action
- search by name/email
- optional role filter
- create user
- one role selection
- initial password
- duplicate-email validation
- invalid-input validation
- edit name
- edit email
- edit role
- activation/deactivation
- set new initial password
- required password change at next login
- self-deactivation prevention
- last-active-Administrator protection
- forbidden access for non-Administrators


## 17. UI States and Accessibility

Meaningful screens must provide:
- loading
- saving
- success
- validation
- empty
- no results
- forbidden
- not found
- conflict
- safe failure

The application shall remain usable on:
- desktop
- tablet
- mobile

Existing Lab 2 accessibility and responsive conventions shall be reused.


## 18. Acceptance Criteria

### Authentication
#### AC-01
Given an active user with valid credentials,
when the user logs in,
then an authenticated session is established.

#### AC-02
Given invalid credentials,
when the user attempts to log in,
then authentication fails with a safe error.

#### AC-03
Given an inactive user,
when the user attempts to log in,
then authentication is rejected.

#### AC-04
Given a user who must change their initial password,
when the user logs in,
then the user cannot access the normal application until the password
is changed.

#### AC-05
Given an authenticated user,
when the user logs out,
then the authenticated session is invalidated.

#### AC-06
Given a logged-out user,
when the user accesses a protected resource,
then the request is rejected.


### Authorization
#### AC-07
Given a Requester,
when the Requester accesses another user's Ticket,
then the request is rejected.

#### AC-08
Given a Requester,
when the Requester attempts to access an Internal Note,
then the request is rejected.

#### AC-09
Given an authenticated IT Staff user,
when the user accesses the Ticket Queue,
then the queue is available.

Given an authenticated Requester or Administrator,
when the user accesses the Ticket Queue,
then access is denied.

#### AC-10
Given an Administrator,
when the user accesses User Management,
then the user-management functionality is available.

#### AC-11
Given a non-Administrator,
when the user accesses an Administrator-only endpoint,
then the request is rejected by the backend.


### Requester Regression
#### AC-12
Given an authenticated Requester,
when the Requester creates a Ticket,
then the submitting Requester is determined from the authenticated identity,
IT Priority copies Requested Priority, and the workflow Ticket Owner is unassigned.

#### AC-13
Given an authenticated Requester,
when the Requester attempts to submit another user's identity,
then the server ignores/rejects the client-supplied identity and preserves
authenticated ownership.

#### AC-14
Given an existing Lab 2 Ticket,
when the migration is completed,
then its Requester ownership remains correct.

#### AC-15
Given an existing Lab 2 Attachment,
when the migration is completed,
then its Ticket relationship remains valid.


### IT Staff Queue
#### AC-16
Given an authenticated IT Staff user,
when the user opens the Ticket Queue,
then realistic Tickets are displayed.

#### AC-17
Given queue search/filter/sort parameters,
when the request is valid,
then matching results are returned with pagination metadata.

#### AC-18
Given invalid queue parameters,
when the request is submitted,
then the API returns a safe validation error.


### IT Staff Ticket Detail
#### AC-19
Given an IT Staff user and an unassigned Ticket,
when the user claims the Ticket,
then the Ticket becomes assigned to the authenticated IT Staff user.

#### AC-20
Given an IT Staff user,
when the user reassigns a Ticket,
then the Ticket owner changes to an eligible active owner.

#### AC-21
Given an IT Staff user or Administrator with an authorized Ticket context,
when the user changes IT Priority,
then IT Priority is updated while Requested Priority remains unchanged.

#### AC-22
Given an IT Staff user,
when the user attempts a permitted status transition,
then the status is updated.

#### AC-23
Given an IT Staff user,
when the user attempts an invalid status transition,
then the server rejects the transition.


### Comments and Notes
#### AC-24
Given a permitted user,
when the user submits a non-blank Public Comment of at most 2,000 characters,
then the comment is appended with backend author and timestamp.

#### AC-25
Given a user,
when the user submits an empty, whitespace-only, or over-2,000-character
Public Comment or Internal Note,
then the server rejects the request.

#### AC-26
Given an IT Staff user,
when the user submits a non-blank Internal Note of at most 2,000 characters,
then the note is stored and visible to permitted roles only.

#### AC-27
Given a Requester,
when the Requester attempts to retrieve Internal Notes,
then the server rejects the request.


### Administrator
#### AC-28
Given an Administrator,
when the user creates an account with valid information,
then the new account is created with exactly one role.

#### AC-29
Given an Administrator,
when the user creates or edits an account using a duplicate email,
then the operation is rejected.

#### AC-30
Given an Administrator,
when the user updates a user's name, email, role, or active state,
then the permitted information is updated.

#### AC-31
Given an Administrator,
when the Administrator attempts to deactivate their own account,
then the operation is rejected.

#### AC-32
Given the last active Administrator,
when an attempt is made to deactivate that account or change its role away
from Administrator,
then the operation is rejected.

#### AC-33
Given an Administrator,
when a new initial password is set for another user,
then that user must change the password at the next login.


### UI and Responsive Behavior
#### AC-34
Given an authenticated user,
when the application shell loads,
then the user's name and role are displayed.

#### AC-35
Given a user role,
when the application navigation loads,
then only permitted destinations are presented.

#### AC-36
Given a mobile, tablet, or desktop viewport,
when required Lab 3 screens are opened,
then the interface remains usable and follows the Zen Green design.


## 19. Planned Test Strategy

Tests shall be implemented alongside each feature and traced to the
Acceptance Criteria.

### Server
Planned files:
- `server/tests/lab-03/auth.api.test.ts`
- `server/tests/lab-03/authorization.api.test.ts`
- `server/tests/lab-03/staff-queue.api.test.ts`
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `server/tests/lab-03/comments-notes.api.test.ts`
- `server/tests/lab-03/users-admin.api.test.ts`

### Client
Planned coverage:
- Login
- Change Password
- Staff Ticket Queue
- Staff Ticket Detail
- User Management
- Requester regression

### E2E
Planned scenarios:
- authentication flow
- IT Staff ticket workflow
- Administrator user-administration workflow

### Regression
Lab 2 Requester Ticket and Attachment functionality must be tested after
authentication and migration changes.

### Authorization Tests
Tests must verify backend authorization directly rather than relying only
on UI visibility.


## 20. Traceability

Each Acceptance Criterion must map to one or more automated tests.
The final `docs/lab-03/tests.md` shall contain:
- Acceptance Criterion ID
- Test description
- Test file path
- Test type
- Final pass/fail status

Example:

| AC | Test | Test File |
|---|---|---|
| AC-01 | Active user can login | `auth.api.test.ts` |
| AC-04 | Initial password requires change | `auth.api.test.ts` |
| AC-07 | Requester cannot access another user's Ticket | `authorization.api.test.ts` |
| AC-16 | IT Staff can access Ticket Queue | `staff-queue.api.test.ts` |
| AC-21 | IT Staff can update IT Priority | `staff-ticket-detail.api.test.ts` |
| AC-24 | Public Comment creation | `comments-notes.api.test.ts` |
| AC-28 | Administrator can create User | `users-admin.api.test.ts` |
| AC-31 | Administrator cannot deactivate self | `users-admin.api.test.ts` |


## 21. Product Definition of Done

Lab 3 is complete only when all of the following are satisfied:

### Specification
- [ ] Approved `specification.md`
- [ ] Approved `api-spec.md`
- [ ] Approved `ui-spec.md`
- [ ] Approved `tests.md`
- [ ] Requirements are traceable to Acceptance Criteria
- [ ] Acceptance Criteria are traceable to tests

### Database
- [ ] User model implemented
- [ ] Roles implemented
- [ ] Password hashes used
- [ ] Ticket ownership migrated
- [ ] Existing Ticket data preserved
- [ ] Existing Attachment data preserved
- [ ] Comments and Internal Notes supported
- [ ] IT Priority supported
- [ ] Migration tested
- [ ] Seed data implemented and idempotent

### Authentication
- [ ] Login works
- [ ] Logout works
- [ ] Current-user retrieval works
- [ ] Initial password change works
- [ ] Inactive accounts are rejected
- [ ] Passwords are never stored in plaintext
- [ ] Authentication secrets are not committed
- [ ] Server-side sessions expire after 8 hours of inactivity
- [ ] HttpOnly, Secure in HTTPS, and SameSite=Lax cookie settings verified
- [ ] Server validates CSRF tokens for every state-changing request

### Authorization
- [ ] Backend role authorization implemented
- [ ] Requester ownership enforced
- [ ] IT Staff permissions enforced
- [ ] Administrator permissions enforced
- [ ] Forbidden operations tested
- [ ] Protected resources do not leak other users' data

### Requester
- [ ] Development Requester selector removed
- [ ] Authenticated identity determines ownership
- [ ] Lab 2 Ticket functions continue working
- [ ] Lab 2 Attachment functions continue working
- [ ] Public Comments work
- [ ] Problem-appears-resolved indication works

### IT Staff
- [ ] Ticket Queue implemented
- [ ] Search implemented
- [ ] Filters implemented
- [ ] Sorting implemented
- [ ] Pagination implemented
- [ ] Ticket Detail implemented
- [ ] Claim/reassign implemented
- [ ] IT Priority implemented
- [ ] Status workflow implemented
- [ ] Public Comments implemented
- [ ] Internal Notes implemented

### Administrator
- [ ] User list implemented
- [ ] Search implemented
- [ ] Optional role filter implemented
- [ ] User creation implemented
- [ ] User editing implemented
- [ ] Role assignment implemented
- [ ] Activation/deactivation implemented
- [ ] Initial password reset implemented
- [ ] Duplicate email protection implemented
- [ ] Self-deactivation protection implemented
- [ ] Last active Administrator protection implemented

### UI
- [ ] Login UI implemented
- [ ] Change Password UI implemented
- [ ] Role displayed
- [ ] Logout implemented
- [ ] Role-specific navigation implemented
- [ ] Zen Green design reused
- [ ] Required loading/error/empty/forbidden states implemented
- [ ] Desktop layout verified
- [ ] Tablet layout verified
- [ ] Mobile layout verified

### Testing
- [ ] Unit tests pass
- [ ] API/integration tests pass
- [ ] Authorization tests pass
- [ ] Client tests pass
- [ ] Regression tests pass
- [ ] E2E tests pass
- [ ] Responsive/visual evidence collected
- [ ] Final tests pass on `main`

### Documentation and Evidence
- [ ] `specification.md` completed
- [ ] `api-spec.md` completed
- [ ] `ui-spec.md` completed
- [ ] `tests.md` completed
- [ ] `reviewer.md` completed
- [ ] `ai-use.md` completed
- [ ] Required screenshots/evidence collected
- [ ] GitHub Issues and Pull Requests are traceable
- [ ] Final integration is complete


## 22. Project Decisions Requiring Implementation Consistency

The following decisions are part of the approved Lab 3 design and must
remain consistent across database, API, UI, and tests:
1. Users have exactly one role.
2. Requester ownership is derived from the authenticated identity.
3. IT Staff and Administrator responsibilities remain conceptually
   separate.
4. Administrator does not automatically receive IT Staff Ticket
   operations.
5. Ticket ownership may be unassigned.
6. Ticket ownership may be assigned only to an eligible active owner.
7. Requested Priority is preserved.
8. IT Priority initially copies Requested Priority.
9. IT Priority can be changed by IT Staff or Administrator in an
   authorized Ticket context; this does not grant Administrators the Staff
   Queue, claim/reassign, or status-transition workflow.
10. Public Comments are append-only.
11. Internal Notes are append-only.
12. Requesters cannot access Internal Notes.
13. Requesters cannot formally resolve or close Tickets.
14. User deletion is not supported.
15. User deactivation is used instead of deletion.
16. An Administrator cannot deactivate their own account.
17. The last active Administrator cannot be deactivated or demoted.
18. A reset initial password requires a password change at next login.
19. Existing Lab 2 Ticket and Attachment data must survive migration.
20. Backend authorization is mandatory for every protected operation.
21. The Development Requester selector is removed after migration.
22. Lab 3 continues the Lab 2 Zen Green design system.
23. Actions Taken by IT Staff are deferred to Lab 4.
24. Session and CSRF behavior follows section 6.2.
25. Public Comments and Internal Notes each have a 2,000-character maximum (BR-16).
