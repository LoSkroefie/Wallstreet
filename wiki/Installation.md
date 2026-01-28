# Installation Guide

Complete guide to installing and setting up the Wallstreet Platform.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Docker** & Docker Compose (recommended)
- **Git** for version control
- **PostgreSQL** 14+ (if not using Docker)
- **Redis** 7+ (if not using Docker)

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Wallstreet.git
cd Wallstreet
```

### 2. Install Dependencies

```bash
npm install
```

This will install 1,292+ packages including:
- Express.js for the web framework
- PostgreSQL driver (pg)
- Redis client (ioredis)
- JWT for authentication
- Winston for logging
- Jest for testing
- And many more...

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
notepad .env  # Windows
nano .env     # Linux/Mac
```

**Minimum required settings:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://wallstreet:wallstreet123@localhost:5432/wallstreet_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this
API_KEY_SALT=your-api-key-salt-change-this
```

### 4. Start Services

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Wait 10 seconds for services to initialize
sleep 10  # Linux/Mac
timeout /t 10  # Windows

# Initialize database
docker exec -i wallstreet-postgres psql -U wallstreet -d wallstreet_dev < scripts/database/init.sql
```

**Option B: Manual Installation**

If not using Docker, install PostgreSQL and Redis manually:

1. **PostgreSQL**: https://www.postgresql.org/download/
   - Create database: `wallstreet_dev`
   - Create user: `wallstreet` with password `wallstreet123`
   - Run: `psql -U wallstreet -d wallstreet_dev -f scripts/database/init.sql`

2. **Redis**: https://redis.io/download
   - Start on default port 6379

### 5. Start the API

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will start on http://localhost:3000

## Verify Installation

### 1. Check Health Endpoint

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

### 2. Check Detailed Health

```bash
curl http://localhost:3000/health/detailed
```

Should show all services (API, Database, Redis) as "healthy".

### 3. Access Swagger Documentation

Open browser: http://localhost:3000/api-docs

You should see interactive API documentation for all 19 endpoints.

### 4. Test Authentication

```bash
# Login with default admin account
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wallstreet.com","password":"Admin123!"}'
```

You should receive a JWT token in the response.

## Default Credentials

**Admin Account:**
- Email: `admin@wallstreet.com`
- Password: `Admin123!`

⚠️ **IMPORTANT**: Change this password immediately in production!

## Docker Services

The `docker-compose.yml` includes:

| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |
| rabbitmq | 5672, 15672 | Message queue (optional) |
| pgadmin | 5050 | Database admin UI (optional) |

### Start All Services

```bash
docker compose up -d
```

### View Logs

```bash
docker compose logs -f api
docker compose logs -f postgres
docker compose logs -f redis
```

### Stop Services

```bash
docker compose down
```

### Reset Everything

```bash
docker compose down -v  # Removes volumes (deletes data!)
docker compose up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000  # Linux/Mac

# Kill the process or change PORT in .env
```

### Database Connection Failed

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify connection string in `.env`
3. Check logs: `docker compose logs postgres`
4. Try connecting manually: `psql -U wallstreet -d wallstreet_dev`

### Redis Connection Failed

1. Check Redis is running: `docker ps | grep redis`
2. Test connection: `redis-cli ping` (should return "PONG")
3. Check logs: `docker compose logs redis`

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Permission Denied (Linux/Mac)

```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

## Next Steps

- ✅ [Configure your settings](Configuration)
- ✅ [Read the API documentation](API-Documentation)
- ✅ [Follow the Quick Start tutorial](Quick-Start)
- ✅ [Learn about authentication](Authentication)

## Additional Resources

- [Setup Guide](https://github.com/YOUR_USERNAME/Wallstreet/blob/main/SETUP.md)
- [Deployment Guide](https://github.com/YOUR_USERNAME/Wallstreet/blob/main/DeploymentGuide.md)
- [Troubleshooting](https://github.com/YOUR_USERNAME/Wallstreet/issues)

---

**Installation Complete!** 🎉

Next: [Quick Start Tutorial](Quick-Start)
