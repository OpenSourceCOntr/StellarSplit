# StellarSplit API Reference

Complete API reference for the StellarSplit backend. All endpoints are relative to a base URL (e.g. `https://api.stellarsplit.com` or `http://localhost:3000`). The application uses a **global prefix** `api`, so every path in this document is prefixed with `/api` (e.g. `/api/health`, `/api/payments/submit`).

---

## Table of Contents

1. [Authentication](#authentication)
2. [Quick-Start: Full Split Flow](#quick-start-full-split-flow)
3. [Health](#health)
4. [Splits](#splits)
5. [Participants](#participants)
6. [Items](#items)
7. [Payments](#payments)
8. [Activities](#activities)
9. [Currency](#currency)
10. [Recurring Splits](#recurring-splits)
11. [Split Templates](#split-templates)
12. [Groups](#groups)
13. [Receipts](#receipts)
14. [Split History](#split-history)
15. [Search](#search)
16. [Friends](#friends)
17. [Notifications](#notifications)
18. [Analytics](#analytics)
19. [Export & Reporting](#export--reporting)
20. [Webhooks](#webhooks)
21. [Disputes](#disputes)
22. [Governance](#governance)
23. [Compliance](#compliance)
24. [Settlement](#settlement)
25. [Templates](#templates)
26. [Batch](#batch)
27. [Fraud Detection](#fraud-detection)
28. [Short Links](#short-links)
29. [Reputation](#reputation)
30. [Error Codes](#error-codes)

---

## Authentication

Many endpoints expect an authenticated user. The API supports **Bearer token (JWT)** authentication.

### Header

Include the JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

### When Required

- **Export** (`/api/export/*`): All routes use `JwtAuthGuard`; Bearer token required.
- **Settlement**, **Templates**, **Groups**, **Split Templates**, **Short Links**, **Friends**, **Notifications (preferences)**: Expect `req.user` (e.g. `req.user.walletAddress`, `req.user.id`); send a valid JWT so the backend can resolve the user.
- **Payments**, **Currency**, **Health**, **Search**, **Analytics**, **Compliance**, **Disputes**, **Governance**, **Webhooks**, **Receipts**, **Activities**, **Items**: May be public or use optional auth depending on configuration.

### Example

```bash
curl -X GET "https://api.stellarsplit.com/api/export/list" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Quick-Start: Full Split Flow

End-to-end example: create a split, add participants, (optionally) add items, then submit and verify a payment.  
*Note: Steps 1–2 use the Splits and Participants APIs; if your deployment uses a separate service for these, call that service’s base URL instead of `/api`.*

### 1. Create a split

**Request**

```http
POST /api/splits
Content-Type: application/json

{
  "creatorId": "GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM",
  "title": "Dinner at Pizza Place",
  "currency": "USD",
  "totalAmount": 75.50,
  "taxAmount": 6.80,
  "tipAmount": 12.00,
  "splitType": "equal",
  "status": "active"
}
```

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "creatorId": "GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM",
  "title": "Dinner at Pizza Place",
  "currency": "USD",
  "totalAmount": 75.50,
  "status": "active",
  "createdAt": "2026-02-26T12:00:00.000Z"
}
```

### 2. Add participants

**Request**

```http
POST /api/participants
Content-Type: application/json

{
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice",
  "walletAddress": "GABC1234CDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM",
  "email": "alice@example.com",
  "amountOwed": 37.75,
  "amountPaid": 0,
  "paymentStatus": "pending"
}
```

**Response** `201 Created`

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice",
  "walletAddress": "GABC1234CDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM",
  "amountOwed": 37.75,
  "amountPaid": 0,
  "paymentStatus": "pending"
}
```

### 3. (Optional) Add line items

**Request**

```http
POST /api/items
Content-Type: application/json

{
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Margherita Pizza",
  "quantity": 1,
  "unitPrice": 18.00,
  "totalPrice": 18.00,
  "category": "food",
  "assignedToIds": ["660e8400-e29b-41d4-a716-446655440001"]
}
```

### 4. Submit payment (after user pays on Stellar)

**Request**

```http
POST /api/payments/submit
Content-Type: application/json

{
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "participantId": "660e8400-e29b-41d4-a716-446655440001",
  "stellarTxHash": "a3c5f8b2e1d4..."
}
```

**Response** `200 OK`

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "participantId": "660e8400-e29b-41d4-a716-446655440001",
  "txHash": "a3c5f8b2e1d4...",
  "amount": 37.75,
  "asset": "XLM",
  "status": "confirmed",
  "createdAt": "2026-02-26T12:30:00.000Z"
}
```

### 5. Verify transaction

**Request**

```http
GET /api/payments/verify/a3c5f8b2e1d4...
```

**Response** `200 OK`

```json
{
  "verified": true,
  "paymentId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "confirmed"
}
```

### 6. Get payment stats for the split

**Request**

```http
GET /api/payments/stats/550e8400-e29b-41d4-a716-446655440000
```

**Response** `200 OK`

```json
{
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "totalOwed": 75.50,
  "totalPaid": 37.75,
  "pendingCount": 1,
  "confirmedCount": 1
}
```

---

## Health

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/health` | Check API health |

### GET /api/health

Returns service health and uptime. No authentication required.

**Response** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-02-26T12:00:00.000Z",
  "uptime": 123.456
}
```

---

## Splits

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/splits` | Create a split |
| `GET` | `/api/splits` | List splits (optional `?creatorId=`) |
| `GET` | `/api/splits/:id` | Get one split |
| `PATCH` | `/api/splits/:id` | Update a split |
| `PATCH` | `/api/splits/:id/status` | Update split status |
| `DELETE` | `/api/splits/:id` | Delete a split |

*Note: Splits CRUD may be provided by a separate service or the same app when the root `splits` module is mounted.*

### POST /api/splits

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `creatorId` | string | Yes | Creator identifier (e.g. wallet address) |
| `title` | string | Yes | Max 255 chars |
| `currency` | string | Yes | Currency code, max 10 chars |
| `totalAmount` | number | Yes | Positive, 2 decimal places |
| `taxAmount` | number | No | Non-negative |
| `tipAmount` | number | No | Non-negative |
| `status` | enum | No | `active`, `completed`, `partial` |
| `splitType` | enum | No | Split type |
| `receiptImageUrl` | string (URL) | No | Receipt image URL |
| `paymentDeadline` | string (ISO date) | No | Optional deadline |

**Response** `201 Created` — Created split object.

### GET /api/splits

**Query**

- `creatorId` (optional): Filter by creator.

**Response** `200 OK` — Array of splits.

### GET /api/splits/:id

**Response** `200 OK` — Single split. `404` if not found.

### PATCH /api/splits/:id

**Request body** — Partial split fields (same as create).

**Response** `200 OK` — Updated split.

### PATCH /api/splits/:id/status

**Request body**

```json
{ "status": "completed" }
```

**Response** `200 OK` — Updated split.

### DELETE /api/splits/:id

**Response** `204 No Content`.

---

## Participants

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/participants` | Create a participant |
| `GET` | `/api/participants` | List all participants |
| `GET` | `/api/participants/:id` | Get one participant |
| `PATCH` | `/api/participants/:id` | Update a participant |
| `DELETE` | `/api/participants/:id` | Delete a participant |

*Note: Participants CRUD may be provided by a separate service or the same app when the root `participants` module is mounted.*

### POST /api/participants

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `splitId` | UUID | Yes | Split ID |
| `name` | string | Yes | Display name |
| `walletAddress` | string | Yes | Stellar address (G...) |
| `email` | string | No | Email |
| `amountOwed` | number | Yes | ≥ 0 |
| `amountPaid` | number | No | ≥ 0, default 0 |
| `paymentStatus` | enum | No | e.g. `pending`, `paid` |
| `paymentTxHash` | string | No | Stellar tx hash |
| `notificationSent` | boolean | No | Default false |

**Response** `201 Created` — Created participant.

### GET /api/participants

**Response** `200 OK` — Array of participants.

### GET /api/participants/:id

**Response** `200 OK` — Single participant. `404` if not found.

### PATCH /api/participants/:id

**Request body** — Partial participant fields.

**Response** `200 OK` — Updated participant.

### DELETE /api/participants/:id

**Response** `204 No Content`.

---

## Items

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/items` | Create an item |
| `GET` | `/api/items` | List items for a split (`?splitId=`) |
| `GET` | `/api/items/:id` | Get one item |
| `PATCH` | `/api/items/:id` | Update an item |
| `DELETE` | `/api/items/:id` | Delete an item |

### POST /api/items

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `splitId` | UUID | Yes | Split ID |
| `name` | string | Yes | Item description |
| `quantity` | integer | Yes | ≥ 1 |
| `unitPrice` | number | Yes | Unit price |
| `totalPrice` | number | Yes | Total price |
| `category` | string | No | Category |
| `assignedToIds` | UUID[] | Yes | Participant IDs for this item |

**Response** `201 Created`

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "splitId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Margherita Pizza",
  "quantity": 1,
  "unitPrice": 18.00,
  "totalPrice": 18.00,
  "assignedToIds": ["660e8400-e29b-41d4-a716-446655440001"]
}
```

### GET /api/items?splitId=:splitId

**Response** `200 OK` — Array of items for the split.

### GET /api/items/:id

**Response** `200 OK` — Single item.

### PATCH /api/items/:id

**Request body** — Partial item fields.

**Response** `200 OK` — Updated item.

### DELETE /api/items/:id

**Response** `200 OK`.

---

## Payments

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/payments/submit` | Submit a payment (Stellar tx hash) |
| `GET` | `/api/payments/verify/:txHash` | Verify a transaction |
| `GET` | `/api/payments/:txHash` | Get payment by tx hash |
| `GET` | `/api/payments/split/:splitId` | List payments for a split |
| `GET` | `/api/payments/participant/:participantId` | List payments for a participant |
| `GET` | `/api/payments/stats/:splitId` | Payment stats for a split |
| `GET` | `/api/payments/path-payment/:splitId/:participantId` | Path payment tx (multi-currency) |
| `GET` | `/api/payments/supported-assets` | List supported assets |
| `GET` | `/api/payments/multi-currency/:paymentId` | Multi-currency payment details |

### POST /api/payments/submit

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `splitId` | UUID | Yes | Split ID |
| `participantId` | UUID | Yes | Participant ID |
| `stellarTxHash` | string | Yes | Stellar transaction hash |

**Response** `200 OK` — Payment record (id, splitId, participantId, txHash, amount, asset, status, createdAt).

### GET /api/payments/verify/:txHash

**Response** `200 OK` — Verification result (e.g. `verified`, `paymentId`, `status`).

### GET /api/payments/:txHash

**Response** `200 OK` — Payment by transaction hash.

### GET /api/payments/split/:splitId

**Response** `200 OK` — Array of payments for the split.

### GET /api/payments/participant/:participantId

**Response** `200 OK` — Array of payments for the participant.

### GET /api/payments/stats/:splitId

**Response** `200 OK` — Aggregated stats (e.g. totalOwed, totalPaid, pendingCount, confirmedCount).

### GET /api/payments/path-payment/:splitId/:participantId

**Query**

- `sourceAsset` (required): Source asset code.
- `destinationAmount` (required): Amount to receive.
- `slippageTolerance` (optional): Default 0.01.

**Response** `200 OK` — Path payment transaction for the client to sign and submit.

### GET /api/payments/supported-assets

**Response** `200 OK`

```json
{
  "assets": ["XLM", "USDC", "EURC", ...]
}
```

### GET /api/payments/multi-currency/:paymentId

**Response** `200 OK` — Multi-currency payment details.

---

## Activities

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/activities` | Create activity (internal) |
| `GET` | `/api/activities/:userId` | Paginated activities for user |
| `PATCH` | `/api/activities/:userId/mark-read` | Mark activities as read |
| `PATCH` | `/api/activities/:userId/mark-all-read` | Mark all as read |
| `GET` | `/api/activities/:userId/unread-count` | Unread count |
| `DELETE` | `/api/activities/:userId/:activityId` | Delete an activity |

### POST /api/activities

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User (e.g. wallet address) |
| `activityType` | enum | Yes | Activity type |
| `splitId` | UUID | No | Related split |
| `metadata` | object | No | Extra data |

**Response** `201 Created` — Activity object.

### GET /api/activities/:userId

**Query** — Pagination/sort (see service). **Response** `200 OK` — Paginated activities.

### PATCH /api/activities/:userId/mark-read

**Request body** — e.g. `{ "activityIds": ["id1", "id2"] }`.

**Response** `200 OK` — `{ "updated": number }`.

### PATCH /api/activities/:userId/mark-all-read

**Response** `200 OK` — `{ "updated": number }`.

### GET /api/activities/:userId/unread-count

**Response** `200 OK` — `{ "count": number }`.

### DELETE /api/activities/:userId/:activityId

**Response** `204 No Content`.

---

## Currency

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/currency/rates` | Exchange rates |
| `POST` | `/api/currency/convert` | Convert amount |
| `GET` | `/api/currency/supported` | Supported currencies |
| `GET` | `/api/currency/format` | Format amount with symbol |
| `POST` | `/api/currency/cache/clear` | Clear rate cache |

### GET /api/currency/rates

**Response** `200 OK`

```json
{
  "USD": 1,
  "EUR": 0.85,
  "GBP": 0.73,
  "XLM": 0.22,
  "USDC": 1.00
}
```

### POST /api/currency/convert

**Request body**

```json
{
  "amount": 100,
  "from": "USD",
  "to": "EUR"
}
```

**Response** `200 OK`

```json
{
  "amount": 85.50,
  "rate": 0.855,
  "from": "USD",
  "to": "EUR"
}
```

### GET /api/currency/supported

**Response** `200 OK` — Array of currency codes, e.g. `["USD", "EUR", "GBP", "XLM", "USDC"]`.

### GET /api/currency/format?amount=100&currency=USD

**Response** `200 OK` — `{ "formatted": "$100.00" }`.

### POST /api/currency/cache/clear

**Response** `200 OK` — `{ "message": "Exchange rate cache cleared successfully" }`.

---

## Recurring Splits

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/recurring-splits` | Create recurring split |
| `GET` | `/api/recurring-splits/creator/:creatorId` | List by creator |
| `GET` | `/api/recurring-splits/stats/:creatorId` | Stats for creator |
| `GET` | `/api/recurring-splits/:id` | Get one |
| `PATCH` | `/api/recurring-splits/:id` | Update |
| `POST` | `/api/recurring-splits/:id/pause` | Pause |
| `POST` | `/api/recurring-splits/:id/resume` | Resume |
| `DELETE` | `/api/recurring-splits/:id` | Delete |
| `PATCH` | `/api/recurring-splits/:id/template` | Update template |
| `POST` | `/api/recurring-splits/:id/process-now` | Process now (admin/test) |

### POST /api/recurring-splits

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `creatorId` | string | Yes | Creator ID |
| `templateSplitId` | string | Yes | Template split UUID |
| `frequency` | enum | Yes | e.g. `daily`, `weekly`, `monthly` |
| `endDate` | string (date) | No | End date |
| `autoRemind` | boolean | No | Send reminders |
| `reminderDaysBefore` | number | No | Days before |
| `description` | string | No | Description |

**Response** `201 Created` — Recurring split entity.

### GET /api/recurring-splits/creator/:creatorId

**Response** `200 OK` — Array of recurring splits.

### GET /api/recurring-splits/stats/:creatorId

**Response** `200 OK`

```json
{
  "total": 5,
  "active": 3,
  "paused": 2,
  "nextOccurrences": [
    { "id": "uuid", "nextOccurrence": "2026-03-01T00:00:00.000Z" }
  ]
}
```

### GET /api/recurring-splits/:id

**Response** `200 OK` — Recurring split. `404` if not found.

### PATCH /api/recurring-splits/:id

**Request body** — Partial: `frequency`, `endDate`, `autoRemind`, `reminderDaysBefore`, `description`.

**Response** `200 OK` — Updated recurring split.

### POST /api/recurring-splits/:id/pause

**Response** `200 OK` — Updated recurring split (paused).

### POST /api/recurring-splits/:id/resume

**Response** `200 OK` — Updated recurring split (resumed).

### DELETE /api/recurring-splits/:id

**Response** `204 No Content`.

### PATCH /api/recurring-splits/:id/template

**Request body** — `totalAmount`, `description`.

**Response** `200 OK`.

### POST /api/recurring-splits/:id/process-now

**Response** `200 OK` — `{ "message": "Recurring split processed successfully" }`. `400` on failure.

---

## Split Templates

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/split-templates` | Create template |
| `GET` | `/api/split-templates` | List user templates |
| `POST` | `/api/split-templates/:id/create-split` | Create split from template |

*Requires authenticated user (e.g. `req.user.wallet`).*

### POST /api/split-templates

**Request body** — See `CreateSplitTemplateDto` (template name, items, participants, etc.).

**Response** `201 Created` — Template.

### GET /api/split-templates

**Response** `200 OK` — List of templates for the user.

### POST /api/split-templates/:id/create-split

**Response** `200 OK` — Created split from template.

---

## Groups

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/groups` | Create group |
| `PATCH` | `/api/groups/:id/add-member` | Add member |
| `PATCH` | `/api/groups/:id/remove-member` | Remove member |
| `POST` | `/api/groups/:id/split` | Create split from group |
| `GET` | `/api/groups/:id/activity` | Group activity |

*Expects `req.user.walletAddress`.*

### POST /api/groups

**Request body** — Group payload (e.g. name, members). **Response** `200 OK` — Group.

### PATCH /api/groups/:id/add-member

**Request body** — `wallet`, `role`. **Response** `200 OK`.

### PATCH /api/groups/:id/remove-member

**Request body** — `wallet`. **Response** `200 OK`.

### POST /api/groups/:id/split

**Response** `200 OK` — Split created from group.

### GET /api/groups/:id/activity

**Response** `200 OK` — Activity list.

---

## Receipts

Base path: **`/api/api/receipts`** (controller path is `api/receipts` with global prefix `api`).

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/api/receipts/upload/:splitId` | Upload receipt (multipart) |
| `GET` | `/api/api/receipts/split/:splitId` | List receipts for split |
| `GET` | `/api/api/receipts/:receiptId/signed-url` | Get signed URL |
| `DELETE` | `/api/api/receipts/:receiptId` | Soft-delete receipt |
| `GET` | `/api/api/receipts/:receiptId/ocr-data` | OCR data |
| `POST` | `/api/api/receipts/:receiptId/reprocess-ocr` | Reprocess OCR |

Upload uses `multipart/form-data` with field `file`. Expects `req.user.walletAddress`.

---

## Split History

Base path: **`/api/api/split-history`**.

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/api/split-history/user/:walletAddress` | User history |
| `GET` | `/api/api/split-history/stats/:walletAddress` | User stats |

**Response** `200 OK` — History array or stats object.

---

## Search

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/search/splits` | Full-text search splits |

### POST /api/search/splits

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Search text |
| `filters` | object | No | dateFrom, dateTo, minAmount, maxAmount, status[], participants[] |
| `sort` | string | No | createdAt_desc, createdAt_asc, amount_desc, amount_asc |
| `limit` | number | No | 1–100, default 20 |
| `cursor` | string | No | Pagination cursor (base64) |

**Response** `200 OK`

```json
{
  "results": [...],
  "nextCursor": "base64...",
  "total": 42
}
```

---

## Friends

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/friends/request` | Send friend request |
| `POST` | `/api/friends/accept` | Accept request |
| `POST` | `/api/friends/block` | Block user |
| `GET` | `/api/friends` | List friends |

*Expects `req.user.id`.*

### POST /api/friends/request

**Request body** — `{ "friendId": "user-id" }`. **Response** `200 OK`.

### POST /api/friends/accept

**Request body** — `{ "friendId": "user-id" }`. **Response** `200 OK`.

### POST /api/friends/block

**Request body** — `{ "friendId": "user-id" }`. **Response** `200 OK`.

### GET /api/friends

**Response** `200 OK` — List of friends.

---

## Notifications

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/notifications/preferences/:userId` | Get email preferences |
| `PATCH` | `/api/notifications/preferences/:userId` | Update preferences |

### PATCH /api/notifications/preferences/:userId

**Request body**

```json
{
  "invitations": true,
  "reminders": true,
  "receivedConfirmation": true,
  "completion": true
}
```

**Response** `200 OK` — Updated preferences. `404` if user not found.

---

## Analytics

Base path: **`/api/api/analytics`**.

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/api/analytics/spending-trends` | Spending trends |
| `GET` | `/api/api/analytics/category-breakdown` | Category breakdown |
| `GET` | `/api/api/analytics/top-partners` | Top partners |
| `GET` | `/api/api/analytics/monthly-report/:month` | Monthly report |
| `POST` | `/api/api/analytics/export` | Enqueue export |
| `GET` | `/api/api/analytics/reports/:id` | Report status |

**Query params** — e.g. `dateFrom`, `dateTo`, `userId`, `limit` where applicable.

---

## Export & Reporting

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/export/create` | Create export job |
| `GET` | `/api/export/status/:id` | Export job status |
| `GET` | `/api/export/download/:id` | Download file |
| `GET` | `/api/export/list` | List jobs (paginated) |
| `POST` | `/api/export/templates` | Create export template |
| `GET` | `/api/export/templates` | List templates |
| `DELETE` | `/api/export/templates/:id` | Delete template |
| `POST` | `/api/export/schedule` | Schedule recurring export |
| `GET` | `/api/export/formats` | Export formats |
| `GET` | `/api/export/report-types` | Report types |
| `GET` | `/api/export/eligibility` | Eligibility/limits |
| `GET` | `/api/export/stats` | Export stats |

**Authentication:** All export endpoints require Bearer token (`JwtAuthGuard`).

### POST /api/export/create

**Request body** — `CreateExportDto`: format (CSV, PDF, JSON, QBO, OFX, XLSX), reportType, filters (startDate, endDate, categories, participants, minAmount, maxAmount, currency), etc.

**Response** `201 Created` — Export job (id, status, format, reportType, createdAt).

### GET /api/export/status/:id

**Response** `200 OK` — Export job. `404` if not found or not owned.

### GET /api/export/download/:id

**Response** — Redirect to file or binary download. `404` if not found or expired.

### GET /api/export/list

**Query** — `page`, `limit`. **Response** `200 OK` — `{ jobs, total, page, totalPages }`.

---

## Webhooks

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/webhooks` | Create webhook |
| `GET` | `/api/webhooks` | List webhooks (?userId=) |
| `GET` | `/api/webhooks/:id` | Get webhook |
| `PATCH` | `/api/webhooks/:id` | Update webhook |
| `DELETE` | `/api/webhooks/:id` | Delete webhook |
| `POST` | `/api/webhooks/:id/test` | Test webhook |
| `GET` | `/api/webhooks/:id/deliveries` | Delivery logs (?limit=) |
| `GET` | `/api/webhooks/:id/stats` | Delivery stats |

### POST /api/webhooks

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Owner user ID |
| `url` | string (URL) | Yes | Endpoint URL |
| `events` | string[] | Yes | Event types (e.g. SPLIT_CREATED, PAYMENT_RECEIVED) |
| `secret` | string | Yes | HMAC secret |

**Response** `201 Created` — Webhook entity.

### POST /api/webhooks/:id/test

**Request body** — `{ "eventType": "string", "payload": {} }`. Optional; default test payload used if omitted.

**Response** `200 OK` — `{ "message": "Test webhook triggered", "webhookId", "eventType" }`.

### GET /api/webhooks/:id/stats

**Response** `200 OK`

```json
{
  "total": 100,
  "success": 95,
  "failed": 5,
  "pending": 0,
  "successRate": 95.0
}
```

---

## Disputes

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/disputes` | File dispute |
| `POST` | `/api/disputes/:disputeId/evidence` | Add evidence |
| `GET` | `/api/disputes/:disputeId/evidence` | List evidence |
| `POST` | `/api/disputes/:disputeId/submit-review` | Submit for review |
| `POST` | `/api/disputes/:disputeId/resolve` | Resolve (admin) |
| `POST` | `/api/disputes/:disputeId/reject` | Reject (admin) |
| `POST` | `/api/disputes/:disputeId/appeal` | Appeal |
| `POST` | `/api/disputes/:disputeId/request-evidence` | Request more evidence (admin) |
| `GET` | `/api/disputes/:disputeId` | Get dispute |
| `GET` | `/api/disputes/split/:splitId` | Disputes for split |
| `GET` | `/api/disputes` | List disputes (admin, with query) |
| `GET` | `/api/disputes/:disputeId/audit-trail` | Audit trail |

### POST /api/disputes

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `splitId` | UUID | Yes | Split ID |
| `disputeType` | enum | Yes | Dispute type |
| `description` | string | Yes | 10–5000 chars |

**Response** `201 Created` — Dispute (split is frozen).

### POST /api/disputes/:disputeId/evidence

**Request body** — `fileKey`, `fileName`, `mimeType`, `size`, optional `description`, `metadata`.

**Response** `201 Created` — Evidence record.

### POST /api/disputes/:disputeId/resolve

**Request body** — `outcome` (adjust_balances, refund, cancel_split, no_change), `resolution` (10–5000 chars), optional `details`.

**Response** `200 OK` — Resolved dispute.

### POST /api/disputes/:disputeId/reject

**Request body** — `{ "reason": "string" }`. **Response** `200 OK`.

### POST /api/disputes/:disputeId/appeal

**Request body** — `appealReason` (10–5000 chars). **Response** `200 OK`.

### GET /api/disputes

**Query** — `splitId`, `status`, `raisedBy`, `page`, `limit`. **Response** `200 OK` — `{ disputes, total }`.

---

## Governance

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/governance/proposals` | Create proposal |
| `GET` | `/api/governance/proposals` | List proposals (?status=) |
| `GET` | `/api/governance/proposals/:id` | Get proposal |
| `POST` | `/api/governance/vote` | Cast vote |
| `POST` | `/api/governance/vote-with-type` | Cast vote with type |
| `GET` | `/api/governance/proposals/:id/votes` | List votes |
| `POST` | `/api/governance/execute` | Execute proposal |
| `POST` | `/api/governance/veto` | Veto proposal |
| `POST` | `/api/governance/proposals/:id/finalize` | Finalize proposal |

### POST /api/governance/proposals

**Request body** — `proposer`, `description`, `actions[]` (actionType, target, parameters, calldata), optional `quorumPercentage` (1–100).

**Response** `201 Created` — `{ success: true, data: { proposalId, proposal } }`.

### POST /api/governance/vote

**Request body** — `proposalId`, `voter`, `support` (boolean), optional `reason`.

**Response** `200 OK` — `{ success: true, message: "Vote cast successfully" }`.

### POST /api/governance/execute

**Request body** — `{ "proposalId": "uuid" }`. **Response** `200 OK`.

### POST /api/governance/veto

**Request body** — `proposalId`, `vetoer`, `reason`. **Response** `200 OK`.

---

## Compliance

Base path: **`/api/api/compliance`**.

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/api/compliance/export/request` | Request export |
| `GET` | `/api/api/compliance/export/:requestId/status` | Export status |
| `GET` | `/api/api/compliance/categories` | Categories (?userId=) |
| `POST` | `/api/api/compliance/categories` | Create category |
| `PUT` | `/api/api/compliance/splits/:splitId/category` | Assign category to split |
| `GET` | `/api/api/compliance/summary` | Summary (?userId=, ?year=) |
| `GET` | `/api/api/compliance/tax-deductible-total` | Tax deductible (?userId=, ?period=) |

**Request bodies** — Include `userId` where required by implementation.

---

## Settlement

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/settlement/suggestions` | Settlement suggestions |
| `POST` | `/api/settlement/suggestions/refresh` | Refresh suggestions |
| `GET` | `/api/settlement/net-position` | Net position |
| `POST` | `/api/settlement/suggestions/snooze` | Snooze suggestions |
| `PUT` | `/api/settlement/steps/:stepId/complete` | Complete step (body: txHash) |

*Expects `req.user.id` and `req.user.walletAddress`.*

**Response** — Suggestions or net position object; complete step returns verification result.

---

## Templates

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/templates/suggestions` | Suggestions (?participantCount=) |
| `POST` | `/api/templates` | Create template |
| `GET` | `/api/templates/my-templates` | List my templates |
| `PUT` | `/api/templates/:id` | Update template |
| `DELETE` | `/api/templates/:id` | Delete template |
| `POST` | `/api/templates/:id/pin` | Toggle pin |
| `POST` | `/api/templates/:id/use` | Track usage |

*Expects `req.user.walletAddress`.*

---

## Batch

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/batch/splits` | Create batch of splits |
| `POST` | `/api/batch/payments` | Create batch of payments |
| `GET` | `/api/batch/:batchId/status` | Batch status |
| `GET` | `/api/batch` | List batches (?page=, ?limit=, ?status=) |
| `POST` | `/api/batch/:batchId/retry` | Retry failed operations |
| `DELETE` | `/api/batch/:batchId/cancel` | Cancel batch |
| `GET` | `/api/batch/:batchId/operations` | Batch operations (?status=) |

*Note: Batch module may not be registered in the default app.*

### POST /api/batch/splits

**Request body** — `splits[]`: each `{ totalAmount, participants: [{ userId, amount, walletAddress? }], description?, preferredCurrency?, creatorWalletAddress? }`. Optional `options`: chunkSize, priority, delay, concurrency, retryAttempts.

**Response** `201 Created` — Batch job info.

### POST /api/batch/payments

**Request body** — `payments[]`: each `{ splitId, participantId, stellarTxHash }`. Optional `options`.

**Response** `201 Created` — Batch job info.

### POST /api/batch/:batchId/retry

**Request body** — `{ "operationIds": ["id1", "id2"] }` (optional; if omitted, all failed may be retried).

**Response** `200 OK`.

---

## Fraud Detection

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/fraud/alerts` | List alerts (?status=, ?page=, ?limit=) |
| `GET` | `/api/fraud/alerts/:id` | Get alert |
| `POST` | `/api/fraud/alerts/:id/resolve` | Resolve alert |
| `GET` | `/api/fraud/splits/:id/analysis` | Split analysis |
| `GET` | `/api/fraud/stats` | Stats |
| `POST` | `/api/fraud/feedback` | Submit feedback |
| `POST` | `/api/fraud/analyze/split` | Analyze split |
| `POST` | `/api/fraud/analyze/payment` | Analyze payment |

*Note: Fraud module may not be registered in the default app.*

---

## Short Links

Base path: **`/api/api/short-links`**. *Module may not be registered in the default app.*

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/api/short-links/generate` | Generate short link |
| `GET` | `/api/api/short-links/:shortCode/resolve` | Resolve and track |
| `GET` | `/api/api/short-links/:shortCode/analytics` | Analytics |
| `POST` | `/api/api/short-links/nfc-payload/:splitId` | NFC payload for split |
| `DELETE` | `/api/api/short-links/:shortCode` | Delete link |

*Expects `req.user.wallet` for generate.*

---

## Reputation

Base path: **`/api/api/reputation`**. *Module may not be registered in the default app.*

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/api/reputation/:walletAddress` | Reputation for wallet |
| `GET` | `/api/api/reputation/my-score` | Current user score |
| `GET` | `/api/api/reputation/:walletAddress/history` | History |
| `GET` | `/api/api/reputation/leaderboard/trusted-payers` | Leaderboard |
| `GET` | `/api/api/reputation/badge/:walletAddress` | Badge |

*my-score expects `req.user.walletAddress`.*

---

## Error Codes

The API uses standard HTTP status codes and NestJS exception filters. Typical responses:

### 400 Bad Request

- **Cause:** Validation failed (invalid body, query, or params).
- **Response:** JSON body with `message` and often `error: "Bad Request"`. With `ValidationPipe`, details may include which fields failed.

**Example**

```json
{
  "statusCode": 400,
  "message": ["stellarTxHash must be a string"],
  "error": "Bad Request"
}
```

### 401 Unauthorized

- **Cause:** Missing or invalid Bearer token where auth is required.
- **Response:** `message` indicating authentication failure.

### 403 Forbidden

- **Cause:** Authenticated but not allowed to perform the action (e.g. export for another user).
- **Response:** `message` describing the restriction.

### 404 Not Found

- **Cause:** Resource not found (e.g. split, participant, export job, webhook).
- **Response:** `message` with resource identifier.

**Example**

```json
{
  "statusCode": 404,
  "message": "Export job not found",
  "error": "Not Found"
}
```

### 409 Conflict

- **Cause:** Business rule conflict (e.g. duplicate webhook, recurring split conflict).
- **Response:** `message` describing the conflict.

### 429 Too Many Requests

- **Cause:** Rate limiting (e.g. ThrottlerGuard, custom rate limit).
- **Response:** Retry-After or message asking to slow down.

### 500 Internal Server Error

- **Cause:** Unhandled server error.
- **Response:** Generic error message; details may be logged server-side only.

### Validation (400) field details

When `forbidNonWhitelisted` and `whitelist` are enabled, extra properties are rejected and validation errors list allowed fields. Use only documented request body fields to avoid 400.

---

## Markdown and GitHub

This document uses standard Markdown. It renders cleanly on GitHub (headers, tables, code blocks, lists). Optional: add a link from the repo root README to `docs/API.md`.
