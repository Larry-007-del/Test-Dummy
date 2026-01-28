# PostgreSQL Migration Guide

## Overview
This project is now configured to use PostgreSQL in production and SQLite in development.

## Development Setup
Development uses SQLite by default (no configuration needed).

## Production Setup (Render)

### 1. Create PostgreSQL Database on Render
1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Fill in database details:
   - Name: `attendance_db` (or your preferred name)
   - Region: Same as your web service
   - Plan: Free or Starter
4. Click "Create Database"

### 2. Get Database Connection String
After creation, Render provides:
- **Internal Database URL**: Use this for your web service (same region)
- Format: `postgresql://user:password@hostname:port/database`

### 3. Configure Web Service Environment Variables
In your Render web service settings, add:
```
DATABASE_URL=<your-internal-database-url>
```

### 4. Run Migrations
After deployment, run migrations in Render shell:
```bash
python manage.py migrate
```

### 5. Create Superuser
```bash
python manage.py createsuperuser
```

## Migration Commands

### Export data from SQLite (Optional)
If you have existing data in SQLite:
```bash
# Dump data to JSON
python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 2 > data.json
```

### Load data into PostgreSQL (Optional)
After setting up PostgreSQL:
```bash
# Load data from JSON
python manage.py loaddata data.json
```

## Environment Variables Summary

### Required for PostgreSQL:
- `DATABASE_URL`: PostgreSQL connection string from Render

### Optional (already configured):
- `REDIS_URL`: Redis connection for caching/Celery
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`: Email configuration
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SMS_ENABLED`: SMS notifications
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`: Celery task queue

## Benefits of PostgreSQL
✅ Production-grade database
✅ Better performance for concurrent users
✅ Advanced features (full-text search, JSON fields, etc.)
✅ Better data integrity and ACID compliance
✅ Scalability for large institutions

## Verification
Test the connection:
```bash
python manage.py check --database default
```

Query database type:
```bash
python manage.py shell
>>> from django.db import connection
>>> print(connection.vendor)  # Should show 'postgresql' in production
```
