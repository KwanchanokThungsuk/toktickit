# Lab 4 UI Specification

**Status:** The Issue 29 Actions Taken UI is implemented and verified. This contract also defines planned UI work for later Sprint 4 Issues 30–33, which is not claimed implemented. [specification.md](specification.md) is authoritative for rules/metrics/roles; [api-spec.md](api-spec.md) defines payloads and filters; [tests.md](tests.md) records implemented, manual-only, and planned evidence.

## 1. Design Principles and Application Shell

Extend React AppShell and its existing hash navigation. Reuse `theme.css` Zen Green tokens (`--zg-primary`, surface, border, text, read-only, error, warning, success and focus colors), existing forms/buttons, Badge, cards/panels, responsive table conventions, Loading, Empty and ErrorState. Extend the current components where they lack accessible status semantics; reuse does not imply existing components satisfy every new requirement. Keep Public Comments clearly labeled shared and Internal Notes clearly labeled private; Actions Taken are shared with Requesters.

Reuse existing detail sections and any existing tab conventions; do not replace Ticket Detail with a dashboard or invent a separate navigation system. Dashboard is the normal post-login starting screen after mandatory password change; permitted deep links remain intact. Active links use `aria-current=page`. Maintain current authenticated name/role, mobile menu, Logout and existing user administration navigation.

| Role | Navigation / Lab 4 hash paths |
|---|---|
| Requester | Dashboard `#/dashboard`, My Tickets `#/tickets`, Create Ticket `#/tickets/new` |
| IT Staff | Dashboard `#/staff/dashboard`, Ticket Queue `#/staff/tickets` |
| Administrator | Same operational Dashboard/Queue plus existing User Management `#/admin/users` and Ticket Inspection entry/link |

Administrator operational navigation is an explicit Lab 4 expansion of Lab 3. Existing inspection deep links remain usable; share operational components to avoid duplicate conflicting controls. Requester operational deep links and non-Administrator User Management show Access denied. On `401`, clear protected data and return to Login; on PASSWORD_CHANGE_REQUIRED show the existing forced-password flow. Frontend visibility is NOT the security boundary; every API independently authorizes.

## 2. IT Staff Dashboard

### Purpose and layout

A concise starting point for service-desk work, also used by Administrator. Heading “Dashboard”, short operational context, Refresh button and backend asOf (“Updated …, Asia/Bangkok”). Cards wrap across up to four desktop columns; status and priority groups use compact labeled counts, not charts requiring color interpretation. Recent/urgent lists form two desktop columns with an adjacent or stacked personal Action list.

Use exactly the specification section 9 metrics:

| Card/group | Scope and action |
|---|---|
| Unassigned Active Tickets | ACTIVE and no Ticket Owner; View unassigned Tickets → Queue owner=unassigned/statusGroup=active |
| My Active Tickets | ACTIVE owned by caller; View my Tickets → Queue owner=me/statusGroup=active |
| Tickets by Status | All eight statuses, all Tickets; each count links to exact Queue status |
| Active Tickets by IT Priority | ACTIVE LOW/MEDIUM/HIGH; each links to matching Queue group/priority |
| Recently Updated Tickets | Seven-day backend window, any status; View recently updated Tickets → Queue with returned dates and updated sort |
| My Completed Actions This Week | Authenticated performer, completed within backend window; View my completed Actions → paginated `#/staff/dashboard/actions` |

Counts come directly from API, not preview length. Recent Tickets: up to five Ticket summaries. Urgent Tickets: up to five HIGH/ACTIVE Tickets ordered updatedAt desc/id asc, with View all linking to that Queue filter. Personal Actions: up to five completed summaries ordered completedAt desc/id asc. Show Ticket Number, Summary/Action Description, text status, IT Priority where relevant, owner/unassigned for operational rows and date. Row link text identifies the Ticket; Action links open Staff Ticket Detail and focus the relevant Action. Do not embed full Ticket descriptions or Internal Notes.

Current-user Action drill-down is a compact paginated list with returned date filters, Ticket links, Action Description and completion date; default 20 rows, maximum100. No new task-management navigation or assignee-changing screen is introduced. Administrator metrics use that Administrator's own ID for personal counts, and User Management stays available separately; no extra account-count cards.

### States

Initial loading shows skeleton/Loading and accessible busy text; never display fabricated zero counts before success. Empty dashboard shows real zero values and per-section “No matching tickets/actions”, with Queue links usable. Forbidden shows Access denied and a permitted navigation route. Backend failure shows safe ErrorState and Retry; it is distinct from empty. A refresh failure may retain last successful data only with an explicit stale label/asOf; never mix old counts with new preview rows. Disable duplicate refresh while busy. Section 8 applies to all further states.

## 3. Requester Dashboard

Show only authenticated Requester-owned data. Four cards: Open Tickets (ACTIVE), Waiting for Requester (exact status), Recently Updated Tickets (seven-day updatedAt window), Recently Resolved Tickets (Resolved/Closed and effective resolution time within window). Definitions, zero behavior and exact queries are specification section 9; do not redefine “open” as only OPEN.

Attention Required list uses Waiting for Requester; Recent Tickets and Recently Resolved lists each preview at most five. All rows link to owned Ticket Detail `#/tickets/:id`. Show number, summary, status text and relevant updated/resolution date; legacy resolution estimates carry “Estimated from last update”. Display the window/Asia/Bangkok zone, not a falsely precise historical resolution label. A Ticket may appear in more than one list because these predicates overlap.

Card links open My Tickets with backend query predicates from API, reset page 1 and reflect filter chips/controls visibly. My Tickets must add all eight status choices and the defined active/recent filters; preserve search, category/system/priority, sort and page-size behavior. Clear dashboard filters restores normal My Tickets defaults. Keep Create Ticket accessible, especially for an empty first-time user.

Use Staff Dashboard's loading/empty/forbidden/failure rules; no Ticket numbers from other Requesters in any feedback. Requester Dashboard does not duplicate the full My Tickets table.

## 4. Actions Taken on Ticket Detail

### List and view mode

Add an Actions Taken panel to existing Requester/Staff Ticket Detail and Administrator inspection/operational detail. Every owned Requester can view all items through paginated controls. Stable order Action Date/Time asc, ID asc; show Draft/Completed/Cancelled explicitly. Desktop table columns: Action Date/Time, Description, Result, Performed By, Follow-up, State, View/Edit. Assignee and lengthy notes appear in expanded view to keep the table readable. Mobile/tablet cards can display these fields in labeled blocks. “View Action 41” opens a full inline detail view; full text remains reachable without hover.

Performed By is distinct from Action Creator, Action Assignee and Ticket Owner. Draft/cancelled unfinished items say “Not performed”; completed items show the authenticated performer and completion time. List/view displays all seven handout fields, optional assignee/state, created/updated time and full note text. Requesters see shared business content only; no private audit data or Internal Notes. No DELETE control.

### Create/edit fields

| Field | Create / edit rules |
|---|---|
| Action Date/Time | Read-only server recording time; before create show “Recorded when saved”, not a fake authoritative timestamp |
| Action Description | Required multiline text, 2,000 characters max (project design decision reused from Lab 3) |
| Result | Optional Draft; required Completed/Cancelled; cancelling prompts for explanation |
| Performed By | Read-only server identity on completion; Draft shows Not performed; never a user-select control |
| Action Assignee | Optional active Staff/Admin select, separate from Ticket Owner; editable Draft only |
| State | Draft default; create can choose Completed; Draft edit exposes Complete Action and Cancel Action; terminal states cannot reopen |
| Follow-Up Required | Required checkbox; false default; editable while Draft; terminal Actions cannot change |
| Follow-up Note | Shown/enabled and required when checkbox true; disabled when false, submitted as null |
| Attachment Notes | Optional plain text, identifies existing filenames; no upload input or automatic download permission |

All text fields share the project 2,000-character limit and visible counters. Follow-up/Attachment Notes optional blank values normalize null; Result must be nonblank when terminal. If disabling follow-up, preserve note in the local draft during the current edit so toggling back restores it, but successful save false clears persisted note. Display a shared-content hint: “Actions Taken are visible to the Requester. Use Internal Notes for private information.” Render text inertly, including URLs/HTML-like input.

Create button: IT Staff/Administrator on active Tickets, regardless of Owner. Edit form preloads current Action/parent versions; Draft edits allow assignment/status. Completed and Cancelled Actions show no edit controls and explain that corrections or additional work require a new Action. Performed By/date are always read-only. On inactive assignee rejection show inline message and permit selection of an eligible user or Unassigned. On Resolved/Closed/Cancelled Tickets show read-only Actions with “Reopen the Ticket before changing Actions”. Requester sees no create/edit/complete/cancel controls.

Use inline form/panel modes to avoid unnecessary dialogs. Save/Cancel controls have meaningful names; Cancel edit does not cancel the Action. Confirm discarding dirty input when leaving edit. Validate at field and form level, focus first invalid control, retain input on `422/409/500` and network failure. During save disable repeated submit/transition; show Saving. Generate the required requestKey when beginning a create and reuse that same key if the request has an unknown network outcome; the backend returns the existing Action with 200 for the same Ticket, authenticated creator and requestKey, without creating a second row. A deliberate new Action uses a new requestKey. Successful save updates from response then refreshes Ticket/eligibility, Action list and dashboard data, announces success, and restores focus to the appropriate Action row.

## 5. Ticket Workflow Controls

Keep status/owner/IT Priority controls in existing detail; Requested Priority stays read-only. Staff/Admin status dropdown contains only the section 6 matrix destinations; status text remains visible. Requesters retain Problem Appears Resolved only in inherited eligible states, once; show persisted advice time independently of formal status.

Resolve requires confirmation and displayed gate readiness: at least one Completed Action with a nonblank Result and no Draft Actions. Follow-Up Required and Follow-up Note remain visible business information and do not independently block resolution. If blocked, disable Resolve with explanatory text and link/focus to relevant Actions; hide unrelated transitions, not the explanation. Confirm Resolved, Closed and Cancelled. Cancellation explicitly warns that unfinished Draft Actions will also be cancelled; it must not appear equivalent to Cancel edit. Closing legacy Resolved Tickets does not demand invented Actions. Completed and Cancelled Actions remain immutable after these transitions.

On success refresh authoritative status/version/resolvedAt and action eligibility; cancellation refreshes child states. On `409`, retain drafts and show “This Ticket changed. Refresh and review before saving again” or the safe gate/edge reason. Refresh authorized detail without automatically overwriting/reapplying local edits; show latest values alongside retained draft or request a deliberate retry after review. Unknown outcome after timeout: retrieve latest state before retrying PATCH. On CSRF_INVALID obtain a fresh token but wait for deliberate user retry. Never silently elevate roles or fabricate success.

Frontend visibility is NOT the security boundary. Backend authorization, transition validation, resolution gate and concurrency checks remain required when the client bypasses these controls.

## 6. Responsive Behavior

Use existing mobile threshold below 768px; tablet 768–1199px; desktop1200px and above as layout decisions. Verify existing Lab 3 viewports 1440×900, 1024×768, 390×844 and320×568.

Desktop: cards up to four columns, two-column preview sections, readable compact Actions table and two-column fields where room permits. Tablet: two-column cards, stacked preview sections as needed; Action cards if tables cannot fit. Mobile: one-column cards/forms/lists; reuse menu with current-page indicator, user identity and Logout reachable; full-width actions wrap. Convert data-heavy new tables to labeled cards rather than horizontal page scrolling. Existing Queue/User Management must remain operable.

Wrap long descriptions, filenames and notes; avoid fixed widths and ellipsis as the only way to access full text. Pagination/buttons wrap without overlap. Confirmations fit viewport, body scroll stays usable, focus is never clipped; 200% zoom must retain controls. No horizontal page overflow, clipped metric labels or overlapping badge/action rows. Existing minimum control heights and focus tokens remain consistent.

## 7. Accessibility

Use semantic headings/main/nav/section, labeled form controls and semantic table captions/column headers. Counts have labels plus meaningful links (“View waiting Tickets”), not unlabeled clickable numbers. Text communicates every status, priority, follow-up and privacy category; color is supplementary. Loading/saving/success announce through status/live region; errors use alert without repeated unnecessary announcements.

All functions operate by keyboard. Visible focus follows existing Zen Green focus styling and sufficient contrast; tab order follows visual/reading order. Inputs/errors associate via aria-describedby/aria-invalid; required dependencies are communicated as text. Follow-up checkbox controls note visibility logically without unexpected focus loss. Dialogs use accessible title/description, initial focus, trapped focus, Escape cancel and focus restoration (or accessible native confirmation); no inaccessible custom overlays. Inline panels avoid trapping keyboard focus. Back/Retry/link names identify destinations; disabled gate explains why it is disabled. Verify touch targets and zoom manually alongside automated keyboard checks.

## 8. UI State Matrix

| State | Dashboard/list | Action/workflow form |
|---|---|---|
| Loading | Busy announcement; skeleton, no invented zeros | Detail loading; no stale enabled mutation controls |
| Success | Backend counts/bounded rows/asOf; usable links | Announce saved; refresh current DTO/version/status; clear successful draft only |
| Empty | Real zero counts/empty lists; link to full list/Create Ticket | No Actions yet; authorized Add Action on active Ticket |
| Validation error | Invalid drill-down filter feedback with Clear filters | Field errors, focus invalid field, preserve draft |
| Forbidden | Access denied with permitted route; no protected data | No attempted authorization bypass; preserve only permitted context |
| Not found | Safe message and route back | Missing/unowned Ticket/Action identical safe feedback |
| Conflict | Refresh counts where changed | Keep draft; explain stale/gate/immutable/terminal conflict; review latest before retry |
| Backend/network failure | Safe message/Retry; mark retained data stale | Safe failure and retained draft; unknown commit outcome reconciled before retry |
| Session expired | Clear protected data; Login | Same; do not persist sensitive draft in permanent browser storage |

Visual evidence must include zero metrics, long text, validation, stale conflict, shared/private distinction and all layout widths. Final polish removes broken links, duplicate/obsolete navigation, console errors, placeholders and unfinished controls; it does not remove useful retained Lab 3 features.
