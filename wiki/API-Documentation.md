# API Documentation

Complete reference for all Wallstreet Platform API endpoints.

## Base URL

```
Development: http://localhost:3000
Production:  https://api.wallstreet.com
```

## API Version

Current version: **v1**

All endpoints are prefixed with `/api/v1` except health checks.

## Interactive Documentation

Visit **Swagger UI** for interactive API testing:
- Local: http://localhost:3000/api-docs
- Production: https://api.wallstreet.com/api-docs

## Authentication

See detailed [Authentication Guide](Authentication).

**Quick reference:**

### JWT Token
```bash
Authorization: Bearer <your-jwt-token>
```

### API Key
```bash
x-api-key: <your-api-key>
```

## Endpoints Overview

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Authentication | 6 | Varies |
| Accounts | 5 | Yes |
| Transactions | 4 | Yes |
| Health Checks | 4 | No |
| **Total** | **19** | - |

---

## Authentication Endpoints

### POST /api/v1/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "createdAt": "2026-01-28T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here"
  },
  "message": "Registration successful"
}
```

### POST /api/v1/auth/login

Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here"
  },
  "message": "Login successful"
}
```

### GET /api/v1/auth/profile

Get current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "user",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2026-01-28T12:00:00.000Z",
    "lastLogin": "2026-01-28T14:00:00.000Z"
  }
}
```

### PUT /api/v1/auth/profile

Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+9876543210"
}
```

**Response:** `200 OK`

### POST /api/v1/auth/change-password

Change user password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response:** `200 OK`

### POST /api/v1/auth/logout

Logout current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## Accounts Endpoints

### POST /api/v1/accounts

Create a new account.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "accountType": "checking",
  "currency": "USD"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "accountNumber": "WS123456789012",
    "accountType": "checking",
    "currency": "USD",
    "balance": 0.00,
    "availableBalance": 0.00,
    "status": "active",
    "createdAt": "2026-01-28T12:00:00.000Z"
  }
}
```

### GET /api/v1/accounts

List all user accounts.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "accountNumber": "WS123456789012",
      "accountType": "checking",
      "currency": "USD",
      "balance": 1000.00,
      "availableBalance": 1000.00,
      "status": "active",
      "createdAt": "2026-01-28T12:00:00.000Z"
    }
  ]
}
```

### GET /api/v1/accounts/:id

Get account details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

### GET /api/v1/accounts/:id/balance

Get account balance.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "balance": 1000.00,
    "availableBalance": 950.00,
    "currency": "USD"
  }
}
```

### DELETE /api/v1/accounts/:id

Close an account (balance must be 0).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## Transactions Endpoints

### POST /api/v1/transactions

Create a new transaction.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "accountId": "account-uuid",
  "amount": 100.00,
  "transactionType": "deposit",
  "currency": "USD",
  "description": "Monthly deposit",
  "metadata": {}
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "accountId": "account-uuid",
    "transactionType": "deposit",
    "amount": 100.00,
    "currency": "USD",
    "status": "pending",
    "description": "Monthly deposit",
    "referenceNumber": "TXN-1234567890-ABC123",
    "metadata": {},
    "createdAt": "2026-01-28T12:00:00.000Z"
  }
}
```

### GET /api/v1/transactions/:id

Get transaction details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

### POST /api/v1/transactions/:id/process

Process a pending transaction.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

### GET /api/v1/transactions/account/:accountId

List account transactions with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional: pending, completed, failed)
- `type` (optional: deposit, withdrawal, transfer)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

## Health Check Endpoints

### GET /health

Basic health check (no auth required).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Wallstreet API is healthy",
  "timestamp": "2026-01-28T12:00:00.000Z",
  "environment": "development",
  "version": "v1"
}
```

### GET /health/detailed

Detailed health with service status.

**Response:** `200 OK` or `503 Service Unavailable`
```json
{
  "success": true,
  "timestamp": "2026-01-28T12:00:00.000Z",
  "services": {
    "api": "healthy",
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### GET /health/db

Database-specific health check.

### GET /health/redis

Redis-specific health check.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limiting

See [Rate Limiting Guide](Rate-Limiting) for details.

**Default Limits:**
- General API: 100 requests / 15 minutes
- Auth endpoints: 5 requests / 15 minutes

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706443200
```

---

## Testing with cURL

See full examples in [Quick Start Guide](Quick-Start).

## Testing with Postman

Import the OpenAPI spec from `/api-docs` into Postman for easy testing.

---

**Next:** [Authentication Guide](Authentication)
