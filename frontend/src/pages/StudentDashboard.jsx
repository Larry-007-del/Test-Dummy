import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
  Link,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
} from '@mui/material'
import { Html5Qrcode } from 'html5-qrcode'
import {
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  MenuBook as BookIcon,
  Language as PortalIcon,
  EmojiEvents as AwardIcon,
} from '@mui/icons-material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

const quickLinks = [
  {
    label: 'Academic Calendar',
    url: 'https://pentvars.edu.gh/academic-calender/',
    icon: <CalendarIcon />,
  },
  {
    label: 'Programmes',
    url: 'https://pentvars.edu.gh/academics/programmes/',
    icon: <SchoolIcon />,
  },
  {
    label: 'E-Learning',
    url: 'http://exams.pentvars.edu.gh/pulms',
    icon: <PortalIcon />,
  },
  {
    label: 'E-Library',
    url: 'http://ghlibrary.online:1006/',
    icon: <BookIcon />,
  },
  {
    label: 'Scholarship',
    url: 'https://pentvars.edu.gh/scholarship',
    icon: <AwardIcon />,
  },
]

export default function StudentDashboard() {
  const [courses, setCourses] = useState([])
  const [history, setHistory] = useState([])
  const [tokenInput, setTokenInput] = useState('')
  const [checkInMessage, setCheckInMessage] = useState(null)
  const [profileMessage, setProfileMessage] = useState(null)
  const [profileMissing, setProfileMissing] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const qrRef = useRef(null)

  useEffect(() => {
    if (profileMissing) return
    async function fetchStudentData() {
      try {
        const me = await api.get('/api/me/')
        if (me.data?.role !== 'student') {
          setProfileMessage('No student profile found for this account. Log in with a student account to view data.')
          setProfileMissing(true)
          return
        }
        const [coursesRes, historyRes] = await Promise.all([
          api.get('/api/studentenrolledcourses/'),
          api.get('/api/student-attendance-history/'),
        ])
        setCourses(coursesRes.data || [])
        setHistory(historyRes.data || [])
      } catch (error) {
        if (error?.response?.status === 404) {
          setProfileMessage('No student profile found for this account. Log in with a student account to view data.')
          setProfileMissing(true)
        }
        setCourses([])
        setHistory([])
      } finally {
        setLoading(false)
      }
    }
    fetchStudentData()
  }, [profileMissing])

  const totalAttendances = history.reduce((sum, item) => sum + (item.attendances?.length || 0), 0)

  const handleCheckIn = async () => {
    if (!tokenInput.trim()) {
      setCheckInMessage({ type: 'error', text: 'Please enter a token.' })
      return
    }
    setCheckingIn(true)
    try {
      const res = await api.post('/api/courses/take_attendance/', { token: tokenInput.trim() })
      setCheckInMessage({ type: 'success', text: res.data?.message || 'Attendance recorded.' })
      setTokenInput('')
    } catch (error) {
      const msg = error?.response?.data?.error || 'Unable to record attendance.'
      setCheckInMessage({ type: 'error', text: msg })
    } finally {
      setCheckingIn(false)
    }
  }

  useEffect(() => {
    let active = true
    async function startScanner() {
      if (!scanOpen) return
      setScanError(null)
      const html5QrCode = new Html5Qrcode('qr-reader')
      qrRef.current = html5QrCode
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            if (!active) return
            setTokenInput(decodedText)
            setScanOpen(false)
          },
          () => {},
        )
      } catch (err) {
        if (active) setScanError('Unable to access camera. Please allow camera access.')
      }
    }
    startScanner()
    return () => {
      active = false
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {}).finally(() => {
          qrRef.current?.clear?.().catch(() => {})
          qrRef.current = null
        })
      }
    }
  }, [scanOpen])

  return (
    <DashboardLayout
      title="Student Portal"
      subtitle="Pentvars Student Services"
      userLabel="student"
    >
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome back, Student
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>
          Access your courses, attendance history, and institutional resources.
        </Typography>

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
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ boxShadow: 4 }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    Enrolled Courses
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
                    Attendance Records
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {totalAttendances}
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

          {profileMessage && (
            <Grid item xs={12}>
              <Alert severity="warning">{profileMessage}</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Student Check-In
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Enter the attendance token provided by your lecturer.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Attendance Token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  sx={{ flex: 1 }}
                  disabled={checkingIn}
                />
                <Button 
                  variant="contained" 
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  startIcon={checkingIn && <CircularProgress size={20} />}
                >
                  {checkingIn ? 'Submitting...' : 'Submit Check-In'}
                </Button>
                <Button variant="outlined" onClick={() => setScanOpen(true)} disabled={checkingIn}>
                  Scan QR
                </Button>
              </Stack>
              {checkInMessage && (
                <Alert severity={checkInMessage.type} sx={{ mt: 2 }}>
                  {checkInMessage.text}
                </Alert>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                My Courses
              </Typography>
              <List dense>
                {courses.map((course) => (
                  <ListItem key={course.id} divider>
                    <ListItemText
                      primary={`${course.name} (${course.course_code})`}
                      secondary={course.lecturer?.name || 'Lecturer assigned'}
                    />
                    <Chip size="small" label="Enrolled" color="primary" />
                  </ListItem>
                ))}
                {!courses.length && (
                  <Box sx={{ py: 2, color: 'text.secondary' }}>
                    No courses found.
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Attendance History
              </Typography>
              <Stack spacing={2}>
                {history.map((record) => (
                  <Paper key={record.course_code} sx={{ p: 1.5, bgcolor: '#f8fafc' }}>
                    <Typography fontWeight={600}>{record.course_code}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {record.attendances?.length || 0} sessions attended
                    </Typography>
                  </Paper>
                ))}
                {!history.length && (
                  <Typography color="textSecondary">No attendance history yet.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Institutional Links
              </Typography>
              <Grid container spacing={2}>
                {quickLinks.map((link) => (
                  <Grid item xs={12} sm={6} md={4} key={link.label}>
                    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: '#e0f2fe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {link.icon}
                      </Box>
                      <Link href={link.url} target="_blank" rel="noreferrer" underline="hover">
                        {link.label}
                      </Link>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
        )}
      </Container>

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scan Attendance QR</DialogTitle>
        <DialogContent>
          <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box id="qr-reader" sx={{ width: '100%' }} />
          </Box>
          {scanError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {scanError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  )
}
