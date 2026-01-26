import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@mui/material'
import api from '../services/api'

export default function LoginPage({ setIsAuthenticated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('admin')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/api/api-token-auth/', {
        username,
        password,
      })

      const token = response.data?.token
      if (token) {
        localStorage.setItem('authToken', token)
        setIsAuthenticated(true)
        try {
          const me = await api.get('/api/me/')
          const userRole = me.data?.role || role
          if (userRole === 'student') navigate('/student-dashboard')
          else if (userRole === 'lecturer') navigate('/lecturer-dashboard')
          else navigate('/dashboard')
        } catch {
          navigate(role === 'student' ? '/student-dashboard' : role === 'lecturer' ? '/lecturer-dashboard' : '/dashboard')
        }
      } else {
        setError('Invalid username or password')
      }
    } catch (err) {
      setError('Invalid username or password')
      console.error('Login error:', err)
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
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Attendance System
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Sign in to your account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleLogin}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Role</InputLabel>
              <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="lecturer">Lecturer</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>

          <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
            Demo credentials: admin / 123
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}
