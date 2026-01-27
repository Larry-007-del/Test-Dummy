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

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState([])
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({
    username: '',
    password: '',
    staff_id: '',
    name: '',
    department: '',
    phone_number: '',
  })
  const [message, setMessage] = useState(null)
  const [uploadMessage, setUploadMessage] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignCourseId, setAssignCourseId] = useState('')
  const [selectedLecturer, setSelectedLecturer] = useState(null)

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

  const refresh = async () => {
    try {
      const res = await api.get('/api/lecturers/')
      setLecturers(res.data.results || res.data)
    } catch {
      setLecturers([])
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
      await api.post('/api/admin/create-lecturer/', form)
      setMessage({ type: 'success', text: 'Lecturer created.' })
      setForm({
        username: '',
        password: '',
        staff_id: '',
        name: '',
        department: '',
        phone_number: '',
      })
      refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to create lecturer.' })
    }
  }

  const downloadTemplate = () => {
    const header = 'username,password,staff_id,name,department,phone_number\n'
    const blob = new Blob([header], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lecturers_template.csv'
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
      const res = await api.post('/api/admin/import-lecturers/', formData)
      setUploadMessage({ type: 'success', text: `Imported: ${res.data.created}, Skipped: ${res.data.skipped}` })
      refresh()
    } catch (error) {
      setUploadMessage({ type: 'error', text: error?.response?.data?.error || 'Import failed.' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lecturer?')) return
    try {
      await api.delete(`/api/lecturers/${id}/`)
      refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to delete lecturer.' })
    }
  }

  const openEdit = (lecturer) => {
    setEditForm({
      id: lecturer.id,
      name: lecturer.name || '',
      department: lecturer.department || '',
      phone_number: lecturer.phone_number || '',
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    try {
      await api.patch(`/api/lecturers/${editForm.id}/`, {
        name: editForm.name,
        department: editForm.department,
        phone_number: editForm.phone_number,
      })
      setEditOpen(false)
      refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to update lecturer.' })
    }
  }

  const openAssign = async (lecturer) => {
    setSelectedLecturer(lecturer)
    setAssignCourseId('')
    await refreshCourses()
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    try {
      await api.post('/api/admin/assign-lecturer/', {
        course_id: assignCourseId,
        lecturer_id: selectedLecturer.id,
      })
      setAssignOpen(false)
      refreshCourses()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to assign lecturer.' })
    }
  }

  return (
    <DashboardLayout title="Lecturers" subtitle="Manage faculty and staff">
      <Paper sx={{ p: 3, boxShadow: 4, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Create Lecturer (Admin)
        </Typography>
        {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} fullWidth />
          <TextField label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
          <TextField label="Staff ID" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} fullWidth />
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} fullWidth />
          <TextField label="Phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} fullWidth />
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </Stack>
        <Typography variant="body2" color="textSecondary">
          Default password is "changeme123" if left blank.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, boxShadow: 4, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Bulk Import Lecturers (CSV)
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
              <TableCell>Actions</TableCell>
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
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(lecturer)}>Edit</Button>
                    <Button size="small" variant="outlined" onClick={() => openAssign(lecturer)}>Assign</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(lecturer.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!lecturers.length && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No lecturers found yet.
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Lecturer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={editForm?.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField label="Department" value={editForm?.department || ''} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
            <TextField label="Phone" value={editForm?.phone_number || ''} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Lecturer to Course</DialogTitle>
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
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  )
}
