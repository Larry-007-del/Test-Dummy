import React, { useEffect, useState, useCallback } from 'react';
import { CssBaseline, Box, Container, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, Snackbar } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar, TopBar } from './components/Layout';
import CalendarView from './components/CalendarView';
import api from './api';
import LoginForm from './components/LoginForm';

function DashboardCards() {
  const [metrics, setMetrics] = useState({ users: 0, attendances: 0, requests: 0, lastLogin: '-' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true);
    api.get('/metrics/')
      .then(res => {
        setMetrics(res.data);
        setError('');
      })
      .catch(() => {
        setError('Failed to load metrics. Showing fallback data.');
        setMetrics({ users: 120, attendances: 8, requests: 5, lastLogin: '2026-01-25' });
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  return (
    <>
      {error && <Alert severity="warning">{error}</Alert>}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        { [
          { title: 'Total Users', value: metrics.users },
          { title: 'Active Attendances', value: metrics.attendances },
          { title: 'Pending Requests', value: metrics.requests },
          { title: 'Last Login', value: metrics.lastLogin },
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card>
              <CardContent>
                <Typography variant="h6">{card.title}</Typography>
                <Typography variant="h4">{card.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}

function DashboardPage() {
  return (
    <>
      <Typography variant="h3" align="center" sx={{ mt: 4 }}>
        Attendance Dashboard
      </Typography>
      <DashboardCards />
      <CalendarView />
    </>
  );
}

function CalendarPage() {
  return (
    <>
      <Typography variant="h3" align="center" sx={{ mt: 4 }}>
        Attendance Calendar
      </Typography>
      <CalendarView />
    </>
  );
}

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Simulate user roles for demo
  const currentUserRole = 'Admin'; // Replace with real role from backend
  useEffect(() => {
    setLoading(true);
    api.get('/users/')
      .then(res => {
        setUsers(res.data);
        setError('');
      })
      .catch(() => {
        setError('Failed to load users. Showing fallback data.');
        setUsers([
          { name: 'John Doe', role: 'Lecturer', lastLogin: '2026-01-25' },
          { name: 'Jane Smith', role: 'Student', lastLogin: '2026-01-24' },
          { name: 'Alice Brown', role: 'Admin', lastLogin: '2026-01-23' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  return (
    <>
      {error && <Alert severity="warning">{error}</Alert>}
      <Typography variant="h3" align="center" sx={{ mt: 4 }}>
        Users
      </Typography>
      {currentUserRole === 'Admin' && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Last Login</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user, idx) => (
                <TableRow key={idx}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {currentUserRole !== 'Admin' && (
        <Alert severity="info" sx={{ mt: 4 }}>You do not have permission to view users.</Alert>
      )}
    </>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);
  const handleLogin = () => {
    setIsAuthenticated(true);
    setSnackbar({ open: true, message: 'Login successful!', severity: 'success' });
  };
  const handleLogout = useCallback(() => {
    api.post('/auth/logout/').finally(() => {
      setIsAuthenticated(false);
      setSnackbar({ open: true, message: 'Logged out.', severity: 'info' });
      localStorage.removeItem('isAuthenticated');
    });
  }, []);
  return (
    <Router>
      {isAuthenticated ? (
        <Box sx={{ display: 'flex', bgcolor: '#f5f5f5', minHeight: '100vh', flexDirection: { xs: 'column', md: 'row' } }}>
          <CssBaseline />
          <TopBar onLogout={handleLogout} />
          <Sidebar />
          <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 10 }, ml: { xs: 0, md: 30 }, flex: 1 }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Routes>
          </Container>
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </Router>
  );
}

export default App;
