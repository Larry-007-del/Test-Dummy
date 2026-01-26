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

export default function StudentsPage() {
  const [students, setStudents] = useState([])

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await api.get('/api/students/')
        setStudents(res.data.results || res.data)
      } catch {
        setStudents([])
      }
    }
    fetchStudents()
  }, [])

  return (
    <DashboardLayout title="Students" subtitle="Manage student records">
      <Paper sx={{ p: 3, boxShadow: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Student Roster
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Programme</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.student_id}</TableCell>
                <TableCell>{student.programme_of_study || '—'}</TableCell>
                <TableCell>{student.year || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" color="success" label="Enrolled" />
                </TableCell>
              </TableRow>
            ))}
            {!students.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No students found yet.
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
