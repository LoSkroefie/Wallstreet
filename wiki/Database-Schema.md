# Database Schema

Complete database structure for the Wallstreet Platform.

## Overview

Wallstreet uses **PostgreSQL 14+** with a relational schema designed for:
- Financial transactions
- User management
- Account operations
- Audit logging
- Integration management

## Database: `wallstreet_dev`

**Tables**: 8  
**Indexes**: 15+  
**Triggers**: 6  
**Views**: 1

---

## Tables

### 1. users

Stores user accounts and authentication information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

**Indexes:**
- `idx_users_email` - Fast email lookups
- `idx_users_status` - Filter by status
- `idx_users_created_at` - Sort by registration date

**Roles:**
- `user` - Standard user
- `admin` - Administrator

**Status:**
- `active` - Active account
- `suspended` - Temporarily disabled
- `closed` - Permanently closed

---

### 2. api_keys

API keys for programmatic access.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '{}',
  rate_limit INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_api_keys_user_id` - User's keys
- `idx_api_keys_is_active` - Active keys only

**Permissions JSONB:**
```json
{
  "read:accounts": true,
  "write:transactions": true,
  "admin:users": false
}
```

---

### 3. accounts

Financial accounts for users.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_number VARCHAR(50) UNIQUE NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  balance DECIMAL(15, 2) DEFAULT 0.00,
  available_balance DECIMAL(15, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_accounts_user_id` - User's accounts
- `idx_accounts_account_number` - Unique account lookup
- `idx_accounts_status` - Filter by status

**Account Types:**
- `checking`
- `savings`
- `investment`
- `business`

**Account Number Format:** `WS` + 12 digits (e.g., `WS123456789012`)

---

### 4. transactions

Financial transactions on accounts.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  description TEXT,
  reference_number VARCHAR(100) UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

**Indexes:**
- `idx_transactions_account_id` - Account transactions
- `idx_transactions_status` - Filter by status
- `idx_transactions_created_at` - Sort by date
- `idx_transactions_reference_number` - Unique reference lookup

**Transaction Types:**
- `deposit`
- `withdrawal`
- `transfer`
- `credit`
- `debit`

**Status:**
- `pending` - Awaiting processing
- `completed` - Successfully processed
- `failed` - Processing failed

**Reference Number Format:** `TXN-{timestamp}-{random}` (e.g., `TXN-1706443200-ABC123`)

---

### 5. audit_logs

Audit trail for all system actions.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_audit_logs_user_id` - User's actions
- `idx_audit_logs_resource_type` - Filter by resource
- `idx_audit_logs_created_at` - Sort by date

**Actions:**
- `USER_REGISTERED`
- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `ACCOUNT_CREATED`
- `TRANSACTION_CREATED`
- `PROFILE_UPDATED`
- `PASSWORD_CHANGED`

---

### 6. webhooks

Webhook configurations for event notifications.

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_webhooks_user_id`
- `idx_webhooks_is_active`

**Events:**
- `transaction.created`
- `transaction.completed`
- `account.created`
- `user.updated`

---

### 7. webhook_deliveries

Webhook delivery attempts and results.

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 1,
  delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);
```

**Indexes:**
- `idx_webhook_deliveries_webhook_id`
- `idx_webhook_deliveries_delivered`
- `idx_webhook_deliveries_created_at`

---

### 8. integration_configs

Third-party integration configurations.

```sql
CREATE TABLE integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  credentials JSONB,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_integration_configs_user_id`
- `idx_integration_configs_integration_type`

**Integration Types:**
- `stripe`
- `paypal`
- `plaid`
- `quickbooks`
- `salesforce`

---

## Views

### account_summaries

Aggregated account information with transaction counts.

```sql
CREATE VIEW account_summaries AS
SELECT 
  a.id,
  a.user_id,
  a.account_number,
  a.account_type,
  a.balance,
  a.available_balance,
  COUNT(t.id) as transaction_count,
  MAX(t.created_at) as last_transaction_date
FROM accounts a
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id;
```

---

## Triggers

### update_updated_at_column()

Automatically updates `updated_at` timestamp on row modification.

**Applied to:**
- `users`
- `api_keys`
- `accounts`
- `transactions`
- `webhooks`
- `integration_configs`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## Relationships

```
users (1) ───< (N) api_keys
  │
  ├───< (N) accounts ───< (N) transactions
  │
  ├───< (N) webhooks ───< (N) webhook_deliveries
  │
  ├───< (N) integration_configs
  │
  └───< (N) audit_logs
```

---

## Sample Data

### Default Admin User

```sql
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES (
  'admin@wallstreet.com',
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8qMKLE0fPF9pzqKw7VQfP9TkYYKzNq',
  'Admin',
  'User',
  'admin',
  true
);
```

**Credentials:**
- Email: `admin@wallstreet.com`
- Password: `Admin123!`

---

## Database Operations

### Initialize Database

```bash
# Using Docker
docker exec -i wallstreet-postgres psql -U wallstreet -d wallstreet_dev < scripts/database/init.sql

# Direct connection
psql -U wallstreet -d wallstreet_dev -f scripts/database/init.sql
```

### Backup Database

```bash
pg_dump -U wallstreet wallstreet_dev > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U wallstreet -d wallstreet_dev < backup_20260128.sql
```

### Check Database Size

```sql
SELECT 
  pg_size_pretty(pg_database_size('wallstreet_dev')) as size;
```

### View Table Sizes

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance Considerations

### Index Strategy

- **UUID Primary Keys**: Fast lookups, universally unique
- **Email Index**: Unique constraint + fast authentication
- **Foreign Key Indexes**: Efficient joins
- **Timestamp Indexes**: Fast date range queries
- **Status Indexes**: Quick filtering

### Query Optimization

**Good:**
```sql
-- Use indexes
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM transactions WHERE account_id = 'uuid' ORDER BY created_at DESC;
```

**Avoid:**
```sql
-- Table scan
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- No index on LOWER(email)
```

### Connection Pooling

Configured in `platform-core/config/database.js`:

```javascript
const pool = new Pool({
  max: 20,                // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Security

### Password Hashing

- Algorithm: **bcrypt**
- Rounds: **10**
- Never store plain passwords

### API Key Hashing

- Algorithm: **SHA-256 with salt**
- Salt from environment variable
- Keys hashed before storage

### SQL Injection Prevention

All queries use parameterized statements:

```javascript
// ✅ SAFE
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ DANGEROUS
const result = await query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

---

## Migration Strategy

### Future Migrations

```sql
-- migrations/001_add_2fa.sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
```

### Rollback Plan

Always create rollback scripts:

```sql
-- migrations/001_add_2fa_rollback.sql
ALTER TABLE users DROP COLUMN two_factor_enabled;
ALTER TABLE users DROP COLUMN two_factor_secret;
```

---

## Monitoring Queries

### Active Connections

```sql
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'wallstreet_dev';
```

### Long Running Queries

```sql
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active'
AND query_start < now() - interval '1 minute';
```

### Table Statistics

```sql
SELECT schemaname, tablename, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

---

## Next Steps

- ✅ [Review API endpoints](API-Documentation)
- ✅ [Understand authentication](Authentication)
- ✅ [Learn about caching](Caching)
- ✅ [Explore deployment](Deployment)

---

**Schema Version**: 1.0.0  
**Last Updated**: January 2026  
**Maintained By**: Wallstreet Platform Team
