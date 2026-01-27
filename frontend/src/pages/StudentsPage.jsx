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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
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
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignCourseId, setAssignCourseId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

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

  const refreshCourses = async () => {
    try {
      const res = await api.get('/api/courses/')
      setCourses(res.data.results || res.data)
    } catch {
      setCourses([])
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return
    try {
      await api.delete(`/api/students/${id}/`)
      refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to delete student.' })
    }
  }

  const openEdit = (student) => {
    setEditForm({
      id: student.id,
      name: student.name || '',
      programme_of_study: student.programme_of_study || '',
      year: student.year || '',
      phone_number: student.phone_number || '',
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    try {
      await api.patch(`/api/students/${editForm.id}/`, {
        name: editForm.name,
        programme_of_study: editForm.programme_of_study,
        year: editForm.year,
        phone_number: editForm.phone_number,
      })
      setEditOpen(false)
      refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to update student.' })
    }
  }

  const openAssign = async (student) => {
    setSelectedStudent(student)
    setAssignCourseId('')
    await refreshCourses()
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    try {
      await api.post('/api/admin/enroll-student/', {
        course_id: assignCourseId,
        student_id: selectedStudent.id,
      })
      setAssignOpen(false)
      refreshCourses()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to enroll student.' })
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
              <TableCell>Actions</TableCell>
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
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(student)}>Edit</Button>
                    <Button size="small" variant="outlined" onClick={() => openAssign(student)}>Enroll</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(student.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!students.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No students found yet.
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Student</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={editForm?.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField label="Programme" value={editForm?.programme_of_study || ''} onChange={(e) => setEditForm({ ...editForm, programme_of_study: e.target.value })} />
            <TextField label="Year" value={editForm?.year || ''} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
            <TextField label="Phone" value={editForm?.phone_number || ''} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll Student in Course</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Course</InputLabel>
            <Select value={assignCourseId} label="Course" onChange={(e) => setAssignCourseId(e.target.value)}>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} ({course.course_code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign} disabled={!assignCourseId}>
            Enroll
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  )
}
