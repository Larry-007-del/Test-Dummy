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
  TextField,
  Button,
  Alert,
  Stack,
} from '@mui/material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({
    username: '',
    password: '',
    student_id: '',
    name: '',
    programme_of_study: '',
    year: '',
    phone_number: '',
  })
  const [message, setMessage] = useState(null)
  const [uploadMessage, setUploadMessage] = useState(null)

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

  const refresh = async () => {
    try {
      const res = await api.get('/api/students/')
      setStudents(res.data.results || res.data)
    } catch {
      setStudents([])
    }
  }

  const handleCreate = async () => {
    setMessage(null)
    try {
      await api.post('/api/admin/create-student/', form)
      setMessage({ type: 'success', text: 'Student created.' })
      setForm({
        username: '',
        password: '',
        student_id: '',
        name: '',
        programme_of_study: '',
        year: '',
        phone_number: '',
      })
      refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to create student.' })
    }
  }

  const downloadTemplate = () => {
    const header = 'username,password,student_id,name,programme_of_study,year,phone_number\n'
    const blob = new Blob([header], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'students_template.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleUpload = async (event) => {
    setUploadMessage(null)
    const file = event.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/api/admin/import-students/', formData)
      setUploadMessage({ type: 'success', text: `Imported: ${res.data.created}, Skipped: ${res.data.skipped}` })
      refresh()
    } catch (error) {
      setUploadMessage({ type: 'error', text: error?.response?.data?.error || 'Import failed.' })
    }
  }

  return (
    <DashboardLayout title="Students" subtitle="Manage student records">
      <Paper sx={{ p: 3, boxShadow: 4, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Create Student (Admin)
        </Typography>
        {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} fullWidth />
          <TextField label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
          <TextField label="Student ID" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} fullWidth />
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Programme" value={form.programme_of_study} onChange={(e) => setForm({ ...form, programme_of_study: e.target.value })} fullWidth />
          <TextField label="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} fullWidth />
          <TextField label="Phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} fullWidth />
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </Stack>
        <Typography variant="body2" color="textSecondary">
          Default password is "changeme123" if left blank.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, boxShadow: 4, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Bulk Import Students (CSV)
        </Typography>
        {uploadMessage && <Alert severity={uploadMessage.type} sx={{ mb: 2 }}>{uploadMessage.text}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Button variant="outlined" onClick={downloadTemplate}>Download Template</Button>
          <Button variant="contained" component="label">
            Upload CSV
            <input type="file" hidden accept=".csv" onChange={handleUpload} />
          </Button>
        </Stack>
      </Paper>

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
