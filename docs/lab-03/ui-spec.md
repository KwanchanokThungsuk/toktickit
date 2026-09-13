
# Lab 3 UI Specification

## 1. UI Design Goal

Lab 3 extends the existing TokTickIT Zen Green interface instead of
creating a separate visual system.

Existing Lab 2:

- design tokens
- form conventions
- cards
- badges
- buttons
- validation placement
- responsive rules
- accessibility expectations

remain the visual foundation.

The application shall replace the temporary Development Requester
identity with the authenticated user's name and role.


## 2. Application Shell

### 2.1 Authenticated Header

The authenticated application shell displays:

- TokTickIT branding
- current user's name
- current user's role
- Logout
- permitted password/profile action where applicable

Example:

    TokTickIT
    My Tickets     Change Password
    Kwanchanok     REQUESTER     Logout


### 2.2 Role Navigation

Navigation is determined by authenticated role.

#### Requester

- My Tickets

#### IT Staff

- Ticket Queue

#### Administrator

- User Management

Unauthorized destinations must not be presented as normal navigation
options.

Frontend hiding is only UX behavior. Backend authorization remains
mandatory.


## 3. Login Screen

### Purpose

Allow an active registered user to authenticate.

### Controls

- Email
- Password
- Login button

### States

#### Default

Form is editable.

#### Loading

- Login button becomes disabled
- visible busy indication
- inputs are protected from duplicate submission

#### Validation Error

Display field-level or form-level validation.

Examples:

- email required
- invalid email
- password required

#### Authentication Failure

Show a safe error message.

Do not reveal whether an email exists in the system.

#### Inactive Account

Show a safe account-inactive message without unnecessary account
information.

### Success

If `mustChangePassword = false`:

    Login → Authenticated Application Shell

If `mustChangePassword = true`:

    Login → Change Password


## 4. Change Password Screen

### Purpose

Allow users with an initial/reset password to establish their permanent
password.

### Controls

- Current Password
- New Password
- Confirm New Password
- Change Password button

### Validation

- required fields
- password confirmation must match
- password must satisfy the project-documented password rule, if one is
  adopted as a design choice
- current password must be valid

### States

- default
- validating
- saving
- success
- failure

### Success

After successful password change:

    Change Password → Authenticated Application Shell

The user must not remain blocked by the first-login requirement.


## 5. Requester UI Regression

### 5.1 Development Requester Removal

The following Lab 2 elements must be removed:

- Development Requester selector
- Change Requester action
- client-controlled Requester identity selection

The authenticated user is now the Requester identity.


### 5.2 My Tickets

Existing Lab 2 My Tickets functionality remains.

The UI must show only Tickets owned by the authenticated Requester.

Existing:

- search
- filters
- sorting
- pagination
- Ticket cards/table
- status
- priority

should continue according to the Lab 2 implementation.


### 5.3 Requester Ticket Detail

Existing Ticket Detail remains read-only/editable according to Lab 2 rules.

Lab 3 adds:

- Public Comments
- Problem Appears Resolved action

The UI must preserve Attachment functionality.


## 6. Public Comments UI

### Location

Requester Ticket Detail, permitted IT Staff Ticket Detail, and the
Administrator's read-only communication-review context.

### Display

Each comment shows:

- author name
- author role where appropriate
- timestamp
- content

Comments appear in chronological order.

Administrators may view Public Comments read-only in an authorized
communication-review context. This does not add Ticket Queue, claim,
assignment, priority, status, or comment-creation controls for that role.

### Input

- multiline text input
- submit button
- character validation

### Validation

Reject:

- empty input
- whitespace-only input
- content over the documented maximum

### States

- idle
- submitting
- success
- validation error
- safe failure

After successful submission, the new comment appears without exposing
internal notes.


## 7. Problem Appears Resolved

### Requester-only Action

The Ticket Detail screen provides:

    Problem Appears Resolved

The action is available only when appropriate.

### Behavior

Submitting the action records the Requester's indication.

The indication is persisted by the backend and its recorded state/time is
shown in the IT Staff Ticket Detail workflow. The implementation field
name is a design choice.

It does NOT directly change the Ticket to:

- Resolved
- Closed

The UI must communicate that the Requester's action is an indication
rather than a formal workflow transition.


## 8. IT Staff Ticket Queue

### Purpose

Help IT Staff locate and prioritize work.

### Desktop Layout

Use a readable table rather than a mega-grid.

Recommended columns:

- Ticket Number
- Created Date
- Summary
- Category
- Requested Priority
- IT Priority
- Current Status
- Ticket Owner
- Last Updated
- Open Detail

The final column set should remain concise enough to be readable.


### Search

Provide a search control.

Search behavior follows the API contract.

### Filters

Provide suitable filters such as:

- Status
- IT Priority
- Ownership
- Owner

### Sorting

Sortable fields follow `api-spec.md`.

The current sort should be visually indicated.


### Pagination

Provide:

- current page
- next/previous
- page information
- page-size control if implemented

### Ownership

Display:

- assigned staff name
- Unassigned

### Badges

Use consistent badges for:

- status
- Requested Priority
- IT Priority
- role where shown


## 9. IT Staff Queue States

### Loading

Display a clear loading state.

### Empty

When there are no Tickets:

    No tickets found.

Provide useful context without implying a system failure.

### No Results

When search/filter criteria produce no results:

    No tickets match your search.

Allow the user to clear filters/search.

### Forbidden

If a non-IT Staff user attempts to access the Queue:

    Access denied.

The frontend must not attempt to bypass authorization.

### Failure

Show a safe error message and Retry action where appropriate.


## 10. IT Staff Ticket Detail

### Sections

1. Ticket Header
2. Requester Information
3. Ticket Information
4. Priority
5. Ownership
6. Status
7. Attachments
8. Public Comments
9. Internal Notes
10. Requester Resolution Indication


### 10.1 Ticket Header

Display:

- Ticket Number
- Summary
- Status badge
- Requested Priority badge
- IT Priority badge


### 10.2 Requester Information

Display relevant requester identity information.

Do not expose unnecessary account information.


### 10.3 Ticket Information

Display:

- Description
- Category
- Related System
- Created Date
- Last Updated

Preserve Lab 2 read-only/editable conventions.


### 10.4 Ownership

Display:

- current owner
- Unassigned state
- Claim action
- Reassign control

Claim should assign the Ticket to the authenticated IT Staff user.

Reassign should allow selection of active eligible owners: IT Staff or
Administrator. Selecting an Administrator as owner does not expose Staff
Queue or Ticket mutation controls to that Administrator.


### 10.5 IT Priority

Display current IT Priority.

IT Staff may change it. An Administrator may also change IT Priority in an
authorized Ticket communication-review context. This does not expose the
Staff Queue, claim/reassign, or status-transition controls to Administrator.

Requested Priority remains read-only.

The UI must make the distinction between:

    Requested Priority

and

    IT Priority

visually clear.


### 10.6 Status

Display current status.

Provide only transitions allowed from the current status.

The backend remains responsible for validating the transition.

Saving state must be visible.

Invalid transitions returned by the server must produce safe feedback.

### 10.7 Requester Resolution Indication

When persisted, show the Requester's problem-appears-resolved indication
and its backend-recorded time as workflow context. It is informational and
must not be presented as a formal `Resolved` or `Closed` status.

### 10.8 Attachments

Existing Lab 2 Attachment functionality must continue.

The Ticket Detail screen must preserve:

- attachment metadata
- permitted download behavior
- existing ownership protection


## 11. Internal Notes UI

Internal Notes are append-only. IT Staff may create and view them.
Administrators may view them read-only in an authorized
communication-review context; Requesters must never see them.

### Display

Each note shows:

- author
- timestamp
- content

### Input

Multiline text input.

### Rules

- append-only
- empty content rejected
- whitespace-only content rejected
- safe rendering
- no edit/delete controls

Requesters must never see Internal Notes.

Administrator review must not expose note creation, edit/delete, Ticket
Queue, claim/reassign, ownership, or status-transition controls. Administrator may update IT Priority in the authorized Ticket context.


## 12. Administrator User Management

### Purpose

Provide a minimalist interface for managing user accounts.

### User List

Required columns:

- Name
- Email
- Role
- Status
- Edit

The list does not need advanced pagination or multi-column sorting.


### Search

One search input supports:

- name
- email

Search is case-insensitive.


### Role Filter

Optional role filter:

- All
- Requester
- IT Staff
- Administrator


## 13. Create User

### Form Fields

- Name
- Email
- Role
- Initial Password

Role selection allows exactly one role.

### Validation

- required name
- valid email
- unique email
- valid role
- valid initial password

### Success

Show a clear success message.

The new user is marked as requiring a password change when appropriate.


## 14. Edit User

Editable fields:

- Name
- Email
- Role
- Active/Inactive state

### Rules

The UI must prevent or clearly explain:

- duplicate email
- Administrator self-deactivation
- removing the last active Administrator

Backend responses remain authoritative.


## 15. Set New Initial Password

Administrator can set a new initial password for another user.

After success:

- user must change password at next login;
- password itself is not displayed after submission;
- success feedback confirms that the initial password was reset.

The actual password must never be displayed in the user list.

### 15.1 Read-only Communication Review

The Lab 3 UI provides Administrator access to authorized Ticket
communications as read-only information, with the explicit exception that
Administrator may update IT Priority. It is not a Staff Ticket Detail
screen and does not provide queue, claim/reassign, status, attachment
mutation, or comment/note creation controls.


## 16. Administrator Safety Feedback

If an Administrator attempts to deactivate themselves:

    You cannot deactivate your own account.

If an Administrator attempts to deactivate the last active Administrator:

    The last active Administrator cannot be deactivated.

The UI must handle the backend response safely.


## 17. User Management States

### Loading

Show user-list loading state.

### Empty

If there are no users matching the current view:

    No users found.

### No Results

If search/filter returns nothing:

    No users match your search.

### Saving

Disable duplicate submission and show progress.

### Success

Show confirmation after create/update/reset-password operations.

### Validation

Show field-level validation where possible.

### Forbidden

Non-Administrators must receive a safe forbidden state.

### Failure

Show safe error feedback without exposing backend details.


## 18. Responsive Rules

All Lab 3 screens must remain usable on:

- desktop
- tablet
- mobile

### Desktop

Use:

- tables for data-heavy queue/list views
- cards/forms for detail screens

### Tablet

Reduce spacing and non-essential columns where necessary.

Maintain clear primary actions.

### Mobile

Avoid horizontal mega-grids.

The Ticket Queue should use a compact card/list representation.

Important information remains visible:

- Ticket Number
- Summary
- Status
- IT Priority
- Owner
- Open Detail

User Management should remain readable without requiring excessive
horizontal scrolling.

Ticket Detail sections may stack vertically.


## 19. Accessibility

The UI should preserve Lab 2 accessibility expectations.

Requirements include:

- visible labels
- keyboard-accessible controls
- sufficient focus indication
- readable validation feedback
- meaningful button labels
- no color-only meaning for status/priority
- logical heading structure
- accessible loading/error feedback
- adequate touch target sizes on mobile


## 20. Zen Green Consistency

New components must reuse existing application styles where possible.

Do not introduce a second visual language.

Maintain consistent:

- typography
- spacing
- buttons
- form controls
- cards
- badges
- validation
- navigation
- responsive behavior


## 21. Role-Based UI Summary

| Feature | Requester | IT Staff | Administrator |
|---|:---:|:---:|:---:|
| Login | Yes | Yes | Yes |
| Change Password | Yes | Yes | Yes |
| My Tickets | Yes | No | No |
| Ticket Detail | Own | Staff | Communication review only |
| Public Comments | Yes | Yes | Read-only |
| Problem Appears Resolved | Yes | No | No |
| Ticket Queue | No | Yes | No |
| Claim/Reassign | No | Yes | No |
| IT Priority | No | Yes | Yes (authorized Ticket context) |
| Status Workflow | No | Yes | No |
| Internal Notes | No | Yes | Read-only |
| User Management | No | No | Yes |
| Logout | Yes | Yes | Yes |


## 22. Visual QA

Before Lab 3 release, verify screenshots for:

- authentication
- staff queue
- staff ticket detail
- user management

Required artifact directories:

    artifacts/lab-03/screenshots/authentication/
    artifacts/lab-03/screenshots/staff-queue/
    artifacts/lab-03/screenshots/staff-ticket-detail/
    artifacts/lab-03/screenshots/user-management/

Screenshots should demonstrate both functionality and responsive layout.
