# Lab 2 API Contract

**Project:** TokTickIT IT Service Desk
**Sprint:** Individual Sprint 2 — Requester Ticketing MVP
**Base URL:** `http://localhost:3000/api`
**Related documents:** `specification.md`, `ui-spec.md`, `tests.md`

---

## 1. Conventions

### 1.1 Requester context

The selected Development Requester is transmitted in the `X-Requester-Id` request header on every endpoint except `/health`, `/categories`, `/related-systems`, and `/requesters`.

```
X-Requester-Id: 3
```

This header is **not authentication** (BR-03). The server validates on every request that the identified Requester exists and is active, and rejects the request otherwise. In Lab 3 this header is replaced by an authenticated session; no ownership logic changes.

| Condition | Response |
|---|---|
| Header missing or non-numeric | `400 REQUESTER_CONTEXT_MISSING` |
| Requester does not exist or is inactive | `400 REQUESTER_INVALID` |

### 1.2 Content types

- Requests and responses are `application/json; charset=utf-8`, except attachment upload (`multipart/form-data`) and attachment download (the stored content type).
- All timestamps are ISO 8601 UTC strings, for example `2026-08-31T09:14:00.000Z`.

### 1.3 Error shape

Every error response uses one shape (BR-39 — no stack traces, SQL text, or file paths):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "fields": {
      "summary": "Summary must be between 10 and 150 characters."
    }
  }
}
```

`fields` is present only for field-level validation failures.

### 1.4 Error codes

| Code | Status | Meaning |
|---|---|---|
| `REQUESTER_CONTEXT_MISSING` | 400 | No Requester header supplied |
| `REQUESTER_INVALID` | 400 | Requester unknown or inactive (BR-11) |
| `INVALID_QUERY` | 400 | Unknown, malformed, or out-of-range query parameter (BR-36) |
| `UNSUPPORTED_FILE_TYPE` | 400 | Attachment type not in the allowed list (BR-23) |
| `VALIDATION_ERROR` | 422 | Field-level validation failure (BR-15 to BR-20) |
| `NOT_FOUND` | 404 | Resource missing, not owned, or soft-removed (BR-14, BR-28) |
| `ATTACHMENT_LIMIT_REACHED` | 409 | Ticket already has five active attachments (BR-25) |
| `ATTACHMENT_ALREADY_REMOVED` | 409 | Removal attempted on a removed attachment (BR-29) |
| `FILE_TOO_LARGE` | 413 | Attachment exceeds 5 MB (BR-24) |
| `INTERNAL_ERROR` | 500 | Unexpected server error, generic message only |

### 1.5 Status code summary

| Status | Use |
|---|---|
| 200 | Successful retrieval, download, or soft removal |
| 201 | Ticket or Attachment created |
| 400 | Invalid input, invalid query, unsupported file type, bad Requester context |
| 404 | Not found, not owned, or removed |
| 409 | Conflict with a business rule |
| 413 | Payload too large |
| 422 | Field-level validation failure |
| 500 | Unexpected server error |

---

## 2. Reference data

### 2.1 `GET /api/health`

Carried over from Lab 1. No Requester context required.

**200 OK**
```json
{ "status": "ok", "service": "TokTickIT API" }
```

---

### 2.2 `GET /api/categories`

Returns active Categories for the Create Ticket and My Tickets filter controls.

**200 OK**
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

Ordered by `name` ascending. Inactive categories are excluded.

**Errors:** `500 INTERNAL_ERROR`

---

### 2.3 `GET /api/related-systems`

**200 OK**
```json
[
  { "id": 1, "name": "Campus Wi-Fi" },
  { "id": 2, "name": "Corporate Laptop" },
  { "id": 3, "name": "Email" },
  { "id": 4, "name": "Grade Submission App" },
  { "id": 5, "name": "LEB2 App" },
  { "id": 6, "name": "Printer" },
  { "id": 7, "name": "VPN" }
]
```

Ordered by `name` ascending. Inactive systems are excluded.

**Errors:** `500 INTERNAL_ERROR`

---

### 2.4 `GET /api/requesters`

Populates the Development Requester Selection dropdown. Returns **active Requesters only** (BR-09, AC-04).

**200 OK**
```json
[
  { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@kmutt.ac.th" },
  { "id": 2, "name": "Somchai Prasert", "email": "somchai.pras@kmutt.ac.th" },
  { "id": 3, "name": "David Lee", "email": "david.lee@kmutt.ac.th" },
  { "id": 4, "name": "Nisa Wongchai", "email": "nisa.wong@kmutt.ac.th" }
]
```

An empty array is a valid response and drives the empty state (AC-07).

**Errors:** `500 INTERNAL_ERROR`

---

## 3. Tickets

### 3.1 `POST /api/tickets`

Creates one validated Ticket for the Requester in `X-Requester-Id`.

**Request body**
```json
{
  "categoryId": 2,
  "relatedSystemId": 2,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started after last week's Windows update.",
  "requestedPriority": "MEDIUM"
}
```

**Field rules**

| Field | Type | Required | Rules |
|---|---|---|---|
| `categoryId` | integer | Yes | Must match an active Category (BR-17) |
| `relatedSystemId` | integer | Yes | Must match an active Related System (BR-17) |
| `summary` | string | Yes | Trimmed, 10–150 characters (BR-15, BR-19) |
| `description` | string | Yes | Trimmed, 20–5000 characters (BR-16, BR-19) |
| `requestedPriority` | enum | Yes | `LOW` \| `MEDIUM` \| `HIGH` (BR-18) |

`ticketNumber`, `ticketDate`, `currentStatus`, and `requesterId` are ignored if supplied. They are system-generated (BR-01, BR-02, BR-06).

**201 Created**
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requester": { "id": 3, "name": "David Lee" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster ...",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-31T09:14:00.000Z",
  "updatedAt": "2026-08-31T09:14:00.000Z",
  "attachments": []
}
```

**Errors**

| Status | Code | Cause |
|---|---|---|
| 400 | `REQUESTER_CONTEXT_MISSING` / `REQUESTER_INVALID` | Bad Requester context |
| 422 | `VALIDATION_ERROR` | Any field rule violated; `fields` names each one |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

Attachments are **not** part of this request. They are uploaded separately (D-06, BR-31).

---

### 3.2 `GET /api/tickets`

Paginated list of the selected Requester's own tickets. Ownership is applied in the database query, never in the client (FR-21, BR-13).

**Query parameters**

| Parameter | Type | Default | Permitted values |
|---|---|---|---|
| `search` | string | — | Free text, max 150 chars; matches `ticketNumber` or `summary`, case-insensitive partial (BR-33) |
| `categoryId` | integer | — | Existing Category id |
| `relatedSystemId` | integer | — | Existing Related System id |
| `requestedPriority` | enum | — | `LOW` \| `MEDIUM` \| `HIGH` |
| `currentStatus` | enum | — | `NEW` only in Lab 2 (BR-02). Any other value returns `400 INVALID_QUERY`; the enum widens when the status workflow arrives |
| `sortBy` | enum | `createdAt` | `ticketNumber` \| `createdAt` \| `updatedAt` |
| `sortOrder` | enum | `desc` | `asc` \| `desc` |
| `page` | integer | `1` | ≥ 1 |
| `pageSize` | integer | `10` | `10` \| `20` \| `50` (BR-35) |

Filters combine with AND (BR-37). Secondary sort is always `ticketNumber desc` for stable ordering (BR-34). Any unknown parameter name, malformed value, or out-of-range value returns `400 INVALID_QUERY` rather than falling back to a default (BR-36, D-08, AC-29).

**Example**
```
GET /api/tickets?search=laptop&categoryId=2&sortBy=createdAt&sortOrder=desc&page=1&pageSize=10
```

**200 OK**
```json
{
  "data": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-31T09:14:00.000Z",
      "updatedAt": "2026-08-31T09:14:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

An owned-but-empty result returns `data: []` with `totalItems: 0`. The client distinguishes empty state from no-results state by whether any search or filter is active (FR-26, AC-25, AC-26) — the API does not.

**Errors:** `400 INVALID_QUERY`, `400 REQUESTER_*`, `500 INTERNAL_ERROR`

---

### 3.3 `GET /api/tickets/:id`

Returns one Ticket the selected Requester owns, including attachment metadata.

**200 OK**
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requester": { "id": 3, "name": "David Lee" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster ...",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-31T09:14:00.000Z",
  "updatedAt": "2026-08-31T09:14:00.000Z",
  "attachments": [
    {
      "id": 7,
      "originalFilename": "battery-report.pdf",
      "contentType": "application/pdf",
      "fileSize": 184320,
      "uploadedAt": "2026-08-31T09:15:00.000Z",
      "isRemoved": false,
      "removedAt": null,
      "removedReason": null
    },
    {
      "id": 8,
      "originalFilename": "screenshot.png",
      "contentType": "image/png",
      "fileSize": 921600,
      "uploadedAt": "2026-08-31T09:16:00.000Z",
      "isRemoved": true,
      "removedAt": "2026-08-31T10:02:00.000Z",
      "removedReason": "Uploaded the wrong screenshot"
    }
  ]
}
```

Removed attachments are still listed as metadata (BR-28) but their content is not retrievable.

**Errors**

| Status | Code | Cause |
|---|---|---|
| 404 | `NOT_FOUND` | Ticket does not exist **or** belongs to a different Requester (BR-14, D-07, AC-03, AC-31) |
| 400 | `REQUESTER_*` | Bad Requester context |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

The 404-for-not-owned choice is deliberate: a 403 would confirm that another Requester's ticket exists.

---

## 4. Attachments

### 4.1 `POST /api/tickets/:id/attachments`

Uploads one attachment to an owned Ticket. `multipart/form-data`, single field `file`.

```
POST /api/tickets/42/attachments
Content-Type: multipart/form-data
X-Requester-Id: 3

file: <binary>
```

**Validation order** (cheapest rejection first)

1. Ticket exists and is owned → else `404 NOT_FOUND`
2. Active attachment count < 5 → else `409 ATTACHMENT_LIMIT_REACHED` (BR-25)
3. Size ≤ 5 MB → else `413 FILE_TOO_LARGE` (BR-24)
4. Extension and declared content type both allowed and consistent → else `400 UNSUPPORTED_FILE_TYPE` (BR-23)

Allowed: `.jpg` / `.jpeg` (`image/jpeg`), `.png` (`image/png`), `.webp` (`image/webp`), `.pdf` (`application/pdf`).

**201 Created**
```json
{
  "id": 9,
  "ticketId": 42,
  "originalFilename": "battery-report.pdf",
  "contentType": "application/pdf",
  "fileSize": 184320,
  "uploadedAt": "2026-08-31T09:15:00.000Z",
  "isRemoved": false
}
```

The file is written under a server-generated UUID filename outside the web root; the original name is display metadata only (BR-30). If the file is written but the metadata row fails, the orphaned file is deleted before the error is returned (BR-32).

**Errors:** `404 NOT_FOUND`, `409 ATTACHMENT_LIMIT_REACHED`, `413 FILE_TOO_LARGE`, `400 UNSUPPORTED_FILE_TYPE`, `500 INTERNAL_ERROR`

---

### 4.2 `GET /api/tickets/:id/attachments`

Attachment metadata for an owned Ticket, active and removed.

**200 OK**
```json
[
  {
    "id": 7,
    "originalFilename": "battery-report.pdf",
    "contentType": "application/pdf",
    "fileSize": 184320,
    "uploadedAt": "2026-08-31T09:15:00.000Z",
    "isRemoved": false,
    "removedAt": null,
    "removedReason": null
  }
]
```

Ordered by `uploadedAt` ascending.

**Errors:** `404 NOT_FOUND`, `400 REQUESTER_*`, `500 INTERNAL_ERROR`

---

### 4.3 `GET /api/attachments/:id/download`

Streams an active attachment belonging to a Ticket the selected Requester owns.

**200 OK**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="battery-report.pdf"
Content-Length: 184320

<binary>
```

The original filename is restored in `Content-Disposition` only; it is never used as a filesystem path.

**Errors**

| Status | Code | Cause |
|---|---|---|
| 404 | `NOT_FOUND` | Attachment missing, **removed** (BR-28, AC-19), or on a Ticket owned by another Requester (BR-13, AC-31) |
| 400 | `REQUESTER_*` | Bad Requester context |
| 500 | `INTERNAL_ERROR` | File missing on disk or read failure |

---

### 4.4 `PATCH /api/attachments/:id/remove`

Soft-removes an active attachment (BR-26). The row is retained; nothing is deleted from the database.

**Request body**
```json
{ "removedReason": "Uploaded the wrong screenshot" }
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `removedReason` | string | Yes | Trimmed, 5–200 characters (BR-27) |

**200 OK**
```json
{
  "id": 8,
  "ticketId": 42,
  "originalFilename": "screenshot.png",
  "contentType": "image/png",
  "fileSize": 921600,
  "uploadedAt": "2026-08-31T09:16:00.000Z",
  "isRemoved": true,
  "removedAt": "2026-08-31T10:02:00.000Z",
  "removedById": 3,
  "removedReason": "Uploaded the wrong screenshot"
}
```

**Errors**

| Status | Code | Cause |
|---|---|---|
| 404 | `NOT_FOUND` | Attachment missing or not owned (BR-29) |
| 409 | `ATTACHMENT_ALREADY_REMOVED` | Already removed (BR-29) |
| 422 | `VALIDATION_ERROR` | Missing or too-short reason (BR-27, AC-20) |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

## 5. Traceability

| Capability | Endpoint | FR | AC |
|---|---|---|---|
| Active Categories | `GET /api/categories` | FR-07 | AC-08 |
| Active Related Systems | `GET /api/related-systems` | FR-07 | AC-08 |
| Active Requesters | `GET /api/requesters` | FR-01 | AC-04, AC-06, AC-07 |
| Create Ticket | `POST /api/tickets` | FR-10, FR-12 | AC-01, AC-09, AC-10, AC-12 |
| List owned Tickets | `GET /api/tickets` | FR-21 to FR-26 | AC-22 to AC-29 |
| Owned Ticket Detail | `GET /api/tickets/:id` | FR-28, FR-29 | AC-03, AC-30, AC-31 |
| Upload Attachment | `POST /api/tickets/:id/attachments` | FR-15, FR-16 | AC-14, AC-15, AC-16 |
| Attachment metadata | `GET /api/tickets/:id/attachments` | FR-17 | AC-18 |
| Download Attachment | `GET /api/attachments/:id/download` | FR-18 | AC-17, AC-19 |
| Soft-remove Attachment | `PATCH /api/attachments/:id/remove` | FR-19, FR-20 | AC-18, AC-20 |

---

## 6. Lab 3 transition note

Only the identity mechanism changes in Lab 3. The `X-Requester-Id` header is replaced by an authenticated session or token, and the middleware that resolves it becomes an authentication middleware. Every ownership check, error code, and response shape defined above remains valid (BR-40, D-02).

---

*Prepared with AI specification-agent assistance. Reviewed, corrected, and approved by the student.*
