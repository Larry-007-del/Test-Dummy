import { useState, useEffect } from 'react'
import CountUp from 'react-countup'
import AttendanceCalendar from '../components/AttendanceCalendar'
import AttendanceTrendChart from '../components/AttendanceTrendChart'
import DashboardLayout from '../components/DashboardLayout'
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material'
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  QrCode2 as QrCodeIcon,
  NearMe as NearMeIcon,
  AutoGraph as AutoGraphIcon,
} from '@mui/icons-material'
import api from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    lecturers: '--',
    students: '--',
    courses: '--',
    attendance: '--',
  })
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [lectRes, studRes, courseRes, attRes] = await Promise.all([
          api.get('/api/lecturers/'),
          api.get('/api/students/'),
          api.get('/api/courses/'),
          api.get('/api/attendances/'),
        ])
        setStats({
          lecturers: lectRes.data.count ?? lectRes.data.length ?? '--',
          students: studRes.data.count ?? studRes.data.length ?? '--',
          courses: courseRes.data.count ?? courseRes.data.length ?? '--',
          attendance: attRes.data.count ?? attRes.data.length ?? '--',
        })
      } catch (e) {
        setStats({ lecturers: '--', students: '--', courses: '--', attendance: '--' })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <DashboardLayout
      title="Main Dashboard"
      subtitle="Attendance System Overview"
    >
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome back, Admin
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>
          Here’s your attendance dashboard overview.
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[
            {
              label: 'Total Lecturers',
              value: stats.lecturers,
              icon: <PeopleIcon />,
              gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            },
            {
              label: 'Total Students',
              value: stats.students,
              icon: <SchoolIcon />,
              gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            },
            {
              label: 'Active Courses',
              value: stats.courses,
              icon: <EventIcon />,
              gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            },
            {
              label: "Today's Attendance",
              value: stats.attendance,
              icon: <AutoGraphIcon />,
              gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            },
          ].map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card sx={{ color: '#fff', background: card.gradient, boxShadow: 6 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {loading ? '...' : (
                          <CountUp end={Number(card.value) || 0} duration={1.2} separator="," />
                        )}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <AttendanceCalendar embedded value={calendarDate} onChange={setCalendarDate} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, boxShadow: 4, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {[
                  { label: 'Generate QR Token', icon: <QrCodeIcon />, color: 'primary' },
                  { label: 'Mark Attendance', icon: <NearMeIcon />, color: 'success' },
                  { label: 'View Calendar', icon: <CalendarIcon />, color: 'info' },
                ].map((action) => (
                  <Paper
                    key={action.label}
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: '#f1f5f9',
                    }}
                  >
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
                      {action.icon}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {action.label}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip size="small" color={action.color} label="Action" />
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, boxShadow: 4 }}>
              <AttendanceTrendChart embedded />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  )
}
