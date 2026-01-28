# Wallstreet Platform - Deployment Guide

## Overview
This guide outlines deployment procedures, environment setup, and operational guidelines for the Wallstreet platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Management](#database-management)
7. [Monitoring & Logging](#monitoring--logging)
8. [Rollback Procedures](#rollback-procedures)
9. [Security Checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Node.js 18+ or Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose
- Git
- AWS CLI (for cloud deployments)

### Required Accounts
- AWS account with appropriate IAM permissions
- GitHub/GitLab repository access
- Third-party API credentials (stored in secrets manager)

## Environment Setup

### Environment Variables
Create `.env` files for each environment:

**Local Development (.env.local)**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/wallstreet_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-local-jwt-secret
API_KEY_SALT=your-local-salt
LOG_LEVEL=debug
```

**Staging (.env.staging)**
```env
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://staging-db-host:5432/wallstreet_staging
REDIS_URL=redis://staging-redis-host:6379
JWT_SECRET=${STAGING_JWT_SECRET}
API_KEY_SALT=${STAGING_API_KEY_SALT}
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

**Production (.env.production)**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=${PROD_DATABASE_URL}
REDIS_URL=${PROD_REDIS_URL}
JWT_SECRET=${PROD_JWT_SECRET}
API_KEY_SALT=${PROD_API_KEY_SALT}
LOG_LEVEL=warn
ENABLE_SWAGGER=false
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### Secrets Management
**CRITICAL**: Never commit secrets to repository!

Use AWS Secrets Manager:
```bash
# Store secrets
aws secretsmanager create-secret --name wallstreet/prod/jwt --secret-string "your-secret"

# Retrieve secrets
aws secretsmanager get-secret-value --secret-id wallstreet/prod/jwt
```

## Local Development

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd Wallstreet

# Install dependencies
npm install
# or
pip install -r requirements.txt

# Setup database
npm run db:setup
# or
python manage.py migrate

# Seed development data
npm run db:seed

# Start development server
npm run dev
# or
python manage.py runserver
```

### Running Services Locally
```bash
# Start all services with Docker Compose
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "API Gateway"

# Run integration tests
npm run test:integration
```

## Staging Deployment

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Secrets stored in Secrets Manager
- [ ] Backup created

### Deployment Steps
```bash
# 1. Backup current staging database
npm run db:backup:staging

# 2. Pull latest code
git checkout staging
git pull origin staging

# 3. Install dependencies
npm ci --production

# 4. Run database migrations
npm run db:migrate:staging

# 5. Build application
npm run build

# 6. Deploy to staging
npm run deploy:staging

# 7. Run smoke tests
npm run test:smoke:staging

# 8. Verify deployment
curl https://staging-api.wallstreet.com/health
```

### Docker Deployment (Staging)
```bash
# Build Docker image
docker build -t wallstreet-api:staging .

# Tag image
docker tag wallstreet-api:staging <ecr-repo>/wallstreet-api:staging

# Push to registry
docker push <ecr-repo>/wallstreet-api:staging

# Deploy with ECS/Kubernetes
aws ecs update-service --cluster staging --service wallstreet-api --force-new-deployment
```

## Production Deployment

### Pre-Production Checklist
- [ ] Staging deployment successful
- [ ] All smoke tests passing
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Database backup verified
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Monitoring alerts configured

### Blue-Green Deployment Strategy
```bash
# 1. Create database backup
npm run db:backup:production

# 2. Deploy to green environment
npm run deploy:production:green

# 3. Run health checks on green
npm run health:check:green

# 4. Switch traffic to green (gradual rollout)
npm run traffic:shift:green --percentage=10
# Monitor for 5 minutes
npm run traffic:shift:green --percentage=50
# Monitor for 5 minutes
npm run traffic:shift:green --percentage=100

# 5. Keep blue environment running for 1 hour for quick rollback
# 6. After verification, decommission blue environment
npm run decommission:blue
```

### Zero-Downtime Deployment
```bash
# Using AWS ECS rolling update
aws ecs update-service \
  --cluster production \
  --service wallstreet-api \
  --force-new-deployment \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
```

### Database Migration in Production
```bash
# IMPORTANT: Always backup first!
npm run db:backup:production

# Run migrations with zero downtime
# 1. Add new columns (nullable)
npm run db:migrate:production --step=add-columns

# 2. Deploy code that works with both old and new schema
npm run deploy:production

# 3. Migrate data in background
npm run db:migrate:production --step=migrate-data

# 4. Make columns non-nullable
npm run db:migrate:production --step=finalize

# 5. Deploy code that uses new schema exclusively
npm run deploy:production
```

## Database Management

### Backup Procedures
```bash
# Manual backup
pg_dump -h <db-host> -U <username> -d wallstreet_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backups (cron job)
0 2 * * * /usr/local/bin/backup-wallstreet-db.sh

# Verify backup
pg_restore --list backup_file.sql
```

### Restore Procedures
```bash
# Stop application
npm run stop:production

# Restore database
psql -h <db-host> -U <username> -d wallstreet_prod < backup_file.sql

# Restart application
npm run start:production

# Verify data integrity
npm run db:verify
```

### Database Maintenance
```bash
# Vacuum and analyze
psql -c "VACUUM ANALYZE;" wallstreet_prod

# Reindex
psql -c "REINDEX DATABASE wallstreet_prod;"

# Check connections
psql -c "SELECT * FROM pg_stat_activity;"
```

## Monitoring & Logging

### Health Checks
```bash
# API health endpoint
curl https://api.wallstreet.com/health

# Database health
curl https://api.wallstreet.com/health/db

# Redis health
curl https://api.wallstreet.com/health/redis

# Full system health
curl https://api.wallstreet.com/health/detailed
```

### Monitoring Tools
- **Application**: AWS CloudWatch / Datadog
- **Database**: PostgreSQL metrics, slow query log
- **API**: Request rate, response time, error rate
- **Infrastructure**: CPU, memory, disk, network

### Log Aggregation
```bash
# View real-time logs
aws logs tail /aws/ecs/wallstreet-api --follow

# Search logs
aws logs filter-pattern '{ $.level = "ERROR" }' \
  --log-group-name /aws/ecs/wallstreet-api \
  --start-time 1h

# Export logs
aws logs create-export-task \
  --log-group-name /aws/ecs/wallstreet-api \
  --from 1641024000000 \
  --to 1641110399000 \
  --destination s3-bucket
```

### Alerting Configuration
- API error rate > 5%
- Response time p95 > 500ms
- Database connection pool > 80%
- Disk usage > 85%
- Memory usage > 90%
- Failed logins > 10 per minute

## Rollback Procedures

### Application Rollback
```bash
# Quick rollback using previous deployment
npm run rollback:production

# Or manually
docker pull <ecr-repo>/wallstreet-api:previous-tag
aws ecs update-service --cluster production \
  --service wallstreet-api \
  --task-definition wallstreet-api:previous-revision
```

### Database Rollback
```bash
# CAUTION: This will lose recent data!

# 1. Stop application
npm run stop:production

# 2. Restore from backup
psql -h <db-host> -U <username> -d wallstreet_prod < backup_file.sql

# 3. Rollback application code
npm run rollback:production

# 4. Restart application
npm run start:production
```

### Rollback Decision Matrix
| Issue | Severity | Action |
|-------|----------|--------|
| API errors > 10% | Critical | Immediate rollback |
| Performance degradation > 50% | High | Rollback within 15 min |
| Minor UI issue | Low | Fix forward |
| Database migration issue | Critical | Stop deployment, assess |

## Security Checklist

### Pre-Deployment Security
- [ ] All dependencies updated (npm audit / pip check)
- [ ] No secrets in code or logs
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection active
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Security headers configured

### Post-Deployment Security
- [ ] SSL certificate valid
- [ ] API authentication working
- [ ] Rate limits functioning
- [ ] Audit logs enabled
- [ ] Intrusion detection active
- [ ] Vulnerability scan completed

### Security Incident Response
1. **Detect**: Monitor alerts, user reports
2. **Contain**: Isolate affected systems
3. **Investigate**: Review logs, identify root cause
4. **Remediate**: Patch vulnerability, restore service
5. **Report**: Document incident, notify stakeholders

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker logs wallstreet-api

# Check environment variables
printenv | grep WALLSTREET

# Check dependencies
npm ls --depth=0

# Check port availability
netstat -tuln | grep 3000
```

#### Database Connection Errors
```bash
# Test connection
psql -h <db-host> -U <username> -d wallstreet_prod

# Check connection pool
SELECT * FROM pg_stat_activity;

# Check firewall rules
telnet <db-host> 5432
```

#### High Memory Usage
```bash
# Check process memory
ps aux | grep node

# Check for memory leaks
node --inspect app.js
# Use Chrome DevTools for heap snapshot

# Restart with increased memory
node --max-old-space-size=4096 app.js
```

#### Slow API Responses
```bash
# Check database slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Check Redis cache hit rate
redis-cli info stats

# Enable query logging
npm run db:log:enable
```

### Emergency Contacts
- **On-Call Engineer**: [phone/slack]
- **Database Admin**: [phone/slack]
- **DevOps Lead**: [phone/slack]
- **Security Team**: [phone/slack]

## Maintenance Windows

### Scheduled Maintenance
- **Weekly**: Database optimization (Sundays 2-4 AM UTC)
- **Monthly**: Security patches (First Saturday 2-6 AM UTC)
- **Quarterly**: Major updates (TBD with 2-week notice)

### Maintenance Notification Template
```
SUBJECT: Scheduled Maintenance - Wallstreet Platform

Dear Users,

We will be performing scheduled maintenance on the Wallstreet platform:

Date: [Date]
Time: [Start Time] - [End Time] UTC
Duration: [Expected Duration]
Impact: [Expected Impact]

During this time:
- [List of affected services]
- [Workarounds if available]

We apologize for any inconvenience.

Best regards,
Wallstreet Team
```

## Performance Optimization

### Database Optimization
- Index frequently queried columns
- Partition large tables
- Archive old data
- Optimize query plans
- Enable connection pooling

### Application Optimization
- Enable Redis caching
- Implement CDN for static assets
- Use compression middleware
- Optimize bundle size
- Enable HTTP/2

### Infrastructure Optimization
- Auto-scaling groups
- Load balancer configuration
- Database read replicas
- Multi-region deployment
- DDoS protection

## Compliance & Audit

### Compliance Requirements
- [ ] GDPR data protection
- [ ] PCI-DSS for payments
- [ ] SOC 2 controls
- [ ] Data retention policies
- [ ] Audit trail maintenance

### Audit Procedures
```bash
# Generate audit report
npm run audit:generate --from=2024-01-01 --to=2024-12-31

# Export compliance logs
npm run compliance:export --format=csv

# Review access logs
npm run logs:access --filter=admin
```

---

## Deployment Checklist Summary

### Before Every Deployment
1. ✅ Tests passing
2. ✅ Code reviewed
3. ✅ Backup created
4. ✅ Monitoring configured
5. ✅ Rollback plan ready

### During Deployment
1. ✅ Monitor metrics
2. ✅ Check error rates
3. ✅ Verify health checks
4. ✅ Test critical paths

### After Deployment
1. ✅ Smoke tests complete
2. ✅ Performance verified
3. ✅ No error spikes
4. ✅ Documentation updated
5. ✅ Team notified

---

**Last Updated**: 2026-01-28  
**Version**: 1.0  
**Maintained By**: Technology/Domain Specialist II

**IMPORTANT REMINDERS**:
- ⚠️ Always backup before major changes
- ⚠️ Never deploy on Fridays (unless emergency)
- ⚠️ Always test in staging first
- ⚠️ Keep rollback plan ready
- ⚠️ Monitor closely for 1 hour post-deployment
