# API Reference

All endpoints are prefixed with `/api`. Authentication is via JWT in httpOnly cookies.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register new user + organization |
| `POST` | `/auth/login` | Login with username, password, orgSlug |
| `GET` | `/auth/me` | Get current authenticated user |
| `POST` | `/auth/logout` | Logout (clears cookie) |

### POST `/auth/register`

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "username": "string",
  "password": "string",
  "orgName": "string",
  "orgSlug": "string"
}
```

Creates both the organization and the user (as admin).

### POST `/auth/login`

```json
{
  "username": "string",
  "password": "string",
  "orgSlug": "string"
}
```

Returns user object and sets `ttt_token` httpOnly cookie.

## Organizations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/org` | any | List user's organizations |
| `GET` | `/org/:orgId` | any | Get organization details |
| `PUT` | `/org/:orgId` | admin | Update organization |
| `DELETE` | `/org/:orgId` | admin | Delete organization |

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/org/:orgId/user` | any | List users in org |
| `POST` | `/org/:orgId/user` | admin/manager | Create user |
| `PUT` | `/org/:orgId/user/:userId` | admin/manager | Update user |
| `DELETE` | `/org/:orgId/user/:userId` | admin | Delete user |

### POST/PUT Body

```json
{
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "password": "string (optional on PUT)",
  "role": "admin | manager | member",
  "isActive": true
}
```

## Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/org/:orgId/project` | any | List projects |
| `POST` | `/org/:orgId/project` | admin/manager | Create project |
| `GET` | `/org/:orgId/project/:projectId` | any | Get project |
| `PUT` | `/org/:orgId/project/:projectId` | admin/manager | Update project |
| `DELETE` | `/org/:orgId/project/:projectId` | admin | Delete project |

### POST/PUT Body

```json
{
  "name": "string",
  "key": "string (uppercase)",
  "description": "string (optional)",
  "color": "#hex (optional, default: #1976D2)",
  "leadId": "userId (optional)",
  "isActive": true
}
```

## Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/org/:orgId/project/:projectId/ticket` | any | List tickets |
| `POST` | `/org/:orgId/project/:projectId/ticket` | any | Create ticket |
| `GET` | `/org/:orgId/project/:projectId/ticket/:ticketId` | any | Get ticket |
| `PUT` | `/org/:orgId/project/:projectId/ticket/:ticketId` | any | Update ticket |
| `DELETE` | `/org/:orgId/project/:projectId/ticket/:ticketId` | any | Delete ticket |
| `GET` | `/org/:orgId/ticket/search?q=...` | any | Search tickets |

### POST/PUT Body

```json
{
  "summary": "string",
  "description": "string (optional)",
  "status": "open | in_progress | done | closed",
  "priority": "lowest | low | medium | high | highest",
  "assigneeId": "userId (optional)",
  "estimatedHours": 0
}
```

Ticket `key` is auto-generated on create: `{projectKey}-{sequenceNumber}`.

## Time Entries

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/org/:orgId/timeentry?startDate=&endDate=` | any | Get entries by date range |
| `GET` | `/org/:orgId/timeentry/summary?startDate=&endDate=` | any | Get daily summary |
| `POST` | `/org/:orgId/timeentry` | any | Create time entry |
| `PUT` | `/org/:orgId/timeentry/:id` | any | Update time entry |
| `DELETE` | `/org/:orgId/timeentry/:id` | any | Delete time entry |

### GET Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `startDate` | `yyyy-MM-dd` | Range start (required) |
| `endDate` | `yyyy-MM-dd` | Range end (required) |
| `userId` | ObjectId | Filter by user (defaults to current user) |

### POST Body

```json
{
  "ticketId": "string (required)",
  "date": "yyyy-MM-dd (required)",
  "startTime": "HH:mm (required)",
  "endTime": "HH:mm (required)",
  "description": "string (optional)"
}
```

`durationMinutes` and `projectId` are auto-calculated from the ticket and times.

### PUT Body

All fields optional. Duration is recalculated when both `startTime` and `endTime` are provided.

```json
{
  "ticketId": "string",
  "date": "yyyy-MM-dd",
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "description": "string"
}
```

## Export

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/org/:orgId/export/excel` | Download Excel with formulas |
| `POST` | `/org/:orgId/export/pdf` | Download PDF |

### POST Body

```json
{
  "startDate": "yyyy-MM-dd (required)",
  "endDate": "yyyy-MM-dd (required)",
  "locale": "en | de (optional, default: en)",
  "userId": "string (optional)",
  "descriptionOverrides": {
    "entryId": "custom description text"
  }
}
```

### Response

- **Excel:** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **PDF:** `Content-Type: application/pdf`

Both return binary file downloads with `Content-Disposition: attachment`.

See [Export Details](export.md) for column layout and formula documentation.

## Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

Returns `{ status: "ok", timestamp: "..." }`.
