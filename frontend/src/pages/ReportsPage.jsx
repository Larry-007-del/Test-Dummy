import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  CircularProgress,
} from '@mui/material'
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function ReportsPage() {
  const [format, setFormat] = useState('pdf')
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch courses on mount
  useState(() => {
    const fetchCourses = async () => {
      try {
        // Try lecturer endpoint first
        const res = await api.get('/api/lecturers/my-courses/')
        setCourses(res.data)
      } catch (err) {
        // Fallback or just ignore if not lecturer (e.g. admin)
        console.error("Failed to load courses", err)
      }
    }
    fetchCourses()
  }, [])

  const handleGenerateReport = async () => {
    if (!courseId) {
      setMessage({ type: 'error', text: 'Please select a course' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const params = new URLSearchParams()
      params.append('course_id', courseId)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('format', format)

      const response = await api.get('/api/attendance-report/', {
        params: Object.fromEntries(params),
        responseType: 'blob',
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `attendance_report_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      )
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)

      setMessage({ type: 'success', text: 'Report generated and downloaded successfully!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.error || 'Failed to generate report'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Reports" subtitle="Generate attendance reports">
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Generate Attendance Reports
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
          Download attendance data in PDF or Excel format
        </Typography>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Report Configuration
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Report Format</InputLabel>
                  <Select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    label="Report Format"
                  >
                    <MenuItem value="pdf">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PdfIcon /> PDF Document
                      </Box>
                    </MenuItem>
                    <MenuItem value="excel">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExcelIcon /> Excel Spreadsheet
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={courseId}
                    onChange={e => setCourseId(e.target.value)}
                    label="Course"
                  >
                    {courses.map(course => (
                       <MenuItem key={course.id} value={course.id}>
                         {course.name} ({course.course_code})
                       </MenuItem>
                    ))}
                    {courses.length === 0 && (
                        <MenuItem disabled value="">No courses found</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start Date (Optional)"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="End Date (Optional)"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={handleGenerateReport}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate & Download Report'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Paper sx={{ mt: 4, p: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            Report Options Explained
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">
                <strong>Course:</strong> Select the course to generate a report for.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Date Range:</strong> Optional. Filter sessions between specific dates.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>PDF Format:</strong> Formatted document with course details and student list.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Excel Format:</strong> Raw data spreadsheet suitable for further analysis.
              </Typography>
            </li>
          </Box>
        </Paper>
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Excel Format:</strong> Spreadsheet with tabular data for further analysis
              </Typography>
            </li>
          </Box>
        </Paper>
      </Container>
    </DashboardLayout>
  )
}
