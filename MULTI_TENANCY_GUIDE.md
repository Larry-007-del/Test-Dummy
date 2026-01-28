# Multi-Tenancy Setup Guide

## Overview
This attendance system now supports multi-tenancy, allowing multiple institutions/organizations to use the same deployment with complete data isolation.

## Features
✅ Complete data isolation between organizations
✅ Organization-specific branding (logo, name)
✅ Three routing methods: subdomain, path-based, header-based
✅ Configurable per organization
✅ Scalable for hundreds of institutions

## Organization Model
Each organization has:
- **Name**: Institution name (e.g., "University of Ghana")
- **Slug**: URL-friendly identifier (e.g., "university-ghana")
- **Domain**: Subdomain identifier (e.g., "ug" for ug.attendancesystem.com)
- **Logo**: Optional branding image
- **is_active**: Enable/disable organization

## Data Isolation
All core models have `organization` foreign key:
- Students belong to one organization
- Lecturers belong to one organization
- Courses belong to one organization
- Attendance sessions inherit organization from course

## Routing Methods

### Method 1: Subdomain Routing (Recommended)
Best for production with custom domains.

**Example:**
- University A: `university-a.attendancesystem.com`
- University B: `university-b.attendancesystem.com`

**DNS Setup:**
1. Add wildcard DNS record: `*.attendancesystem.com → Your server IP`
2. In Render/hosting, enable wildcard domain support
3. Set `domain` field in Organization model to subdomain prefix

**Frontend Configuration:**
- Users access their specific subdomain
- Middleware automatically detects organization from subdomain

### Method 2: Path-Based Routing
Useful for development or shared hosting.

**Example:**
- University A: `attendancesystem.com/org/university-a/`
- University B: `attendancesystem.com/org/university-b/`

**Implementation:**
- Update frontend routes to include `/org/{slug}/` prefix
- Middleware extracts organization from path
- All API calls include organization slug in URL

### Method 3: Header-Based Routing
Best for API clients and mobile apps.

**Example:**
```http
GET /api/courses/
Host: attendancesystem.com
X-Organization-Slug: university-a
```

**Usage:**
- Mobile apps include `X-Organization-Slug` header in all requests
- Backend middleware reads header to determine organization
- No URL changes needed

## Setup Instructions

### 1. Run Migration
```bash
python manage.py migrate
```

### 2. Create Organizations
#### Using Django Admin:
1. Go to `/admin/attendance/organization/`
2. Click "Add Organization"
3. Fill in:
   - Name: University of Ghana
   - Slug: university-ghana (auto-generated from name)
   - Domain: ug (for subdomain routing)
   - Upload logo (optional)
4. Save

#### Using Django Shell:
```python
python manage.py shell

from attendance.models import Organization

org = Organization.objects.create(
    name="University of Ghana",
    slug="university-ghana",
    domain="ug",
    is_active=True
)
print(f"Created: {org}")
```

### 3. Assign Users to Organizations
When creating students/lecturers, include `organization_id`:

```python
from attendance.models import Organization, Student, Lecturer
from django.contrib.auth.models import User

org = Organization.objects.get(slug="university-ghana")

# Create student
user = User.objects.create_user(username="student1", password="password")
student = Student.objects.create(
    user=user,
    student_id="UG001",
    name="John Doe",
    organization=org  # Assign organization
)

# Create lecturer
user2 = User.objects.create_user(username="lecturer1", password="password")
lecturer = Lecturer.objects.create(
    user=user2,
    staff_id="STAFF001",
    name="Dr. Jane Smith",
    organization=org  # Assign organization
)
```

### 4. Enable Middleware (Optional)
To enable automatic organization detection, add to [settings.py](attendance_system/settings.py#L90-L100):

```python
MIDDLEWARE = [
    # ... existing middleware
    'attendance.organization_utils.OrganizationMiddleware',  # Add this
]
```

## Querying with Organization Filter

### In Views:
```python
from attendance.organization_utils import filter_by_organization

def my_view(request):
    organization = request.organization  # Set by middleware
    
    # Filter courses by organization
    courses = filter_by_organization(Course.objects.all(), organization)
    
    # Filter students by organization
    students = filter_by_organization(Student.objects.all(), organization)
```

### In ViewSets:
```python
from attendance.organization_utils import get_user_organization

class CourseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Course.objects.all()
        
        # Filter by user's organization
        if self.request.user.is_authenticated:
            org = get_user_organization(self.request.user)
            if org:
                queryset = queryset.filter(organization=org)
        
        return queryset
```

## Frontend Integration

### React (Subdomain Routing):
```javascript
// Auto-detect organization from subdomain
const getOrganizationFromSubdomain = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  if (parts.length > 2) {
    return parts[0]; // e.g., 'university-a' from 'university-a.system.com'
  }
  return null;
};

// Include in API calls
const organization = getOrganizationFromSubdomain();
axios.get('/api/courses/', {
  headers: {
    'X-Organization-Slug': organization
  }
});
```

### React (Path-Based Routing):
```javascript
// Update routes to include organization
<Route path="/org/:orgSlug/dashboard" element={<Dashboard />} />

// In components, get organization from URL
import { useParams } from 'react-router-dom';

function Dashboard() {
  const { orgSlug } = useParams();
  
  // Use orgSlug in API calls
  fetch(`/org/${orgSlug}/api/courses/`);
}
```

## Migration from Single-Tenancy

### Step 1: Create Default Organization
```python
org = Organization.objects.create(
    name="Default Institution",
    slug="default",
    is_active=True
)
```

### Step 2: Assign All Existing Data
```python
# Assign all students to default org
Student.objects.filter(organization__isnull=True).update(organization=org)

# Assign all lecturers
Lecturer.objects.filter(organization__isnull=True).update(organization=org)

# Assign all courses
Course.objects.filter(organization__isnull=True).update(organization=org)
```

### Step 3: Make Organization Required (Future)
After migration, update models to make `organization` non-nullable:
```python
organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='students')
```

## Security Considerations
✅ All queries automatically filtered by organization (when middleware enabled)
✅ Users can only access data from their organization
✅ Superusers can see all organizations in admin
✅ Organization switching requires authentication
✅ Cross-organization data leakage prevented by FK constraints

## Performance Optimization
- Add database indexes: `organization_id` on all tables
- Use `select_related('organization')` in queries
- Cache organization lookups
- Consider read replicas for large deployments

## Testing Multi-Tenancy

### Create Test Organizations:
```python
python manage.py shell

from attendance.models import Organization

org1 = Organization.objects.create(name="Test University A", slug="test-a", domain="test-a")
org2 = Organization.objects.create(name="Test University B", slug="test-b", domain="test-b")
```

### Verify Isolation:
```python
# Create students in different orgs
from attendance.models import Student
from django.contrib.auth.models import User

user1 = User.objects.create_user("student_a", password="pass")
student_a = Student.objects.create(user=user1, student_id="A001", name="Student A", organization=org1)

user2 = User.objects.create_user("student_b", password="pass")
student_b = Student.objects.create(user=user2, student_id="B001", name="Student B", organization=org2)

# Query by organization
Student.objects.filter(organization=org1)  # Returns only student_a
Student.objects.filter(organization=org2)  # Returns only student_b
```

## Troubleshooting

### Organization not detected:
- Check middleware is enabled in `MIDDLEWARE` setting
- Verify `domain` field matches subdomain
- Check DNS/subdomain configuration

### Data appearing across organizations:
- Ensure all queries filter by organization
- Check ViewSet `get_queryset()` implementations
- Verify middleware is processing requests

### Performance issues:
- Add database indexes on `organization_id`
- Use `select_related('organization')` in queries
- Enable Redis caching for organization lookups
