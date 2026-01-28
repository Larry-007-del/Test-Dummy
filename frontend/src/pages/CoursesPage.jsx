import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Skeleton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Upload as UploadIcon,
} from '@mui/icons-material'
import DashboardLayout from '../components/DashboardLayout'
import api from '../services/api'

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [lecturers, setLecturers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openBatchDialog, setOpenBatchDialog] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [message, setMessage] = useState(null)
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    lecturer: '',
    students: [],
  })
  const [csvFile, setCsvFile] = useState(null)
  const [batchResult, setBatchResult] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [coursesRes, lecturersRes, studentsRes] = await Promise.all([
        api.get('/api/courses/'),
        api.get('/api/lecturers/'),
        api.get('/api/students/'),
      ])
      setCourses(coursesRes.data || [])
      setLecturers(lecturersRes.data || [])
      setStudents(studentsRes.data || [])
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (course = null) => {
    if (course) {
      setEditingCourse(course)
      setFormData({
        course_code: course.course_code,
        course_name: course.course_name,
        lecturer: course.lecturer?.id || '',
        students: course.students?.map(s => s.id) || [],
      })
    } else {
      setEditingCourse(null)
      setFormData({
        course_code: '',
        course_name: '',
        lecturer: '',
        students: [],
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCourse(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingCourse) {
        await api.put(`/api/courses/${editingCourse.id}/`, formData)
        setMessage({ type: 'success', text: 'Course updated successfully' })
      } else {
        await api.post('/api/courses/', formData)
        setMessage({ type: 'success', text: 'Course created successfully' })
      }
      fetchData()
      handleCloseDialog()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Failed to save course' })
    }
  }

  const handleDelete = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    try {
      await api.delete(`/api/courses/${courseId}/`)
      setMessage({ type: 'success', text: 'Course deleted successfully' })
      fetchData()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete course' })
    }
  }

  const handleBatchUpload = async () => {
    if (!csvFile) {
      setMessage({ type: 'error', text: 'Please select a CSV file' })
      return
    }

    const formData = new FormData()
    formData.append('file', csvFile)

    try {
      const response = await api.post('/api/courses/batch_upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBatchResult(response.data)
      setMessage({ 
        type: 'success', 
        text: `Successfully created ${response.data.success_count} courses. ${response.data.error_count} errors.` 
      })
      fetchData()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Batch upload failed' })
    }
  }

  return (
    <DashboardLayout title="Course Management" subtitle="Manage courses and enrollments">
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Courses
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setOpenBatchDialog(true)}
            >
              Batch Upload
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Course
            </Button>
          </Box>
        </Box>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map(i => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="rectangular" height={80} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course Code</TableCell>
                  <TableCell>Course Name</TableCell>
                  <TableCell>Lecturer</TableCell>
                  <TableCell>Students Enrolled</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No courses found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map(course => (
                    <TableRow key={course.id}>
                      <TableCell>{course.course_code}</TableCell>
                      <TableCell>{course.course_name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" />
                          {course.lecturer?.name || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon fontSize="small" />
                          {course.students?.length || 0}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={course.is_active ? 'Active' : 'Inactive'}
                          color={course.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(course)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(course.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Course Code"
                value={formData.course_code}
                onChange={e => setFormData({ ...formData, course_code: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Course Name"
                value={formData.course_name}
                onChange={e => setFormData({ ...formData, course_name: e.target.value })}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Lecturer</InputLabel>
                <Select
                  value={formData.lecturer}
                  onChange={e => setFormData({ ...formData, lecturer: e.target.value })}
                  label="Lecturer"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {lecturers.map(lecturer => (
                    <MenuItem key={lecturer.id} value={lecturer.id}>
                      {lecturer.name} ({lecturer.staff_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Students</InputLabel>
                <Select
                  multiple
                  value={formData.students}
                  onChange={e => setFormData({ ...formData, students: e.target.value })}
                  label="Students"
                  renderValue={selected => `${selected.length} selected`}
                >
                  {students.map(student => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name} ({student.student_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingCourse ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Batch Upload Dialog */}
        <Dialog open={openBatchDialog} onClose={() => setOpenBatchDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Batch Upload Courses (CSV)</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Upload a CSV file with columns: course_code, course_name, lecturer_staff_id, student_ids (comma-separated)
              </Alert>
              <input
                type="file"
                accept=".csv"
                onChange={e => setCsvFile(e.target.files[0])}
                style={{ marginBottom: 16 }}
              />
              {batchResult && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Upload Results:</Typography>
                  <Typography variant="body2" color="success.main">
                    ✓ {batchResult.success_count} courses created
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    ✗ {batchResult.error_count} errors
                  </Typography>
                  {batchResult.errors && batchResult.errors.length > 0 && (
                    <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                      {batchResult.errors.map((err, idx) => (
                        <Typography key={idx} variant="caption" display="block" color="error">
                          Row {err.row}: {err.errors.join(', ')}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBatchDialog(false)}>Close</Button>
            <Button onClick={handleBatchUpload} variant="contained" disabled={!csvFile}>
              Upload
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  )
}
