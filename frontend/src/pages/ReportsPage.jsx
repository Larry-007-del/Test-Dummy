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
  const [attendanceId, setAttendanceId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGenerateReport = async () => {
    if (!attendanceId && !courseId) {
      setMessage({ type: 'error', text: 'Please provide either an Attendance ID or Course ID' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const params = new URLSearchParams()
      if (attendanceId) params.append('attendance_id', attendanceId)
      if (courseId) params.append('course_id', courseId)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('format', format)

      const endpoint = format === 'pdf' 
        ? '/api/attendances/generate_pdf/'
        : '/api/attendances/generate_excel/'

      const response = await api.get(`${endpoint}?${params.toString()}`, {
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
                <TextField
                  fullWidth
                  label="Attendance ID (Optional)"
                  value={attendanceId}
                  onChange={e => setAttendanceId(e.target.value)}
                  placeholder="Enter specific attendance session ID"
                  type="number"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Course ID (Optional)"
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                  placeholder="Enter course ID for all sessions"
                  type="number"
                />
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
                <strong>Attendance ID:</strong> Generate report for a specific attendance session
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Course ID:</strong> Generate report for all sessions of a specific course
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Date Range:</strong> Filter attendance sessions by date range
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>PDF Format:</strong> Formatted document with course details, student list, and statistics
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
