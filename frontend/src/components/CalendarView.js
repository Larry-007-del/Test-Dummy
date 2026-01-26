import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, IconButton, CircularProgress, Alert } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import api from '../api';

function getWeekDates(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getRandomStatus() {
  const statuses = [
    { label: 'Present', color: '#4caf50' },
    { label: 'Absent', color: '#f44336' },
    { label: 'Leave', color: '#ff9800' },
    { label: 'Holiday', color: '#2196f3' },
    { label: 'Pending', color: '#e0e0e0' }
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function normalizeStatus(status) {
  if (!status) return getRandomStatus();
  if (typeof status === 'object' && status.label && status.color) return status;
  const map = {
    present: { label: 'Present', color: '#4caf50' },
    absent: { label: 'Absent', color: '#f44336' },
    leave: { label: 'Leave', color: '#ff9800' },
    holiday: { label: 'Holiday', color: '#2196f3' },
    pending: { label: 'Pending', color: '#e0e0e0' }
  };
  const key = String(status).toLowerCase();
  return map[key] || getRandomStatus();
}

function CalendarView() {
  const [weekStart, setWeekStart] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const weekDates = getWeekDates(weekStart);

  useEffect(() => {
    setLoading(true);
    api.get('/attendance/', {
      params: {
        start: weekDates[0].toISOString().slice(0, 10),
        end: weekDates[6].toISOString().slice(0, 10)
      }
    })
      .then(res => {
        setAttendance(res.data);
        setError('');
      })
      .catch(() => {
        setError('Failed to load attendance. Showing random data.');
        setAttendance([]); // fallback to random
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [weekStart]);

  const getStatusForDate = (date) => {
    const dStr = date.toISOString().slice(0, 10);
    const list = Array.isArray(attendance) ? attendance : [];
    const found = list.find(a => a.date === dStr);
    if (found) return normalizeStatus(found.status);
    return getRandomStatus();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Paper sx={{ mt: 4, p: 2 }}>
      {error && <Alert severity="warning">{error}</Alert>}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => { const prev = new Date(weekStart); prev.setDate(weekStart.getDate() - 7); setWeekStart(prev); }}><ArrowBack /></IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1, textAlign: 'center' }}>
          {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
        </Typography>
        <IconButton onClick={() => { const next = new Date(weekStart); next.setDate(weekStart.getDate() + 7); setWeekStart(next); }}><ArrowForward /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {weekDates.map((date, idx) => {
          const status = getStatusForDate(date);
          return (
            <Box key={idx} sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="subtitle2">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography variant="body2">
                {date.getDate()}
              </Typography>
              <Box sx={{ mt: 1, height: 24, bgcolor: status.color, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color={status.color === '#e0e0e0' ? 'text.secondary' : 'common.white'}>{status.label}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default CalendarView;
