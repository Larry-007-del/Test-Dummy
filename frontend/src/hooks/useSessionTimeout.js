import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds
const WARNING_TIME = 5 * 60 * 1000 // Show warning 5 minutes before timeout

export function useSessionTimeout(isAuthenticated) {
  const navigate = useNavigate()
  const timeoutRef = useRef(null)
  const warningRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  const resetTimer = () => {
    lastActivityRef.current = Date.now()
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    
    if (!isAuthenticated) return

    // Set warning timer
    warningRef.current = setTimeout(() => {
      const shouldWarn = confirm(
        'Your session will expire in 5 minutes due to inactivity. Click OK to stay logged in.'
      )
      if (shouldWarn) {
        resetTimer() // User confirmed, reset timer
      }
    }, INACTIVITY_TIMEOUT - WARNING_TIME)

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      localStorage.removeItem('authToken')
      navigate('/login')
      alert('Your session has expired due to inactivity. Please log in again.')
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    if (!isAuthenticated) return

    // Activity events to monitor
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      const now = Date.now()
      // Only reset if more than 1 minute has passed since last activity
      if (now - lastActivityRef.current > 60000) {
        resetTimer()
      }
    }

    // Attach event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Initialize timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [isAuthenticated, navigate])
}
