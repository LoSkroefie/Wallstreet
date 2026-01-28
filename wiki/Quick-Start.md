# Quick Start Tutorial

Get started with Wallstreet Platform in 10 minutes.

## Prerequisites

- ✅ [Installation complete](Installation)
- ✅ API running on http://localhost:3000
- ✅ curl or similar HTTP client installed

## Step 1: Verify API is Running

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Wallstreet API is healthy",
  "timestamp": "2026-01-28T12:00:00.000Z",
  "environment": "development",
  "version": "v1"
}
```

✅ If you see this, your API is working!

## Step 2: Register a User

Create your first user account:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

Response includes your JWT token:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here"
  }
}
```

💡 **Save your token!** You'll need it for the next steps.

## Step 3: Login (Alternative to Registration)

If you already have an account, login instead:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

Or use the default admin account:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wallstreet.com",
    "password": "Admin123!"
  }'
```

## Step 4: Save Your Token

**For bash/Linux/Mac:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**For PowerShell/Windows:**
```powershell
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Now you can use `$TOKEN` in subsequent commands.

## Step 5: Get Your Profile

Verify authentication works:

```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "user",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2026-01-28T12:00:00.000Z",
    "lastLogin": "2026-01-28T12:05:00.000Z"
  }
}
```

## Step 6: Create an Account

Create your first financial account:

```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountType": "checking",
    "currency": "USD"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "account-uuid",
    "accountNumber": "WS123456789012",
    "accountType": "checking",
    "currency": "USD",
    "balance": 0.00,
    "availableBalance": 0.00,
    "status": "active",
    "createdAt": "2026-01-28T12:10:00.000Z"
  }
}
```

💡 **Save your account ID!** You'll need it for transactions.

## Step 7: Make a Deposit

Add funds to your account:

```bash
ACCOUNT_ID="account-uuid"  # Use the ID from Step 6

curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "'$ACCOUNT_ID'",
    "amount": 1000.00,
    "transactionType": "deposit",
    "currency": "USD",
    "description": "Initial deposit"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "transaction-uuid",
    "accountId": "account-uuid",
    "transactionType": "deposit",
    "amount": 1000.00,
    "currency": "USD",
    "status": "pending",
    "description": "Initial deposit",
    "referenceNumber": "TXN-1706443200-ABC123",
    "createdAt": "2026-01-28T12:15:00.000Z"
  }
}
```

## Step 8: Process the Transaction

Approve and process the pending transaction:

```bash
TRANSACTION_ID="transaction-uuid"  # Use the ID from Step 7

curl -X POST http://localhost:3000/api/v1/transactions/$TRANSACTION_ID/process \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Transaction processed successfully"
  }
}
```

## Step 9: Check Your Balance

Verify the deposit was processed:

```bash
curl -X GET http://localhost:3000/api/v1/accounts/$ACCOUNT_ID/balance \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "balance": 1000.00,
    "availableBalance": 1000.00,
    "currency": "USD"
  }
}
```

🎉 **Success!** You now have $1,000.00 in your account!

## Step 10: View Transaction History

See all your transactions:

```bash
curl -X GET "http://localhost:3000/api/v1/transactions/account/$ACCOUNT_ID?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction-uuid",
        "transactionType": "deposit",
        "amount": 1000.00,
        "currency": "USD",
        "status": "completed",
        "description": "Initial deposit",
        "referenceNumber": "TXN-1706443200-ABC123",
        "createdAt": "2026-01-28T12:15:00.000Z",
        "completedAt": "2026-01-28T12:16:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

## Complete Example Script

**Bash/Linux/Mac:**
```bash
#!/bin/bash

# 1. Register
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!","firstName":"John","lastName":"Doe"}')

# 2. Extract token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')

# 3. Create account
ACCOUNT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountType":"checking","currency":"USD"}')

# 4. Extract account ID
ACCOUNT_ID=$(echo $ACCOUNT_RESPONSE | jq -r '.data.id')

# 5. Make deposit
TXN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"$ACCOUNT_ID\",\"amount\":1000,\"transactionType\":\"deposit\",\"currency\":\"USD\"}")

# 6. Extract transaction ID
TXN_ID=$(echo $TXN_RESPONSE | jq -r '.data.id')

# 7. Process transaction
curl -s -X POST http://localhost:3000/api/v1/transactions/$TXN_ID/process \
  -H "Authorization: Bearer $TOKEN"

# 8. Check balance
curl -s -X GET http://localhost:3000/api/v1/accounts/$ACCOUNT_ID/balance \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ Complete! Check balance above."
```

**PowerShell/Windows:**
```powershell
# 1. Register
$registerResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"john@example.com","password":"SecurePass123!","firstName":"John","lastName":"Doe"}'

# 2. Extract token
$token = $registerResponse.data.token

# 3. Create account
$accountResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/accounts" `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body '{"accountType":"checking","currency":"USD"}'

# 4. Extract account ID
$accountId = $accountResponse.data.id

# 5. Make deposit
$txnResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/transactions" `
  -Headers @{"Authorization"="Bearer $token"} `
  -ContentType "application/json" `
  -Body "{`"accountId`":`"$accountId`",`"amount`":1000,`"transactionType`":`"deposit`",`"currency`":`"USD`"}"

# 6. Process transaction
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/transactions/$($txnResponse.data.id)/process" `
  -Headers @{"Authorization"="Bearer $token"}

# 7. Check balance
$balance = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/v1/accounts/$accountId/balance" `
  -Headers @{"Authorization"="Bearer $token"}

Write-Host "✅ Complete! Balance: $($balance.data.balance) $($balance.data.currency)"
```

## Using Swagger UI (Easiest Method)

1. **Open browser:** http://localhost:3000/api-docs

2. **Authorize:**
   - Click "Authorize" button (top right)
   - Login first to get token
   - Paste token with "Bearer " prefix
   - Click "Authorize"

3. **Test endpoints:**
   - Click any endpoint
   - Click "Try it out"
   - Fill in parameters
   - Click "Execute"
   - See response below

## Next Steps

Now that you've completed the basics:

- ✅ [Explore all API endpoints](API-Documentation)
- ✅ [Learn about authentication](Authentication)
- ✅ [Understand rate limiting](Rate-Limiting)
- ✅ [Review database schema](Database-Schema)
- ✅ [Read security best practices](Security)

## Troubleshooting

**Token expired?**
```bash
# Login again to get new token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!"}'
```

**Rate limited?**
Wait 15 minutes or check [Rate Limiting Guide](Rate-Limiting).

**Other issues?**
Check [Installation Guide](Installation) or [create an issue](https://github.com/YOUR_USERNAME/Wallstreet/issues).

---

**Congratulations!** 🎉 You've completed the Quick Start tutorial!
