import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Typography,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/admin/analytics/')
      setAnalytics(response.data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Admin Analytics" subtitle="System-wide statistics and insights">
        <Container maxWidth="xl">
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map(i => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={120} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          </Grid>
        </Container>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Admin Analytics" subtitle="System-wide statistics and insights">
        <Container maxWidth="xl">
          <Alert severity="error">{error}</Alert>
        </Container>
      </DashboardLayout>
    )
  }

  const stats = analytics?.system_overview || {}
  const trends = analytics?.attendance_trends || []
  const topCourses = analytics?.top_courses || []
  const participation = analytics?.student_participation || {}
  const lecturerActivity = analytics?.lecturer_activity || []

  // Format trends data for charts
  const trendChartData = trends.map(item => ({
    date: item.date,
    attendances: item.count,
    students: item.total_students,
  }))

  // Format participation data for pie chart
  const participationData = [
    { name: 'Highly Active (>80%)', value: participation.highly_active || 0 },
    { name: 'Active (50-80%)', value: participation.active || 0 },
    { name: 'Low Activity (<50%)', value: participation.low_activity || 0 },
  ]

  return (
    <DashboardLayout title="Admin Analytics" subtitle="System-wide statistics and insights">
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          System Analytics Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
          Comprehensive overview of attendance system performance
        </Typography>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Students
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.total_students || 0}
                    </Typography>
                  </Box>
                  <PeopleIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Lecturers
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.total_lecturers || 0}
                    </Typography>
                  </Box>
                  <SchoolIcon sx={{ fontSize: 48, color: 'secondary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Courses
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.total_courses || 0}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Active Sessions
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.active_attendance_sessions || 0}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Attendance Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance Statistics (Last 30 Days)
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Total Sessions</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {stats.total_attendance_sessions || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Total Records</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {stats.total_attendance_records || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Avg. Attendance Rate</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {stats.average_attendance_rate || '0%'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(stats.average_attendance_rate || 0)}
                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Student Participation Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={participationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {participationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Attendance Trends Chart */}
        <Card sx={{ boxShadow: 3, mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Attendance Trends (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendances" stroke="#8884d8" name="Sessions" />
                <Line type="monotone" dataKey="students" stroke="#82ca9d" name="Students" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top 10 Courses by Attendance
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Course</TableCell>
                        <TableCell>Sessions</TableCell>
                        <TableCell>Avg. Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topCourses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        topCourses.map((course, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {course.course_code}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {course.course_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{course.attendance_count}</TableCell>
                            <TableCell>
                              <Chip
                                label={course.avg_attendance_rate}
                                size="small"
                                color={
                                  parseFloat(course.avg_attendance_rate) > 80
                                    ? 'success'
                                    : parseFloat(course.avg_attendance_rate) > 50
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Most Active Lecturers
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Lecturer</TableCell>
                        <TableCell>Sessions</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lecturerActivity.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        lecturerActivity.map((lecturer, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {lecturer.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {lecturer.staff_id}
                              </Typography>
                            </TableCell>
                            <TableCell>{lecturer.session_count}</TableCell>
                            <TableCell>
                              <Chip
                                label={lecturer.session_count > 10 ? 'Highly Active' : 'Active'}
                                size="small"
                                color={lecturer.session_count > 10 ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  )
}
