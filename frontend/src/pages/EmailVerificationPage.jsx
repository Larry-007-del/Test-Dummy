import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
  Alert,
} from '@mui/material'
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material'
import api from '../services/api'

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token) => {
    try {
      const response = await api.post('/api/auth/verify-email/', { token })
      setStatus('success')
      setMessage(response.data?.message || 'Email verified successfully!')
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      setStatus('error')
      setMessage(error?.response?.data?.error || 'Invalid or expired verification token')
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Card sx={{ boxShadow: 6, p: 4, width: '100%' }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {status === 'verifying' && (
                <>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h5" fontWeight={600}>
                    Verifying Email
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Please wait while we verify your email address...
                  </Typography>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    Email Verified!
                  </Typography>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {message}
                  </Alert>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                    Redirecting to login page...
                  </Typography>
                </>
              )}

              {status === 'error' && (
                <>
                  <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    Verification Failed
                  </Typography>
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {message}
                  </Alert>
                  <Button
                    variant="contained"
                    sx={{ mt: 3 }}
                    onClick={() => navigate('/login')}
                  >
                    Go to Login
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
