# Production Deployment Checklist

## ✅ Pre-Deployment Verification

### Backend Dependencies
- [x] Django 5.0.7
- [x] Django REST Framework 3.15.2
- [x] PostgreSQL driver (psycopg2-binary)
- [x] Redis client (redis, django-redis)
- [x] Celery 5.4.0
- [x] Cloud storage (django-storages, boto3)
- [x] Email (django email backend)
- [x] SMS (twilio)
- [x] Reports (reportlab, openpyxl)
- [x] CORS (django-cors-headers)
- [x] Geolocation (geopy)

### Environment Variables (Required)

#### Core Django Settings
```bash
DJANGO_SECRET_KEY=<generate-strong-secret-key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,*.your-domain.com
```

#### Database (PostgreSQL)
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Redis Cache & Celery
```bash
REDIS_URL=redis://hostname:6379/1
CELERY_BROKER_URL=redis://hostname:6379/0
CELERY_RESULT_BACKEND=redis://hostname:6379/0
```

#### Email Configuration
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@attendancesystem.com
```

#### SMS Configuration (Optional)
```bash
SMS_ENABLED=True
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

#### AWS S3 Storage (Optional)
```bash
USE_S3=True
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

### Frontend Environment Variables
```bash
VITE_API_BASE_URL=https://your-backend-domain.com
```

## 🚀 Deployment Steps

### 1. Database Setup
```bash
# Create PostgreSQL database on Render/hosting platform
# Copy Internal Database URL to DATABASE_URL env var

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 2. Redis Setup
```bash
# Create Redis instance on Render/Upstash/hosting platform
# Copy connection URL to REDIS_URL env var
```

### 3. Static Files
```bash
# Collect static files
python manage.py collectstatic --noinput
```

### 4. Celery Workers (Background Tasks)
For Render, add separate background worker service:
```yaml
services:
  - type: worker
    name: celery-worker
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A attendance_system worker --loglevel=info
    envVars: [same as web service]
  
  - type: worker
    name: celery-beat
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A attendance_system beat --loglevel=info
    envVars: [same as web service]
```

### 5. Frontend Deployment
```bash
# Build frontend
cd frontend
npm install
npm run build

# Deploy dist/ folder to static hosting or serve via Django
```

## 🔍 Post-Deployment Verification

### Health Checks
- [ ] Backend health endpoint: `https://your-api.com/api/healthz/`
- [ ] Frontend loads: `https://your-frontend.com/`
- [ ] Login functionality works (student & lecturer)
- [ ] API authentication with tokens

### Feature Verification

#### Core Features (Essential)
- [ ] Student/Lecturer authentication
- [ ] Course creation and enrollment
- [ ] Attendance token generation
- [ ] QR code scanning
- [ ] Location-based check-in (geofencing)
- [ ] Attendance history viewing

#### Security Features
- [ ] HTTPS enforced (check redirect)
- [ ] Rate limiting active (try 100+ requests)
- [ ] Session timeout after 1 hour
- [ ] Password strength validation
- [ ] HSTS headers present

#### UX Features
- [ ] Dark mode toggle works
- [ ] Loading skeletons appear
- [ ] Error boundary catches crashes
- [ ] 404 page displays
- [ ] Session warning at 55 minutes

#### Admin Features
- [ ] CSV bulk import (students/lecturers)
- [ ] Analytics dashboard loads
- [ ] Admin panel accessible
- [ ] Reports download (PDF/Excel)

#### Background Tasks (Optional)
- [ ] Email notifications send
- [ ] SMS notifications send (if configured)
- [ ] Token cleanup runs (check logs after 6 hours)
- [ ] Attendance reminders send (check logs after 30 min)

#### Storage (Optional)
- [ ] Profile pictures upload to S3
- [ ] S3 URLs work in browser
- [ ] Local fallback if S3 disabled

#### Multi-Tenancy (Optional)
- [ ] Organizations created via admin
- [ ] Data isolation verified
- [ ] Subdomain routing (if configured)

## 🐛 Troubleshooting

### Backend Issues

**500 Internal Server Error**
- Check environment variables are set
- Review application logs on hosting platform
- Verify DATABASE_URL is correct
- Check SECRET_KEY is set

**Database Connection Error**
- Verify PostgreSQL database is running
- Check DATABASE_URL format
- Ensure database user has permissions
- Run migrations: `python manage.py migrate`

**Redis Connection Error**
- Verify Redis instance is running
- Check REDIS_URL format
- For development, Redis is optional (uses locmem)

**Email Not Sending**
- Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
- Check EMAIL_BACKEND is SMTP (not console)
- Test with: `python manage.py shell` → `send_mail(...)`
- For Gmail, use App Password (not regular password)

**S3 Upload Failing**
- Verify AWS credentials
- Check bucket name and region
- Ensure bucket policy allows public read
- Test: Upload via admin panel

### Frontend Issues

**API Calls Failing**
- Check VITE_API_BASE_URL is correct
- Verify CORS is configured (django-cors-headers)
- Check ALLOWED_HOSTS includes frontend domain
- Look at browser console for errors

**Authentication Not Working**
- Clear browser cookies/localStorage
- Check token is being sent in headers
- Verify backend /api/me/ returns user data

**Dark Mode Not Persisting**
- Check localStorage is enabled
- Verify ThemeContext is wrapping App

### Performance Issues

**Slow API Responses**
- Check database query count (use Django Debug Toolbar in dev)
- Verify Redis caching is enabled (production)
- Add database indexes if needed
- Consider read replicas for high traffic

**High Memory Usage**
- Check for memory leaks in Celery tasks
- Limit queryset size with pagination
- Use select_related() and prefetch_related()

## 📊 Monitoring

### Metrics to Track
- API response times
- Database connection pool usage
- Redis cache hit rate
- Celery task queue length
- Error rates (4xx, 5xx)
- Active user count
- Attendance sessions per day

### Logging
```python
# Check logs for errors
# Render: Dashboard → Logs
# Other platforms: Check platform-specific logging

# Key log patterns to watch:
# - "ERROR" - Application errors
# - "CRITICAL" - Critical failures
# - "WARNING" - Potential issues
# - Celery task failures
```

### Alerts
Set up alerts for:
- High error rate (>5% 5xx responses)
- Database down
- Redis down
- Disk space >80%
- Memory usage >90%

## 🔐 Security Hardening

### SSL/TLS
- [ ] HTTPS enforced (SECURE_SSL_REDIRECT=True)
- [ ] HSTS enabled (1 year)
- [ ] Secure cookies (SESSION_COOKIE_SECURE=True)

### Headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Content-Security-Policy configured

### Authentication
- [ ] Strong password policy enforced
- [ ] Rate limiting on auth endpoints
- [ ] Session timeout configured
- [ ] Token expiration set

### Database
- [ ] Credentials not in code
- [ ] Database user has minimal permissions
- [ ] Regular backups enabled
- [ ] Encryption at rest (if available)

### Secrets Management
- [ ] No secrets in Git repository
- [ ] Environment variables for all secrets
- [ ] Secret rotation plan in place
- [ ] Access logs monitored

## 📈 Scalability Considerations

### Current Limits (Free Tier)
- **Render Web Service**: 512MB RAM, shared CPU
- **PostgreSQL**: 1GB storage, limited connections
- **Redis**: Limited memory (varies by provider)

### Scaling Up
1. **Vertical**: Upgrade Render plan (more RAM/CPU)
2. **Horizontal**: Add more web workers (load balancer)
3. **Database**: Read replicas, connection pooling
4. **Caching**: Redis cluster, CDN for static files
5. **Background Jobs**: Multiple Celery workers

### Optimization Tips
- Use database indexes on frequently queried fields
- Implement API pagination (DRF PageNumberPagination)
- Cache expensive queries with Redis
- Compress API responses (gzip)
- Use CDN for static/media files
- Optimize images before upload
- Use database connection pooling

## 🔄 Maintenance

### Regular Tasks
- **Daily**: Check error logs, monitor performance
- **Weekly**: Review analytics, check disk space
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Database optimization, backup verification

### Updating Dependencies
```bash
# Check for updates
pip list --outdated

# Update requirements.txt
pip install --upgrade package-name
pip freeze > requirements.txt

# Test thoroughly before deploying
python manage.py test
```

### Database Maintenance
```bash
# Backup database (Render does this automatically)
# For manual backup:
pg_dump $DATABASE_URL > backup.sql

# Optimize database
python manage.py sqlflush  # Clear test data
python manage.py clearsessions  # Remove old sessions
```

## ✨ Success Criteria

Your deployment is successful when:
- ✅ Students can check in via QR code
- ✅ Lecturers can generate tokens and view attendance
- ✅ Admins can manage users and view analytics
- ✅ All API endpoints respond < 500ms
- ✅ No 5xx errors in logs
- ✅ Uptime > 99.5%
- ✅ Mobile-responsive UI works on all devices
- ✅ Background tasks process successfully

## 🆘 Support

For issues:
1. Check this deployment guide
2. Review feature-specific guides (POSTGRESQL_MIGRATION.md, AWS_S3_SETUP.md, etc.)
3. Check GitHub Issues
4. Review Django/DRF documentation
5. Check hosting platform status page

---

**Last Updated**: January 28, 2026
**Version**: 2.0.0 (20 production features)
