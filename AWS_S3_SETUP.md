# AWS S3 Cloud Storage Setup Guide

## Overview
This project is configured to use AWS S3 for storing media files (profile pictures, generated reports) in production, while using local filesystem in development.

## Benefits of S3 Storage
✅ Unlimited scalability
✅ No server disk space concerns
✅ Global CDN distribution
✅ Automatic backups and versioning
✅ Cost-effective for large files
✅ Better performance for file serving

## AWS S3 Setup Instructions

### 1. Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Sign up for free tier (includes 5GB S3 storage free for 12 months)

### 2. Create S3 Bucket
1. Go to AWS Console → S3
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `attendance-system-media` (must be globally unique)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Block Public Access**: Uncheck "Block all public access" (we need public read for profile pictures)
   - ⚠️ Acknowledge the warning about public access
4. Click "Create bucket"

### 3. Configure Bucket Policy
1. Go to your bucket → Permissions → Bucket Policy
2. Add this policy (replace `YOUR-BUCKET-NAME`):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

### 4. Configure CORS
1. Go to your bucket → Permissions → CORS
2. Add this configuration:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 5. Create IAM User
1. Go to AWS Console → IAM → Users
2. Click "Add users"
3. User name: `attendance-system-s3-user`
4. Access type: **Programmatic access**
5. Permissions: **Attach existing policies directly** → Search and select:
   - `AmazonS3FullAccess` (or create custom policy with limited permissions)
6. Create user and **save credentials** (Access Key ID and Secret Access Key)

### 6. Configure Environment Variables on Render
Add these environment variables to your Render web service:

```env
USE_S3=True
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
AWS_STORAGE_BUCKET_NAME=attendance-system-media
AWS_S3_REGION_NAME=us-east-1
```

## Development vs Production

### Development (Local)
- Files stored in `media/` directory
- No S3 configuration needed
- `USE_S3=False` (default)

### Production (Render + S3)
- Files stored in AWS S3
- Requires S3 environment variables
- `USE_S3=True`

## Testing S3 Upload

### Method 1: Django Shell
```bash
python manage.py shell
```
```python
from attendance.models import Lecturer
from django.core.files.uploadedfile import SimpleUploadedFile

# Create test lecturer
lecturer = Lecturer.objects.first()

# Upload test image
with open('test_image.jpg', 'rb') as f:
    lecturer.profile_picture.save('test.jpg', f)

# Check URL
print(lecturer.profile_picture.url)  # Should show S3 URL
```

### Method 2: Admin Panel
1. Go to `/admin/`
2. Upload profile picture for a lecturer
3. Verify URL points to S3: `https://YOUR-BUCKET.s3.amazonaws.com/...`

## File Types Stored in S3
- Profile pictures (`Lecturer.profile_picture`)
- Generated attendance reports (if saved)
- Any future user-uploaded files

## Cost Estimation
**AWS Free Tier (12 months):**
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests
- 100 GB data transfer out

**After Free Tier:**
- Storage: ~$0.023/GB/month
- Requests: $0.0004 per 1,000 GET requests
- Example: 1000 users × 100KB profile pic = 100MB = ~$0.002/month

## Alternative: Cloudinary
If you prefer Cloudinary instead of AWS S3:
1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier: 25GB storage)
2. Install: `pip install django-cloudinary-storage`
3. Update settings to use `cloudinary_storage.storage.MediaCloudinaryStorage`

## Security Best Practices
✅ Never commit AWS credentials to Git
✅ Use IAM user with minimal permissions (only S3 access)
✅ Enable bucket versioning for backup
✅ Set up CloudWatch alarms for unusual activity
✅ Regularly rotate access keys
✅ Use bucket policies to restrict access patterns

## Troubleshooting

### Files not uploading
- Check AWS credentials are correct
- Verify bucket policy allows public read
- Check IAM user has S3 write permissions

### Files not accessible
- Verify CORS configuration
- Check bucket is not blocking public access
- Ensure `AWS_DEFAULT_ACL = 'public-read'`

### Wrong file URLs
- Verify `AWS_STORAGE_BUCKET_NAME` is correct
- Check `AWS_S3_REGION_NAME` matches bucket region
- Clear Django cache: `python manage.py clear_cache`
