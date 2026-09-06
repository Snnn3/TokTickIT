# Lab 2 API Specification - TokTickIT REST Contract

Version: 1.0 | Date: 2026-08-24 | Companion to `specification.md` (BR/AC references in brackets).

## 1. Conventions

- Base URL: `/api`. Content type JSON unless multipart stated.
- Identity header: `X-Requester-Id: <active requester id>` REQUIRED on all endpoints below.
  Missing / unknown / inactive id -> `401` with code `AUTH_REQUIRED` [BR-03, BR-22].
  This is a Lab 2 test mechanism, not authentication.
- Timestamps ISO-8601 UTC [A10].
- Error envelope (all non-2xx):
  ```json
  { "error": { "code": "VALIDATION_FAILED", "message": "human summary",
               "details": [{ "field": "summary", "issue": "required" }] } }
  ```
- Safe errors: no stack traces or internals on 4xx/5xx.

## 2. Endpoints

### GET /api/requesters

Active Development Requesters for the Selection screen [FR-01, BR-04].

- Response `200`: `{ "requesters": [{ "id": 1, "name": "Anucha Wongchai", "email": "anucha.wongchai@example.com" }] }`
  ordered by name asc; inactive excluded [AC-19].
- Errors: `500 UNEXPECTED`.

### GET /api/reference/categories

- Response `200`: `{ "categories": [{ "id": 1, "name": "Hardware" }] }` active only, name asc.
- Errors: `500 UNEXPECTED`.

### GET /api/reference/systems

- Response `200`: `{ "systems": [{ "id": 1, "name": "Campus Wi-Fi" }] }` active only, name asc.
- Errors: `500 UNEXPECTED`.

### POST /api/tickets

Create one Ticket for the identified Requester; attachments atomic [FR-05, BR-14].

- Request: `multipart/form-data`

| Field | Type | Rules |
|---|---|---|
| summary | text | required, trimmed 1..150 [BR-07] |
| description | text | required, trimmed 1..5000 [BR-08] |
| categoryId | integer | active Category [BR-09] |
| systemId | integer | active RelatedSystem [BR-10] |
| requestedPriority | enum | LOW \| MEDIUM \| HIGH [BR-11] |
| files[] | file(s), optional | each <=5 MB; allowed mime image/jpeg,image/png,image/webp,application/pdf; max 5 total [BR-13] |

- Response `201`:
  ```json
  { "ticket": { "id": 12, "number": "TKT-2026-00001", "ticketDate": "2026-08-24T04:05:06.000Z",
      "status": "NEW", "requestedPriority": "MEDIUM", "summary": "...", "description": "...",
      "categoryId": 2, "systemId": 3,
      "requester": { "id": 1, "name": "Anucha Wongchai" },
      "attachments": [{ "id": 4, "filename": "evidence.png", "mimeType": "image/png", "sizeBytes": 20480 }] } }
  ```
- Errors:
  | Status | Code | When |
  |---|---|---|
  | 400 | VALIDATION_FAILED | field violations incl. unknown refs/priority, >5 files at create |
  | 401 | AUTH_REQUIRED | header missing/unknown/inactive |
  | 413 | FILE_TOO_LARGE | any file >5 MB |
  | 415 | UNSUPPORTED_TYPE | disallowed mime/ext |
  | 500 | UNEXPECTED | safe generic |

Atomicity: any invalid file -> nothing persisted [AC-10]. Number uniqueness inside transaction [BR-01].

### GET /api/tickets

Owned paginated list [FR-08, BR-06].

Query parameters:

| Param | Type | Default | Rules |
|---|---|---|---|
| search | string <=150 | - | case-insensitive contains on number OR summary [BR-19] |
| categoryId | integer | - | must be positive int if present |
| priority | enum | - | LOW \| MEDIUM \| HIGH |
| status | enum | - | only NEW accepted |
| sort | enum | updatedAt | updatedAt \| createdAt \| number [BR-20] |
| order | enum | desc | asc \| desc |
| page | integer >=1 | 1 | [BR-21] |
| pageSize | 5 \| 10 \| 20 | 10 | [BR-21] |

Any invalid value -> `400 INVALID_QUERY` with per-param details [AC-16].

- Response `200`:
  ```json
  { "tickets": [{ "id": 12, "number": "TKT-2026-00001", "summary": "Laptop battery drains quickly",
      "categoryId": 2, "categoryName": "Hardware", "requestedPriority": "MEDIUM",
      "status": "NEW", "createdAt": "...", "updatedAt": "..." }],
    "page": 1, "pageSize": 10, "total": 23, "totalPages": 3 }
  ```

### GET /api/tickets/:id

Owned detail incl. attachment metadata [FR-09, FR-13].

- `200`: ticket shape as POST response plus `"attachments"` array where each item includes
  `{id, filename, mimeType, sizeBytes, uploadedAt, removedAt: null | ts, removedReason: null | string}`.
- `404 NOT_FOUND` unknown id [AC-03 path]; `403 FORBIDDEN` another requester's ticket [BR-06];
  `401 AUTH_REQUIRED`; `400 INVALID_ID` non-numeric id.

### POST /api/tickets/:id/attachments

Add one attachment to an owned ticket [FR-10].

- Request `multipart/form-data`, single `file` field, same type/size rules as create.
- `201`: attachment metadata object.
- Errors: `400 VALIDATION_FAILED` (no file) | `404` | `403` | `409 LIMIT_REACHED` would exceed 5
  active [AC-09] | `413` | `415` | `500`.
- Failure leaves the ticket unchanged [BR-15]; client may retry.

### GET /api/attachments/:id

Attachment metadata for an owned attachment (through parent ticket).

- `200`: `{ "id", "ticketId", "filename", "mimeType", "sizeBytes", "uploadedAt", "removedAt", "removedReason" }`
- `404` | `403` | `401`.

### GET /api/attachments/:id/download

Stream bytes of an ACTIVE attachment [FR-11].

- `200`: binary body; headers `Content-Type` = stored mime, `Content-Disposition: attachment; filename="<original>"`,
  `Content-Length` = sizeBytes.
- `410 REMOVED` once soft-removed - metadata visible elsewhere but bytes never served again [BR-16, AC-11].
- `404` | `403` | `401`.

### DELETE /api/attachments/:id

Soft-remove an owned active attachment [FR-12, BR-16, BR-17].

- Request JSON: `{ "reason": "..." }` required, trimmed 1..300.
- `200`: `{ "removed": true, "removedAt": "<ts>" }`
- Errors: `400 VALIDATION_FAILED` missing reason | `409 ALREADY_REMOVED` repeat call |
  `404` | `403` | `401`.
- Bytes/metadata retained; download endpoint returns 410 thereafter; UI shows it disabled [AC-11, AC-12].

## 3. Status Code Summary

| Status | Uses |
|---|---|
| 200 | successful retrieval / soft removal |
| 201 | resource created (ticket, attachment) |
| 400 | invalid body/query/id, validation failures |
| 401 | X-Requester-Id missing, unknown, or inactive |
| 403 | authenticated identity does not own resource |
| 404 | resource does not exist |
| 409 | limit reached / already removed |
| 410 | download attempted on removed attachment |
| 413 | upload exceeds 5 MB |
| 415 | unsupported media type |
| 500 | unexpected server error (safe message) |

## 4. Ownership Model

Middleware resolves `X-Requester-Id` -> active RequesterUser or 401. Every ticket/attachment query
is joined/constrained through that requester id. Direct object ids from another requester behave as
FORBIDDEN (403), never leaking existence beyond what 404 already reveals for truly absent ids.
