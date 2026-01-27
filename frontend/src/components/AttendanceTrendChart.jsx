import { useEffect, useState } from 'react'
import { Paper, Typography, Box, Skeleton } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../services/api'

export default function AttendanceTrendChart({ embedded = false }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await api.get('/api/attendances/')
        // Group by date and count
        const counts = {}
        const attendances = res.data.results || res.data
        attendances.forEach(a => {
          const date = a.date?.split('T')[0]
          if (date) counts[date] = (counts[date] || 0) + 1
        })
        // Convert to array and sort by date
        const chartData = Object.entries(counts).map(([date, count]) => ({ date, count }))
        chartData.sort((a, b) => new Date(a.date) - new Date(b.date))
        setData(chartData)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetchAttendance()
  }, [])

  const content = (
    <>
      <Typography variant="h6" gutterBottom>
        Attendance Trend
      </Typography>
      {loading ? (
        <Skeleton variant="rectangular" width="100%" height={250} />
      ) : (
        <Box sx={{ width: '100%', minHeight: 250, height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <Paper sx={{ p: 2, mt: 3, background: 'linear-gradient(135deg, #fffde7 60%, #e3f2fd 100%)', boxShadow: 6 }}>
      {content}
    </Paper>
  )
}
