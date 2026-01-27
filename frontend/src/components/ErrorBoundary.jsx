import { Component } from 'react'
import { Box, Button, Container, Typography, Paper } from '@mui/material'
import { Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
            }}
          >
            <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '4rem', md: '6rem' },
                  fontWeight: 700,
                  color: 'error.main',
                  mb: 2,
                }}
              >
                Oops!
              </Typography>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                We're sorry for the inconvenience. An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </Typography>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: '#f5f5f5',
                    textAlign: 'left',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.error.toString()}
                  </Typography>
                </Paper>
              )}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={() => window.location.reload()}
                  size="large"
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={() => window.location.href = '/dashboard'}
                  size="large"
                >
                  Go Home
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      )
    }

    return this.props.children
  }
}
