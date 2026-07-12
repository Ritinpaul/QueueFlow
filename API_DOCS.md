# QueueFlow — API Documentation

> **Interactive Docs:** The live Swagger UI is available at `http://localhost:3001/docs` when the API server is running.

---

## Base URL

```
http://localhost:3001/api/v1
```

---

## Authentication

QueueFlow uses two authentication methods:

| Method | Used For | Header |
|--------|----------|--------|
| **JWT Bearer Token** | Dashboard / user-facing endpoints | `Authorization: Bearer <token>` |
| **API Key** | Job submission from your application | `Authorization: Bearer <sk_...>` |

Obtain a JWT by calling `POST /auth/login`. Obtain an API key by creating a Project in the dashboard.

---

## Auth Endpoints

### `POST /auth/register`

Register a new user. Automatically creates a personal organization.

**Request Body:**
```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "securepassword123"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "ada@example.com",
      "name": "Ada Lovelace"
    }
  }
}
```

**Error `400` — Email already registered:**
```json
{
  "success": false,
  "error": { "code": "EMAIL_EXISTS", "message": "Email is already registered" }
}
```

---

### `POST /auth/login`

Authenticate and receive a JWT.

**Request Body:**
```json
{
  "email": "ada@example.com",
  "password": "securepassword123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "ada@example.com",
      "name": "Ada Lovelace"
    }
  }
}
```

**Error `401` — Invalid credentials:**
```json
{
  "success": false,
  "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" }
}
```

---

### `GET /auth/me`

Returns the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <jwt>`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## Project Endpoints

> All project endpoints require `Authorization: Bearer <jwt>`.

### `GET /projects`

List all projects belonging to the authenticated user's organizations.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production Cluster",
      "description": null,
      "orgId": "uuid",
      "apiKeyPrefix": "sk_ABCDEFGH",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /projects`

Create a new project. The raw API key is returned **once** and cannot be retrieved again.

**Request Body:**
```json
{
  "name": "Production Cluster",
  "description": "My production environment"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production Cluster",
    "orgId": "uuid",
    "apiKeyPrefix": "sk_ABCDEFGH",
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "apiKey": "sk_ABCDEFGHIJKLMNOP1234567890123456"
}
```

> ⚠️ Save the `apiKey` immediately. It will not be shown again.

---

## Queue Endpoints

> All queue endpoints require `Authorization: Bearer <jwt>`.

### `GET /queues`

List all queues for the authenticated user's projects.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "email-notifications",
      "projectId": "uuid",
      "status": "active",
      "concurrencyLimit": 10,
      "rateLimitPerMinute": null,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /queues`

Create a new queue within a project.

**Request Body:**
```json
{
  "projectId": "uuid",
  "name": "email-notifications",
  "description": "Handles outbound email delivery",
  "concurrencyLimit": 5,
  "rateLimitPerMinute": 100
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "email-notifications",
    "projectId": "uuid",
    "status": "active",
    "concurrencyLimit": 5,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## Job Endpoints

> Job endpoints use **API Key** authentication: `Authorization: Bearer sk_...`

### `POST /jobs`

Submit a new job to a queue.

**Headers:** `Authorization: Bearer sk_<your-api-key>`

**Request Body:**
```json
{
  "queueName": "email-notifications",
  "type": "send-welcome-email",
  "payload": {
    "userId": "123",
    "email": "user@example.com"
  },
  "idempotencyKey": "welcome-email-user-123",
  "priority": 5,
  "scheduledAt": "2026-01-02T10:00:00.000Z",
  "maxAttempts": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queueName` | string | ✅ | Name of the target queue |
| `type` | string | ✅ | Job handler identifier |
| `payload` | object | ❌ | Data passed to the handler |
| `idempotencyKey` | string | ❌ | Prevents duplicate submissions |
| `priority` | number | ❌ | Higher = processed first (default: 0) |
| `scheduledAt` | ISO datetime | ❌ | Delay execution until this time |
| `cronExpression` | string | ❌ | Recurring schedule (e.g. `0 * * * *`) |
| `maxAttempts` | number | ❌ | Max retry count (default: 3, max: 20) |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "scheduledAt": "2026-01-02T10:00:00.000Z"
  }
}
```

**Response `200` — Idempotent (duplicate key matched existing job):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "scheduledAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error `404` — Queue not found:**
```json
{
  "success": false,
  "error": { "code": "QUEUE_NOT_FOUND", "message": "Queue 'email-notifications' not found" }
}
```

---

### `GET /jobs`

List jobs with optional filtering.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `queueId` | uuid | Filter by queue |
| `status` | string | Filter by status (`pending`, `running`, `completed`, `failed`, `dead`) |
| `limit` | number | Results per page (default: 50, max: 200) |
| `offset` | number | Pagination offset |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "send-welcome-email",
      "status": "completed",
      "priority": 5,
      "attemptCount": 1,
      "maxAttempts": 3,
      "scheduledAt": "2026-01-01T00:00:00.000Z",
      "completedAt": "2026-01-01T00:00:01.123Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Health Endpoint

### `GET /health`

Returns the overall system health. No authentication required.

**Response `200`:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2026-01-01T01:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Response `503` — Service degraded:**
```json
{
  "status": "degraded",
  "services": {
    "database": "ok",
    "redis": "error"
  }
}
```

---

## Error Format

All errors follow a consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable description"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `EMAIL_EXISTS` | 400 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Resource does not exist |
| `QUEUE_NOT_FOUND` | 404 | Queue name not found for this project |
| `NO_ORGANIZATION` | 400 | User has no organization |
| `DUPLICATE_IDEMPOTENCY_KEY` | 200 | Job already submitted (idempotent return) |
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
