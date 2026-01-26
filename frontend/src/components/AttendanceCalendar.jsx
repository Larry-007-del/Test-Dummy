import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { Paper, Typography, Box, Chip, Fade } from '@mui/material'
import api from '../services/api'

export default function AttendanceCalendar({ value, onChange, embedded = false }) {
  const [attendanceDates, setAttendanceDates] = useState([])

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await api.get('/api/attendances/')
        // Assume each attendance has a 'date' field in ISO format
        const dates = (res.data.results || res.data).map(a => a.date?.split('T')[0])
        setAttendanceDates(dates.filter(Boolean))
      } catch {
        setAttendanceDates([])
      } finally {
        // no-op
      }
    }
    fetchAttendance()
  }, [])

  function getDateString(date) {
    return date.toISOString().split('T')[0]
  }

  const content = (
    <>
      <Typography variant="h6" gutterBottom>
        Attendance Calendar
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Calendar
          onChange={onChange}
          value={value}
          calendarType="US"
          tileContent={({ date }) => {
            const dateStr = getDateString(date)
            if (attendanceDates.includes(dateStr)) {
              return (
                <Fade in={true} timeout={800}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Chip label="✔" color="success" size="small" sx={{ fontWeight: 'bold', fontSize: 12, px: 0.5, py: 0 }} />
                  </Box>
                </Fade>
              )
            }
            if (dateStr === getDateString(new Date())) {
              return (
                <Fade in={true} timeout={800}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Chip label="Today" color="primary" size="small" sx={{ fontWeight: 'bold', fontSize: 12, px: 0.5, py: 0 }} />
                  </Box>
                </Fade>
              )
            }
            return null
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
        <Chip label="✔ Attendance" color="success" size="small" />
        <Chip label="Today" color="primary" size="small" />
      </Box>
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <Paper sx={{ p: 2, mt: 3, background: 'linear-gradient(135deg, #e3f2fd 60%, #fffde7 100%)', boxShadow: 6 }}>
      {content}
    </Paper>
  )
}
