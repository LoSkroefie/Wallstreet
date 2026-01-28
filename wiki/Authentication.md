# Authentication

Complete guide to authenticating with the Wallstreet Platform API.

## Authentication Methods

Wallstreet supports two authentication methods:

1. **JWT Tokens** - For user-based access
2. **API Keys** - For programmatic/service access

## JWT Token Authentication

### Overview

JWT (JSON Web Token) is used for user authentication. Tokens are issued after successful login and must be included in subsequent requests.

### Getting a Token

**1. Register a new user:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**2. Login to get token:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here"
  }
}
```

### Using the Token

Include the JWT token in the `Authorization` header:

```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Structure

JWT tokens contain:
- **User ID**
- **Email**
- **Role** (user, admin)
- **Expiration** (default: 24 hours)

### Token Expiration

Tokens expire after 24 hours by default. Use the refresh token to get a new JWT without re-authenticating.

**Refresh token flow:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

## API Key Authentication

### Overview

API keys are used for server-to-server communication and programmatic access.

### Generating an API Key

API keys are generated per user account through the admin dashboard or API.

**Generate key:**
```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App Integration",
    "permissions": ["read:accounts", "write:transactions"],
    "rateLimit": 1000
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "wsk_live_1234567890abcdef",
    "name": "My App Integration",
    "permissions": ["read:accounts", "write:transactions"],
    "rateLimit": 1000
  }
}
```

⚠️ **Important:** Save the API key securely. It won't be shown again!

### Using API Keys

Include the API key in the `x-api-key` header:

```bash
curl -X GET http://localhost:3000/api/v1/accounts \
  -H "x-api-key: wsk_live_1234567890abcdef"
```

### API Key Management

**List keys:**
```bash
GET /api/v1/api-keys
```

**Revoke a key:**
```bash
DELETE /api/v1/api-keys/:id
```

**Update permissions:**
```bash
PATCH /api/v1/api-keys/:id
```

## Role-Based Access Control (RBAC)

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Standard user | Own resources only |
| `admin` | Administrator | All resources + admin functions |

### Permission Checks

Certain endpoints require specific roles:

```javascript
// Admin only
GET /api/v1/admin/users
POST /api/v1/admin/settings

// User or Admin
GET /api/v1/accounts
POST /api/v1/transactions
```

### Role Authorization

Use the `authorize` middleware for role-based access:

```javascript
router.get('/admin/users', 
  authenticateJWT, 
  authorize('admin'), 
  getUsersController
);
```

## Security Best Practices

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

1. **Never expose tokens in URLs**
   ```bash
   # ❌ BAD
   GET /api/users?token=abc123
   
   # ✅ GOOD
   GET /api/users
   Authorization: Bearer abc123
   ```

2. **Use HTTPS in production**
3. **Store tokens securely** (localStorage/sessionStorage)
4. **Implement token rotation**
5. **Set appropriate expiration times**

### API Key Security

1. **Prefix keys** with environment indicator
   - Development: `wsk_dev_...`
   - Production: `wsk_live_...`

2. **Hash keys** before storing in database
3. **Rotate keys** regularly
4. **Monitor usage** for suspicious activity
5. **Implement rate limiting** per key

### Environment Variables

Never hardcode secrets:

```env
# .env
JWT_SECRET=your-super-secret-key-here
API_KEY_SALT=your-api-key-salt-here
```

Load in application:
```javascript
const jwtSecret = process.env.JWT_SECRET;
```

## Error Handling

### Common Auth Errors

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "No token provided",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

**401 Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

## Testing Authentication

### With cURL

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wallstreet.com","password":"Admin123!"}' \
  | jq -r '.data.token')

# 2. Use token
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### With Swagger UI

1. Go to http://localhost:3000/api-docs
2. Click **"Authorize"** button (top right)
3. Enter token: `Bearer <your-token>`
4. Click **"Authorize"**
5. Test endpoints with authentication

### With Postman

1. Import API from `/api-docs` OpenAPI spec
2. Set up environment variable for token
3. Add Authorization header automatically
4. Use pre-request scripts for token refresh

## Default Accounts

### Admin Account

```
Email: admin@wallstreet.com
Password: Admin123!
Role: admin
```

⚠️ **Change this password immediately!**

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Admin123!",
    "newPassword": "NewSecurePassword123!"
  }'
```

## Advanced Topics

### Custom Claims

Add custom data to JWT tokens:

```javascript
const token = generateToken({
  userId: user.id,
  email: user.email,
  role: user.role,
  customClaim: 'custom-value'
});
```

### Multi-Factor Authentication (MFA)

Coming in Phase 4. Will support:
- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification

### OAuth2 Integration

Coming in Phase 5. Will support:
- Google OAuth
- GitHub OAuth
- Microsoft OAuth

---

## Next Steps

- ✅ [Test API endpoints](API-Documentation)
- ✅ [Learn about rate limiting](Rate-Limiting)
- ✅ [Explore the database schema](Database-Schema)
- ✅ [Read security best practices](Security)

---

**Need Help?**

- [Create an issue](https://github.com/YOUR_USERNAME/Wallstreet/issues)
- [Join discussions](https://github.com/YOUR_USERNAME/Wallstreet/discussions)
- Check [FAQ](FAQ)
