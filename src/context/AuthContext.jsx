import { createContext, useContext, useEffect, useState } from 'react'
import { api, setAuthToken } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verify and sync session on initial mount against FastAPI backend
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('civicpulse_token')
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const remoteUser = await api.getMe()
        setUser(remoteUser)
      } catch (err) {
        console.warn('Session verification failed or expired:', err.message)
        setAuthToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  async function login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (!cleanEmail) {
      return { success: false, error: 'Please enter an email address.' }
    }
    if (!cleanPassword) {
      return { success: false, error: 'Please enter a password.' }
    }

    try {
      const res = await api.login({ email: cleanEmail, password: cleanPassword })
      if (res && res.access_token) {
        setAuthToken(res.access_token)
        setUser(res.user)
        return { success: true, user: res.user }
      }
      return { success: false, error: 'Failed to obtain authentication token from server.' }
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Invalid email or password credentials.',
      }
    }
  }

  async function register({ name, email, password, city, department }) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Email and password are required.' }
    }

    try {
      // Mandatory security constraint: Always register with citizen role on backend
      const res = await api.register({
        name: name ? name.trim() : 'Citizen Member',
        email: cleanEmail,
        password: cleanPassword,
        city: city || 'Vijayawada',
        department: department || 'Resident',
      })

      if (res && res.access_token) {
        setAuthToken(res.access_token)
        setUser(res.user)
        return { success: true, user: res.user }
      }
      return { success: false, error: 'Registration succeeded but session token was missing.' }
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Registration failed. Please check your information.',
      }
    }
  }

  async function updateUser(updatedFields) {
    if (!user) return
    try {
      const updated = await api.updateProfile(updatedFields)
      setUser(updated)
      return updated
    } catch (err) {
      console.error('Failed to sync profile update to backend', err)
      throw err
    }
  }

  async function logout() {
    try {
      await api.logout()
    } catch (err) {
      console.warn('Logout API notification error:', err.message)
    } finally {
      setAuthToken(null)
      setUser(null)
      localStorage.removeItem('civicpulse_current_user')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
