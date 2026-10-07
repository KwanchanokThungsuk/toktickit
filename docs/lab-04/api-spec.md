# Lab 4 REST API Specification

**Status:** Proposed extensions, not existing endpoints or verified implementation. [specification.md](specification.md) defines rules, matrix and metric predicates; [ui-spec.md](ui-spec.md) defines controls; [tests.md](tests.md) maps criteria. Retain Lab 3 `/api/tickets` and `/api/staff/tickets` naming, integer IDs, JSON bodies, ISO timestamps and safe error envelope. IDs here reference Lab 4.

## 1. Authentication / Authorization Expectations

Reuse the server-managed `toktickit_session` HttpOnly cookie (Secure under HTTPS, SameSite=Lax), eight-hour inactivity expiry, credentials-included browser requests and `/api/auth/csrf` token exchange. Every mutation requires `X-CSRF-Token`; auth login/logout/me/change-password endpoints retain Lab 3 shapes. Protected business reads/writes require an active account with `mustChangePassword=false`. Recheck current account role/activity each request; reject invalidated sessions after logout/reset/deactivation.

Check authentication, password-change state, role and write CSRF before resource lookup/business mutation. Requester-owned resources use an ownership-filtered lookup; missing/unowned resources share safe `404` feedback. Ignore no identity override silently on new endpoints: reject unrecognized body/query fields with the endpoint's validation status. Performer, creator, role, requester identity and backend timestamps cannot be client-assigned.

Administrator now shares operational Staff access under Lab 4 section 4.3 (DD-01). Existing tests expecting Administrator queue/status/comment/note denial must be intentionally updated in the future implementation. User Management remains Administrator-only; Requester Ticket creation/list and file APIs remain Requester-only. Existing endpoint defaults/envelopes persist except explicitly listed extensions.

## 2. Shared Representations

### 2.1 Action DTO

```json
{
  "id": 41,
  "ticketId": 12,
  "actionDateTime": "2026-10-07T03:00:00.000Z",
  "actionDescription": "Tested campus VPN connectivity.",
  "result": "Connectivity restored and verified.",
  "status": "COMPLETED",
  "createdBy": { "id": 7, "name": "Staff One", "role": "IT_STAFF" },
  "performedBy": { "id": 8, "name": "Staff Two", "role": "IT_STAFF" },
  "assignedTo": { "id": 8, "name": "Staff Two", "role": "IT_STAFF" },
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See vpn-check.png in Ticket attachments.",
  "completedAt": "2026-10-07T04:00:00.000Z",
  "createdAt": "2026-10-07T03:00:00.000Z",
  "updatedAt": "2026-10-07T04:00:00.000Z",
  "version": 2
}
```

`performedBy` and `completedAt` are null until completion; cancelled drafts remain null. `assignedTo`, Result and notes may be null under BR-06–BR-09. Safe identities omit passwords/email/session data. All permitted readers receive current shared business content. Action Date/Time is immutable server creation time, not editable actual-work time (DD-05).

### 2.2 Ticket and Action summaries

Ticket summary: `{id,ticketNumber,summary,currentStatus,itPriority,assignedTo,updatedAt}`; Requester dashboard may omit assignedTo/itPriority but must consistently return `{id,ticketNumber,summary,currentStatus,updatedAt}`. Resolved summaries additionally return `resolutionTime` and `resolutionTimeSource` (`FORMAL_RESOLUTION` or `LEGACY_UPDATED_AT`). Action summary: `{id,ticketId,ticketNumber,actionDescription,status,completedAt,performedBy,followUpRequired}`. Descriptions remain bounded by BR-06. Neither summary includes Ticket description, Internal Notes, file paths or full communications.

### 2.3 Common new list pagination

Positive integer `page` default 1; `pageSize` default 20, range 1–100. Response `{items:[],page:1,pageSize:20,totalItems:0,totalPages:0}`. Beyond final page returns empty items and actual total metadata; stable sorting prevents tie ambiguity. No other query keys on Action lists. Existing My Tickets keeps default pageSize 10 and sizes 10/20/50 with `{data,meta}`.

## 3. Actions Taken

### 3.1 GET `/api/tickets/:id/actions-taken`

Roles: owned Ticket Requester, IT Staff, Administrator. `id` is a positive integer Ticket ID; malformed ID, missing Ticket or Requester-unowned Ticket returns `404`. Query: `page`, `pageSize` per section 2.3. All Action states are included, ordered `actionDateTime asc, id asc`; pagination must allow Requesters to reach every item. `200` returns the common list envelope with full Action DTO items plus `ticketVersion`. Zero Actions returns empty items, totalPages 0 and current Ticket version. Internal Notes and private implementation data are excluded. Invalid queries `422`; `401/403/404/500` per section 7.

### 3.2 POST `/api/staff/tickets/:id/actions-taken`

Roles: IT Staff or Administrator, irrespective of Ticket Owner. Positive Ticket ID; no query parameters. Require CSRF. Body:

```json
{
  "actionDescription": "Investigate VPN access failure.",
  "result": null,
  "status": "DRAFT",
  "assignedToUserId": 8,
  "followUpRequired": true,
  "followUpNote": "Verify connectivity with the Requester.",
  "attachmentNotes": "See vpn-error.png.",
  "expectedTicketVersion": 4,
  "requestKey": "optional-client-generated-key"
}
```

Required: Action Description, boolean followUpRequired, and positive integer expectedTicketVersion. Optional status defaults DRAFT, only DRAFT/COMPLETED allowed at creation. An optional requestKey can support a practical uniqueness guard. Non-null assignee is a positive integer active IT Staff/Administrator. BR-06 text types/nonblank/dependencies and the project 2,000-character design limit apply. Completed creation sets Performed By and completedAt from authenticated server identity/time. Body fields outside this allowlist, including performedById/createdById/ticketId/date/time overrides, return `422 VALIDATION_ERROR`.

In one ordinary database transaction, verify the Ticket version and active state, validate the assignee, insert the Action and advance Ticket version/updatedAt. Never update Ticket Owner. `201` returns `{action:<Action DTO>,ticketVersion:<new integer>}`. If a requestKey uniqueness guard is adopted, a duplicate key returns safe `409 DUPLICATE_ACTION`; otherwise the pending UI state is the primary protection. No client-supplied performer is accepted.

Errors: `400` malformed JSON; `401/403` auth/role/CSRF; `404` missing Ticket; `422` validation/inactive assignee; `409 STALE_UPDATE`, `TICKET_NOT_ACTIVE` or duplicate conflict; safe `500`. On failure no Action or Ticket update commits.

### 3.3 PATCH `/api/staff/tickets/:id/actions-taken/:actionId`

Roles: IT Staff or Administrator; require CSRF. Both IDs positive; require Action.ticketId equal path Ticket ID or return safe `404`. No query parameters. Body contains positive `expectedTicketVersion`, positive `expectedVersion` for Action, and at least one permitted field:

```json
{
  "expectedTicketVersion": 5,
  "expectedVersion": 1,
  "status": "COMPLETED",
  "result": "VPN settings corrected; access verified.",
  "followUpRequired": false,
  "followUpNote": null
}
```

Draft allowlist: actionDescription, result, assignedToUserId, followUpRequired, followUpNote, attachmentNotes, status. Partial update merges current fields before cross-field validation. Draft→Completed requires nonblank Result and records authenticated completing user/time; Draft→Cancelled requires nonblank Result explaining cancellation, clears followUpRequired/note, keeps performer null. Result can be entered in the same request. Draft→Draft edits are allowed; unknown status `422`; terminal→any different status `409 INVALID_ACTION_TRANSITION`.

Completed/Cancelled allowlist for corrections: actionDescription, result, followUpRequired, followUpNote, attachmentNotes. Preserve nonblank terminal Result. Cancelled always has false/null follow-up; setting true is `422`. Terminal assignee/attribution/time changes are `409 ACTION_FIELD_IMMUTABLE`; submitting server-owned fields on any Action is `422`. Matching current status is a harmless unchanged field on a text correction, but an otherwise empty/no-change patch is `422`. Completing another Action does not implicitly clear the original's follow-up flag.

In one ordinary database transaction, check parent and Action versions, verify active Ticket, revalidate Draft assignee, validate merged state, update the Action and advance both versions/Ticket.updatedAt. `200` returns `{action:<DTO>,ticketVersion:<new integer>}`. Errors: `400`, `401/403`, `404`, `422`, `409 STALE_UPDATE|TICKET_NOT_ACTIVE|INVALID_ACTION_TRANSITION|ACTION_FIELD_IMMUTABLE`, `500`. No partial updates. A stale PATCH returns `409`; UI refreshes and asks the user to review before retrying.

## 4. Ticket Workflow and Inherited Write Extensions

### 4.1 PATCH `/api/staff/tickets/:id/status`

Existing route; roles expand to IT Staff/Administrator. Require CSRF. No query. Body `{status:"RESOLVED",expectedVersion:6}` only. Unknown enum/missing or invalid version/body field `422`; malformed Ticket ID/missing Ticket `404`.

Use the exhaustive [section 6 matrix](specification.md#6-ticket-status-transition-matrix). In one ordinary database transaction verify version, permitted edge and BR-13 resolution gate. Forbidden edge gives `409 INVALID_STATUS_TRANSITION`; failed gate gives `409 RESOLUTION_BLOCKED` with safe reason, not other users' data. Resolving records backend resolvedAt; closure preserves it; reopen preserves historical timestamp. Cancelling updates Draft Actions with Result “Cancelled because the Ticket was cancelled.” and false/null follow-up; terminal Actions stay unchanged.

`200` extends existing `{id,currentStatus}` with `{version,updatedAt,resolvedAt}`. Failure `400/401/403/404/409/422/500`; all rejected writes leave versions, Actions and timestamps unchanged. Legacy already-Resolved Tickets may close without Actions, but a subsequent new entry to Resolved must satisfy the gate.

### 4.2 POST `/api/tickets/:id/problem-resolved`

Requester-only owned lookup, CSRF, positive ID; proposed body `{expectedVersion:6}` replaces the inherited empty body. Inside the database transaction, verify the expected Ticket version, then increment the Ticket version after a successful indication. The inherited In Progress/Waiting status and no-previous-indication rules still apply. `200` retains `{id,currentStatus,requesterResolutionIndicatedAt,requesterResolutionIndicatedByUserId}` and adds version/updatedAt. User/time are server supplied; formal status never changes. `409 STALE_UPDATE|ALREADY_INDICATED|NOT_ALLOWED`; `422` invalid version/extra body fields; `401/403/404/500` common. Malformed ID uses safe `404` without attempting a database lookup.

### 4.3 Other operational writes

These existing routes expand to Administrator and verify the expected Ticket version inside the database transaction, incrementing the Ticket version after a successful mutation so stale writes cannot silently overwrite newer changes:

| Route | Proposed body | Successful response |
|---|---|---|
| PATCH `/api/staff/tickets/:id/owner` | `{ownerId:<positive integer or null>,expectedVersion:<integer>}` | Existing owner DTO or null; new version provided via `X-Ticket-Version` header |
| POST `/api/staff/tickets/:id/claim` | `{expectedVersion:<integer>}` | Existing owner DTO, authenticated claimant; `X-Ticket-Version` |
| PATCH `/api/staff/tickets/:id/priority` | `{itPriority:"LOW|MEDIUM|HIGH",expectedVersion:<integer>}` | Existing id/requestedPriority/itPriority fields plus version/updatedAt |

`200` success; `401/403/404/422/409/500` as above. Expose `X-Ticket-Version` through existing CORS configuration; validate eligible active owner inside transaction. Requested Priority never changes. A claim against an already assigned Ticket is `409 OWNER_ALREADY_ASSIGNED`, avoiding overwriting a concurrent claim. Existing owner-edit response envelope remains compatible. Detail GETs expose Ticket.version; Staff Detail adds `resolutionEligibility:{canResolve:boolean,reasons:string[]}` and action assignee options from active Staff/Admin identities. This computed eligibility is guidance; mutation always rechecks.

Public Comment and Internal Note POST routes gain Administrator permission and password-change/CSRF enforcement; their body/response/append-only semantics stay unchanged. Existing Ticket creation must enforce CSRF, and protected detail/communication reads must enforce mandatory password change where guards are currently missing. File API ownership, limits and responses remain unchanged. These are future hardening increments, not statements that current guards already exist.

## 5. Requester Dashboard

### GET `/api/dashboard/requester`

Requester-only, authenticated/password-changed; no query or body. Reject arbitrary requesterId/window parameters with `400 INVALID_QUERY`. All predicates use authenticated requester ID. Backend aggregates across all owned Tickets using specification section 9; never return the full collection.

`200` shape (zero-data example):

```json
{
  "asOf": "2026-10-07T05:00:00.000Z",
  "window": { "start": "2026-09-30T05:00:00.000Z", "end": "2026-10-07T05:00:00.000Z" },
  "displayTimeZone": "Asia/Bangkok",
  "metrics": {
    "openTickets": { "count": 0, "drillDown": { "destination": "/tickets", "query": { "statusGroup": "active" } } },
    "waitingForRequester": { "count": 0, "drillDown": { "destination": "/tickets", "query": { "currentStatus": "WAITING_FOR_REQUESTER" } } },
    "recentlyUpdated": { "count": 0, "drillDown": { "destination": "/tickets", "query": { "updatedFrom": "2026-09-30T05:00:00.000Z", "updatedTo": "2026-10-07T05:00:00.000Z", "sortBy": "updatedAt", "sortOrder": "desc" } } },
    "recentlyResolved": { "count": 0, "drillDown": { "destination": "/tickets", "query": { "recentlyResolvedFrom": "2026-09-30T05:00:00.000Z", "recentlyResolvedTo": "2026-10-07T05:00:00.000Z" } } }
  },
  "attentionRequired": [],
  "recentTickets": [],
  "resolvedTickets": []
}
```

Lists contain section 2.2 summaries, at most 5 each. Ownership applies to every count/list/drill-down. Empty values are valid `200`, not 404. `400` invalid query; `401/403/500` common. No client-calculated count or requester identity field is accepted.

## 6. IT Staff and Administrator Dashboard / Drill-Down

### 6.1 GET `/api/staff/dashboard`

IT Staff/Administrator; no query/body; invalid query `422 INVALID_QUERY`. `200` shares asOf/window/displayTimeZone with section 5 and returns:

- `metrics.unassignedTickets`, `metrics.myTickets`, `metrics.recentlyUpdated`, `metrics.myActions`: `{count,drillDown}` using exact predicates/destinations in specification section 9.
- `metrics.byStatus`: object with all eight existing uppercase status keys, each `{count,drillDown}`; each link supplies `status=<key>`.
- `metrics.byItPriority`: LOW/MEDIUM/HIGH objects, each `{count,drillDown}`; links supply `statusGroup=active&itPriority=<key>`.
- `recentTickets`, `urgentTickets`: at most 5 section 2.2 Ticket summaries each.
- `myRecentActions`: at most 5 section 2.2 Action summaries, including only completed Actions performed by caller within returned window.
- `urgentDrillDown:{destination:"/staff/tickets",query:{statusGroup:"active",itPriority:"HIGH"}}` for the urgent section's View all link.

Zero responses populate every bucket and use empty arrays; errors `401/403/422/500`. `byStatus` includes terminal Tickets; byItPriority/unassigned/myTickets use ACTIVE; recentlyUpdated uses all statuses. Personal metrics use caller ID, not Ticket Owner for myActions and not Action performer for myTickets. Administrator has its own personal scope; no user-account metrics are returned.

### 6.2 GET `/api/staff/dashboard/actions`

Backend for hash-screen `/staff/dashboard/actions`. IT Staff/Administrator. Query required `completedFrom`, `completedTo` offset-qualified ISO instants with from≤to; optional page/pageSize per section 2.3. No performer/userId query is accepted. `200` common envelope of Action summaries; predicate COMPLETED and performedById=caller, completedAt inclusively within supplied window; order completedAt desc/id asc. Empty `200`; invalid query `422`; `401/403/500` common. Row links open `/staff/tickets/:ticketId` and focus Action ID. This makes current-user Actions available beyond the five dashboard previews.

### 6.3 Existing Ticket list query extensions

Retain every existing accepted key, search, sort, default and response envelope. New values are ANDed with existing filters; conflicting status/statusGroup combinations are invalid, not silently ignored.

| List endpoint | New/extended query | Meaning |
|---|---|---|
| GET `/api/tickets` | `currentStatus` supports all eight enums | Exact status; retain NEW compatibility |
| Both Ticket lists | `statusGroup=active` | ACTIVE set; cannot combine with currentStatus/status |
| Both Ticket lists | `updatedFrom`, `updatedTo` | Required pair of offset-qualified ISO instants, inclusive bounds on Ticket.updatedAt |
| GET `/api/tickets` | `recentlyResolvedFrom`, `recentlyResolvedTo` | Required pair; current status RESOLVED/CLOSED and COALESCE(resolvedAt,updatedAt) within bounds; sorts effective resolution time desc, id asc |
| GET `/api/staff/tickets` | `owner=me|unassigned` | Server caller ID or assignedToUserId null; no client owner ID |

All date pairs require from≤to; reject partial pairs, repeated/non-scalar values and unsupported query keys. Recently-resolved filter cannot combine with status/statusGroup or explicit sort overrides; other filters remain compatible. Normal new-filter ordering uses requested existing sort; default My Tickets createdAt desc with ticketNumber desc ties; Staff updatedAt desc/id asc. Dashboard links explicitly set updated sort; newly extended recent/date ordering uses id asc ties to agree with previews. Specifically, when updatedFrom/updatedTo are supplied with sortBy=updatedAt and sortOrder=desc, both lists use updatedAt desc, id asc. Other existing My Tickets sort behavior remains unchanged. Requester query errors remain `400`; Staff errors remain `422`. Owner filters are server scoped even for Administrator. My Tickets page sizes/default/envelope and Staff 1–100/default20/envelope remain unchanged.

UI hash routes carry these query values and translate them to backend params; changing filters resets page 1. Server-provided destinations are allowlisted known local paths. An operational detail row opens `/staff/tickets/:id`, Requester row `/tickets/:id`. Newly changed data may alter counts between dashboard and drill-down; refresh shows current authoritative state without claiming frozen historical results.

## 7. HTTP Status and Safe Error Contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "fields": { "followUpNote": "Required when follow-up is needed." }
  }
}
```

`fields` is optional and only contains safe field messages. This reuses the existing error shape; do not invent a competing envelope.

| HTTP | Meaning / examples |
|---|---|
| 200 | GET/PATCH/indication success |
| 201 | Newly created Action |
| 400 | Malformed JSON or inherited Requester query validation; JSON parse failures must not surface as 500 |
| 401 | `UNAUTHORIZED`, missing/expired/inactive session |
| 403 | `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `CSRF_INVALID`; no protected payload |
| 404 | `NOT_FOUND`, malformed/missing Ticket/Action or Requester-unowned Ticket; generic indistinguishable message |
| 409 | `STALE_UPDATE`, `RESOLUTION_BLOCKED`, `INVALID_STATUS_TRANSITION`, `INVALID_ACTION_TRANSITION`, `ACTION_FIELD_IMMUTABLE`, `TICKET_NOT_ACTIVE`, `DUPLICATE_ACTION`, `OWNER_ALREADY_ASSIGNED`, inherited indication/account conflicts |
| 422 | `VALIDATION_ERROR`, `INVALID_QUERY`, `INVALID_STATUS` and inherited owner/priority validation; preserve current project distinction from 400 |
| 500 | Exactly existing `{error:{code:"INTERNAL_ERROR",message:"Internal server error"}}`; details logged server-side only |

New endpoints reject validation atomically. Do not include latest private content in 409 payloads; clients use an authorized GET to refresh. Existing 413 attachment limits and other inherited endpoint-specific codes remain intact.

## 8. Concurrency and Safe Failure

Integer versions start at 1 for legacy Tickets/new Actions. Action/workflow writes carry expected versions; mismatches return `409 STALE_UPDATE` and no write commits. A normal database transaction keeps each individual mutation atomic; no additional concurrency infrastructure is required.

The backend checks the parent version for Action, status, owner and priority writes, so competing browser edits fail safely instead of silently overwriting. Existing account safety rules remain enforced by Administrator endpoints.

The UI disables duplicate clicks while a create is pending. If experience shows retries can still create duplicates, add a simple unique request key constraint and return `409 DUPLICATE_ACTION`; otherwise require a reload after an unknown timeout.

Dashboard counts and previews use one backend query operation and one server `asOf`; list pages are ordinary current reads using the returned window. Mutation responses refresh detail and dashboard data; no external notifications or background analytics are added.
