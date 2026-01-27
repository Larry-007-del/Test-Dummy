import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useSessionTimeout } from './hooks/useSessionTimeout'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import LecturersPage from './pages/LecturersPage'
import StudentsPage from './pages/StudentsPage'
import AttendancePage from './pages/AttendancePage'
import StudentDashboard from './pages/StudentDashboard'
import LecturerDashboard from './pages/LecturerDashboard'
import NotFoundPage from './pages/NotFoundPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PrivateRoute from './components/PrivateRoute'
import api from './services/api'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem('authToken')),
  )
  const [loading, setLoading] = useState(true)

  // Add session timeout monitoring
  useSessionTimeout(isAuthenticated)

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
        await api.get('/api/me/')
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
    <ErrorBoundary>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />      <Route
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
        path="/student-dashboard"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer-dashboard"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <LecturerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
