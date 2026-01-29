import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
        return
    }

    try {
        const response = await api.get('/api/me/')
        setUser(response.data)
        setIsAuthenticated(true)
    } catch (error) {
        localStorage.removeItem('authToken')
        setUser(null)
        setIsAuthenticated(false)
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = (token) => {
    localStorage.setItem('authToken', token)
    setIsAuthenticated(true)
    checkAuth() // Fetch user data immediately
  }

  const logout = async () => {
    try {
        await api.post('/api/logout/')
    } catch (e) {
        console.error(e)
    } finally {
        localStorage.removeItem('authToken')
        setUser(null)
        setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
