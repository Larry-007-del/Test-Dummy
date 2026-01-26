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

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState([])

  useEffect(() => {
    async function fetchLecturers() {
      try {
        const res = await api.get('/api/lecturers/')
        setLecturers(res.data.results || res.data)
      } catch {
        setLecturers([])
      }
    }
    fetchLecturers()
  }, [])

  return (
    <DashboardLayout title="Lecturers" subtitle="Manage faculty and staff">
      <Paper sx={{ p: 3, boxShadow: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Lecturer Directory
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Staff ID</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lecturers.map((lecturer) => (
              <TableRow key={lecturer.id} hover>
                <TableCell>{lecturer.name}</TableCell>
                <TableCell>{lecturer.staff_id}</TableCell>
                <TableCell>{lecturer.department || '—'}</TableCell>
                <TableCell>{lecturer.phone_number || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" color="success" label="Active" />
                </TableCell>
              </TableRow>
            ))}
            {!lecturers.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No lecturers found yet.
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
