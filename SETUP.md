# Wallstreet Platform - Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Git

### Installation Steps

#### 1. Clone and Install Dependencies
```bash
cd c:/Users/Administrator/Wallstreet
npm install
```

#### 2. Setup Environment Variables
```bash
# Copy the example environment file
copy .env.example .env

# Edit .env and configure your settings
# At minimum, set:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
# - API_KEY_SALT
```

#### 3. Start Services with Docker (Recommended)
```bash
# Start PostgreSQL, Redis, and RabbitMQ
docker-compose up -d postgres redis rabbitmq

# Wait for services to be ready (about 10 seconds)
```

#### 4. Initialize Database
```bash
# The database will be automatically initialized via Docker
# Or manually run:
psql -h localhost -U wallstreet -d wallstreet_dev -f scripts/database/init.sql
```

#### 5. Start the API Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

#### 6. Verify Installation
```bash
# Check health endpoint
curl http://localhost:3000/health

# View API documentation
# Open browser to: http://localhost:3000/api-docs
```

## Available Scripts

### Development
- `npm run dev` - Start dev server with nodemon
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier

### Testing
- `npm test` - Run all tests with coverage
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:load` - Run load tests with Artillery

### Database
- `npm run db:setup` - Setup database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed with test data
- `npm run db:backup` - Backup database

### Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Start all services
- `npm run docker:stop` - Stop all services

## API Endpoints

### Base URL
```
Local: http://localhost:3000
```

### Authentication
```
POST   /api/v1/auth/register      - Register new user
POST   /api/v1/auth/login         - Login user
GET    /api/v1/auth/profile       - Get user profile (requires auth)
PUT    /api/v1/auth/profile       - Update profile (requires auth)
POST   /api/v1/auth/change-password - Change password (requires auth)
POST   /api/v1/auth/logout        - Logout user (requires auth)
```

### Accounts
```
POST   /api/v1/accounts           - Create account (requires auth)
GET    /api/v1/accounts           - List user accounts (requires auth)
GET    /api/v1/accounts/:id       - Get account details (requires auth)
GET    /api/v1/accounts/:id/balance - Get account balance (requires auth)
DELETE /api/v1/accounts/:id       - Close account (requires auth)
```

### Transactions
```
POST   /api/v1/transactions       - Create transaction (requires auth)
GET    /api/v1/transactions/:id   - Get transaction details (requires auth)
POST   /api/v1/transactions/:id/process - Process transaction (requires auth)
GET    /api/v1/transactions/account/:accountId - List account transactions (requires auth)
```

### Health
```
GET    /health                    - Basic health check
GET    /health/detailed           - Detailed health with DB/Redis status
GET    /health/db                 - Database health check
GET    /health/redis              - Redis health check
```

## Authentication

### Using JWT Token
```bash
# 1. Login to get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wallstreet.com",
    "password": "Admin123!"
  }'

# 2. Use token in subsequent requests
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using API Key
```bash
curl http://localhost:3000/api/v1/accounts \
  -H "x-api-key: YOUR_API_KEY_HERE"
```

## Default Admin Account
```
Email: admin@wallstreet.com
Password: Admin123!
```
**⚠️ Change this password immediately in production!**

## Configuration

### Environment Variables

#### Required
- `NODE_ENV` - Environment (development/staging/production)
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens (change this!)
- `API_KEY_SALT` - Salt for API key hashing

#### Optional
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `ENABLE_SWAGGER` - Enable Swagger docs (default: true)
- `CORS_ORIGIN` - CORS allowed origin (default: *)

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U wallstreet -d wallstreet_dev

# Restart database
docker-compose restart postgres
```

### Redis Connection Issues
```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli -h localhost ping

# Restart Redis
docker-compose restart redis
```

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change PORT in .env file
```

### Module Not Found Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### 1. Create a new feature
```bash
git checkout -b feature/your-feature-name
```

### 2. Make changes and test
```bash
npm run lint
npm test
```

### 3. Commit changes
```bash
git add .
git commit -m "feat: your feature description"
```

### 4. Push and create PR
```bash
git push origin feature/your-feature-name
```

## Testing

### Run Unit Tests
```bash
npm run test:unit
```

### Run Integration Tests
```bash
# Ensure test database is running
npm run test:integration
```

### Run Load Tests
```bash
# Start the server first
npm start

# In another terminal
npm run test:load
```

### Check Test Coverage
```bash
npm test -- --coverage
```

## Monitoring

### View Logs
```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Docker logs
docker-compose logs -f api
```

### Health Checks
```bash
# Quick health check
npm run health:check

# Or manually
curl http://localhost:3000/health/detailed
```

## Next Steps

1. ✅ API Gateway is running
2. ⏳ Configure third-party integrations (Phase 3)
3. ⏳ Setup monitoring and alerting (Phase 4)
4. ⏳ Deploy to staging environment

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review API documentation at `/api-docs`
- Refer to [DeploymentGuide.md](DeploymentGuide.md) for production deployment
- Check [MasterContext.md](MasterContext.md) for project guidelines

---

**Last Updated**: 2026-01-28  
**Version**: 1.0.0  
**Status**: Phase 2 Complete - API Gateway Operational
