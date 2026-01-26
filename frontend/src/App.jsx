import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import LecturersPage from './pages/LecturersPage'
import StudentsPage from './pages/StudentsPage'
import AttendancePage from './pages/AttendancePage'
import PrivateRoute from './components/PrivateRoute'
import api from './services/api'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem('authToken')),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setIsAuthenticated(false)
      setLoading(false)
      return
    }

    // Check if token is still valid
    const checkAuth = async () => {
      try {
        await api.get('/api/')
        setIsAuthenticated(true)
      } catch (error) {
        localStorage.removeItem('authToken')
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturers"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <LecturersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/students"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <StudentsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <AttendancePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
      />
    </Routes>
  )
}
