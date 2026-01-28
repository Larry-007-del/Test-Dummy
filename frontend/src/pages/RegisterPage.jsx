import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Container,
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  CircularProgress
} from '@mui/material'
import api from '../services/api'

export default function RegisterPage() {
  const [role, setRole] = useState('student')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    first_name: '',
    last_name: '',
    student_id: '',
    programme: '', 
    staff_id: '',
    department: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setRole(newRole)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match")
        return
    }

    setLoading(true)

    try {
      const payload = {
        role,
        username: formData.username,
        password: formData.password,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
      }

      if (role === 'student') {
        payload.student_id = formData.student_id
        payload.programme = formData.programme
      } else {
        payload.staff_id = formData.staff_id
        payload.department = formData.department
      }

      await api.post('/api/register/', payload)
      // On success, redirect to login with a message
      localStorage.setItem('loginMessage', 'Account created successfully! Please log in.')
      navigate('/login')

    } catch (err) {
      console.error('Registration error:', err)
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          py: 4
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Join the Attendance System
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <ToggleButtonGroup
              color="primary"
              value={role}
              exclusive
              onChange={handleRoleChange}
              aria-label="User Role"
            >
              <ToggleButton value="student">Student</ToggleButton>
              <ToggleButton value="lecturer">Lecturer</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleRegister}>
             <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                    <TextField fullWidth label="First Name" name="first_name" required onChange={handleChange} />
                    <TextField fullWidth label="Last Name" name="last_name" required onChange={handleChange} />
                </Stack>
                <TextField fullWidth label="Username" name="username" required onChange={handleChange} />
                <TextField fullWidth label="Email" name="email" type="email" required onChange={handleChange} />
                
                {role === 'student' ? (
                    <>
                        <TextField fullWidth label="Student ID" name="student_id" required onChange={handleChange} helperText="e.g., UP/123/456" />
                        <TextField fullWidth label="Programme of Study" name="programme" required onChange={handleChange} />
                    </>
                ) : (
                    <>
                        <TextField fullWidth label="Staff ID" name="staff_id" required onChange={handleChange} />
                        <TextField fullWidth label="Department" name="department" required onChange={handleChange} />
                    </>
                )}

                <TextField fullWidth label="Password" name="password" type="password" required onChange={handleChange} />
                <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" required onChange={handleChange} />

                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{ mt: 2 }}
                >
                    {loading ? <CircularProgress size={24} /> : 'Sign Up'}
                </Button>
            </Stack>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link to="/login" style={{ textDecoration: 'none', fontWeight: 'bold' }}>
                Log in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}
