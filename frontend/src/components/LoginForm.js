import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import api from '../api';

const roles = [
  { value: 'student', label: 'Student' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and contain a letter and a number.');
      return;
    }
    try {
      await api.post('/auth/login/', { username, password, role });
      onLogin();
    } catch (err) {
      setError('Invalid credentials or role.');
    }
  };

  const handleForgot = async () => {
    setForgotMsg('');
    try {
      await api.post('/auth/forgot-password/', { email: forgotEmail });
      setForgotMsg('If this email is registered, a reset link has been sent.');
    } catch {
      setForgotMsg('Failed to send reset link.');
    }
  };

  return (
    <Paper sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>Login</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          label="Username (ID or Email)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          select
          label="Role"
          value={role}
          onChange={e => setRole(e.target.value)}
          fullWidth
          margin="normal"
        >
          {roles.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Log In
        </Button>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button color="secondary" size="small" onClick={() => setForgotOpen(true)}>Forgot Password?</Button>
      </Box>
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField
            label="Institutional Email"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          {forgotMsg && <Alert severity="info" sx={{ mt: 2 }}>{forgotMsg}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
          <Button onClick={handleForgot} variant="contained">Send Reset Link</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default LoginForm;
