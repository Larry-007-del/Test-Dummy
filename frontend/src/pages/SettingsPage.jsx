import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { authFetch } from '../utils/authFetch';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    sms_notifications: false,
    attendance_reminders: true,
    report_notifications: true,
  });

  const [selectedOrganization, setSelectedOrganization] = useState('');

  useEffect(() => {
    loadSettings();
    loadOrganizations();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/me/');
      setUser(response);
      
      // Parse notification preferences if they exist
      if (response.notification_preferences) {
        try {
          const prefs = typeof response.notification_preferences === 'string'
            ? JSON.parse(response.notification_preferences)
            : response.notification_preferences;
          setPreferences({ ...preferences, ...prefs });
        } catch (e) {
          console.error('Failed to parse preferences:', e);
        }
      }

      // Set current organization if user has one
      if (response.organization) {
        setSelectedOrganization(response.organization.id || response.organization);
      }

      setError('');
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await authFetch('/api/organizations/');
      setOrganizations(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setOrganizations([]);
    }
  };

  const handlePreferenceChange = (key) => (event) => {
    setPreferences({
      ...preferences,
      [key]: event.target.checked,
    });
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError('');

      const endpoint = user.role === 'student' 
        ? `/api/students/${user.id}/`
        : user.role === 'lecturer'
        ? `/api/lecturers/${user.id}/`
        : null;

      if (!endpoint) {
        throw new Error('Unable to determine user endpoint');
      }

      await authFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({
          notification_preferences: JSON.stringify(preferences),
        }),
      });

      setSuccess('Notification preferences saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleOrganizationChange = async () => {
    try {
      setSaving(true);
      setError('');

      const endpoint = user.role === 'student' 
        ? `/api/students/${user.id}/`
        : user.role === 'lecturer'
        ? `/api/lecturers/${user.id}/`
        : null;

      if (!endpoint) {
        throw new Error('Unable to determine user endpoint');
      }

      await authFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({
          organization: selectedOrganization,
        }),
      });

      setSuccess('Organization updated successfully. Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* User Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Account Information
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Username: <strong>{user?.username}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Email: <strong>{user?.email}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Role: <strong>{user?.role || 'User'}</strong>
          </Typography>
        </CardContent>
      </Card>

      {/* Organization Switcher (Multi-tenancy) */}
      {organizations.length > 1 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Organization
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Switch between different organizations you have access to
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                select
                label="Select Organization"
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                fullWidth
                sx={{ maxWidth: 400 }}
              >
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                onClick={handleOrganizationChange}
                disabled={saving || selectedOrganization === (user?.organization?.id || user?.organization)}
              >
                Switch
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Notification Preferences Card */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Notification Preferences
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Manage how you receive notifications about attendance and course updates
          </Typography>

          <Divider sx={{ my: 2 }} />

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.email_notifications}
                  onChange={handlePreferenceChange('email_notifications')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Email Notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive attendance updates and reminders via email
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.sms_notifications}
                  onChange={handlePreferenceChange('sms_notifications')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">SMS Notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive important alerts via SMS (charges may apply)
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.attendance_reminders}
                  onChange={handlePreferenceChange('attendance_reminders')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Attendance Reminders</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get notified when new attendance sessions are created
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.report_notifications}
                  onChange={handlePreferenceChange('report_notifications')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Report Notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive notifications when reports are generated
                  </Typography>
                </Box>
              }
            />
          </FormGroup>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSavePreferences}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            Your preferences are saved to your account and will apply across all devices.
            {user?.phone_number ? '' : ' To enable SMS notifications, please add a phone number to your profile.'}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default SettingsPage;
