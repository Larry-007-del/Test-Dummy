import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  Alert,
} from '@mui/material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function AttendancePage() {
  const [records, setRecords] = useState([])
  const [downloadError, setDownloadError] = useState(null)

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await api.get('/api/attendances/')
        setRecords(res.data.results || res.data)
      } catch {
        setRecords([])
      }
    }
    fetchAttendance()
  }, [])

  const handleExport = async (attendanceId) => {
    try {
      setDownloadError(null)
      const response = await api.get('/api/attendances/generate_excel/', {
        params: { attendance_id: attendanceId },
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance_${attendanceId}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Unable to export attendance report. Try again.')
    }
  }

  return (
    <DashboardLayout title="Attendance" subtitle="Track daily attendance records">
      <Paper sx={{ p: 3, boxShadow: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Attendance Records
        </Typography>
        {downloadError && <Alert severity="error" sx={{ mb: 2 }}>{downloadError}</Alert>}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Present Students</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Report</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id} hover>
                <TableCell>{record.course?.name || '—'}</TableCell>
                <TableCell>{record.date ? record.date.split('T')[0] : '—'}</TableCell>
                <TableCell>{record.present_students?.length || 0}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={record.is_active ? 'success' : 'default'}
                    label={record.is_active ? 'Active' : 'Closed'}
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" onClick={() => handleExport(record.id)}>
                    Export Excel
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!records.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No attendance records found yet.
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </DashboardLayout>
  )
}
