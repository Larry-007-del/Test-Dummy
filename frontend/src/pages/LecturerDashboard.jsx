import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Skeleton,
} from '@mui/material'
import {
  QrCode2 as QrCodeIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  MenuBook as CourseIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material'
import QRCode from "react-qr-code" 
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function LecturerDashboard() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [qrCourseName, setQrCourseName] = useState('')
  const [qrCourseId, setQrCourseId] = useState(null)
  const [liveStats, setLiveStats] = useState({ present_count: 0, total_enrolled: 0, recent_attendees: [] })
  const [actionMessage, setActionMessage] = useState(null)
  const [profileMessage, setProfileMessage] = useState(null)
  const [profileMissing, setProfileMissing] = useState(false)
  const [lecturerId, setLecturerId] = useState(null)
  
  // Create Course State
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: '', code: '' })

  useEffect(() => {
    if (profileMissing) return
    async function fetchLecturerData() {
      try {
        const me = await api.get('/api/me/')
        if (me.data?.role !== 'lecturer') {
          setProfileMessage('No lecturer profile found for this account. Log in with a lecturer account to view data.')
          setProfileMissing(true)
          return
        }
        setLecturerId(me.data.lecturer_id)
        
        const [coursesRes, historyRes] = await Promise.all([
          api.get('/api/lecturers/my-courses/'),
          api.get('/api/lecturer-attendance-history/'),
        ])
        setCourses(coursesRes.data || [])
        setAttendanceHistory(historyRes.data || [])
      } catch (error) {
        if (error?.response?.status === 404) {
          setProfileMessage('No lecturer profile found for this account. Log in with a lecturer account to view data.')
          setProfileMissing(true)
        }
        setCourses([])
        setAttendanceHistory([])
      } finally {
        setLoading(false)
      }
    }
    fetchLecturerData()
  }, [profileMissing])

  const handleCreateCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      setActionMessage({ type: 'error', text: 'Please fill in all fields.' })
      return
    }
    setCreating(true)
    try {
      const res = await api.post('/api/courses/', {
        name: newCourse.name,
        course_code: newCourse.code
      })
      setCourses([...courses, res.data])
      setCreateOpen(false)
      setNewCourse({ name: '', code: '' })
      setActionMessage({ type: 'success', text: 'Course created successfully.' })
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Failed to create course. Ensure code is unique.' })
    } finally {
      setCreating(false)
    }
  }

  const handleGenerateQr = async (courseId, courseName) => {
    try {
      const res = await api.post(`/api/courses/${courseId}/generate_attendance_token/`)
      // Store token data to be rendered as QR code
      setQrData(JSON.stringify({
        token: res.data.token,
        course_id: courseId,
        valid_until: res.data.expires_at
      }))
      setQrCourseName(courseName)
      setQrCourseId(courseId)
      setLiveStats({ present_count: 0, total_enrolled: 0, recent_attendees: [] })
      setQrOpen(true)
      setActionMessage({ type: 'success', text: 'QR code generated successfully. Students can scan to attend.' })
    } catch {
      setActionMessage({ type: 'error', text: 'Unable to start attendance session. Ensure you are authorized.' })
    }
  }

  // Poll for live attendance updates when QR modal is open
  useEffect(() => {
    if (!qrOpen || !qrCourseId) return
    
    const fetchLiveStats = async () => {
      try {
        const res = await api.get(`/api/courses/${qrCourseId}/live_attendance/`)
        setLiveStats(res.data)
      } catch (err) {
        console.error("Failed to fetch live stats", err)
      }
    }

    fetchLiveStats() // Initial fetch
    const interval = setInterval(fetchLiveStats, 3000) // Poll every 3s
    
    return () => clearInterval(interval)
  }, [qrOpen, qrCourseId])

  const handleEndAttendance = async (courseId) => {
    try {
      await api.post('/api/attendances/end_attendance/', { course_id: courseId })
      setActionMessage({ type: 'success', text: 'Attendance session ended.' })
    } catch {
      setActionMessage({ type: 'error', text: 'Unable to end attendance session.' })
    }
  }

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      setActionMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }
    
    setActionMessage({ type: 'info', text: 'Fetching location...' });
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          if (!lecturerId) {
             throw new Error("Lecturer ID not found");
          }
          await api.patch(`/api/lecturers/${lecturerId}/`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setActionMessage({ type: 'success', text: 'Location updated successfully.' });
        } catch (error) {
          console.error(error)
          setActionMessage({ type: 'error', text: 'Failed to update location.' });
        }
      },
      (error) => {
        console.error(error)
        setActionMessage({ type: 'error', text: 'Unable to retrieve location.' });
      }
    );
  };

  return (
    <DashboardLayout
      title="Lecturer Portal"
      subtitle="Course attendance management"
      userLabel="lecturer"
    >
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Welcome back, Lecturer
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage courses, generate attendance tokens, and review attendance history.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setCreateOpen(true)}
          >
            Create Course
          </Button>
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={100} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={100} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={100} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {profileMessage && (
              <Grid item xs={12}>
                <Alert severity="warning">{profileMessage}</Alert>
              </Grid>
            )}
            {actionMessage && (
              <Grid item xs={12}>
                <Alert severity={actionMessage.type}>{actionMessage.text}</Alert>
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <Card sx={{ boxShadow: 4 }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    Assigned Courses
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {courses.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ boxShadow: 4 }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    Attendance Sessions
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {attendanceHistory.reduce((sum, item) => sum + (item.attendances?.length || 0), 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ boxShadow: 4 }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip label="Active" color="success" />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2.5, boxShadow: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  My Courses
                </Typography>
                <Stack spacing={2}>
                  {courses.map((course) => (
                    <Paper key={course.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={600}>{course.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {course.course_code}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<QrCodeIcon />}
                          onClick={() => handleGenerateQr(course.id, course.name)}
                        >
                          Generate QR
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => handleEndAttendance(course.id)}
                        >
                        End Session
                      </Button>
                    </Stack>
                  </Paper>
                ))}
                {!courses.length && (
                  <Typography color="textSecondary">No courses assigned.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Paper 
                  sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => navigate('/courses')}
                >
                  <CourseIcon />
                  <Typography>Manage course attendance sessions</Typography>
                </Paper>
                <Paper 
                  sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={handleUpdateLocation}
                >
                  <LocationIcon />
                  <Typography>Update lecturer location before sessions</Typography>
                </Paper>
                <Paper 
                  sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => navigate('/reports')}
                >
                  <ReportIcon />
                  <Typography>Generate attendance reports</Typography>
                </Paper>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Attendance History
              </Typography>
              <Stack spacing={2}>
                {attendanceHistory.map((record) => (
                  <Paper key={record.course_code} sx={{ p: 2, bgcolor: '#f8fafc' }}>
                    <Typography fontWeight={600}>{record.course_code}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {record.attendances?.length || 0} sessions
                    </Typography>
                  </Paper>
                ))}
                {!attendanceHistory.length && (
                  <Typography color="textSecondary">No attendance history yet.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
        )}
      </Container>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Attendance QR Code - {qrCourseName}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, mt: 2 }}>
            {qrData ? (
              <>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: 3,
                    display: 'inline-block'
                  }}
                >
                  <QRCode
                    value={qrData}
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </Box>
                <Typography variant="body1" sx={{ mt: 3, fontWeight: 'bold' }}>
                  Scan to mark attendance
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Valid until session ends
                </Typography>

                {/* Live Stats Section */}
                <Box sx={{ mt: 4, width: '100%', maxWidth: 300, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                        Live Count: {liveStats.present_count} / {liveStats.total_enrolled}
                    </Typography>
                    {liveStats.recent_attendees?.length > 0 && (
                        <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="caption" color="textSecondary" display="block">
                                Latest:
                            </Typography>
                            {liveStats.recent_attendees.map((student, idx) => (
                                <Typography key={idx} variant="body2" sx={{ animation: 'fadeIn 0.5s' }}>
                                    {student.name}
                                </Typography>
                            ))}
                        </Box>
                    )}
                </Box>

                {/* Fallback display of token for manual check/debug */}
                <Typography variant="caption" sx={{ mt: 1, fontFamily: 'monospace', display: 'block' }}>
                   Token: {JSON.parse(qrData).token}
                </Typography>
              </>
            ) : (
              <CircularProgress />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Course Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create New Course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
             <Typography variant="body2" color="textSecondary">
               Create a new course to start taking attendance.
             </Typography>
            <TextField
              label="Course Name"
              placeholder="e.g. Intro to Computer Science"
              fullWidth
              value={newCourse.name}
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
            />
            <TextField
              label="Course Code"
              placeholder="e.g. CSC 101"
              fullWidth
              value={newCourse.code}
              onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCourse} 
            variant="contained" 
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  )
}
