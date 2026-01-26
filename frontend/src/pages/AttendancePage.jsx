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
} from '@mui/material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function AttendancePage() {
  const [records, setRecords] = useState([])

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

  return (
    <DashboardLayout title="Attendance" subtitle="Track daily attendance records">
      <Paper sx={{ p: 3, boxShadow: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Attendance Records
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Present Students</TableCell>
              <TableCell>Status</TableCell>
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
              </TableRow>
            ))}
            {!records.length && (
              <TableRow>
                <TableCell colSpan={4}>
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
