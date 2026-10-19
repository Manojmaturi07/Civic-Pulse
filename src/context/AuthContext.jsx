import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const DEFAULT_USERS = [
  {
    id: 'usr-admin-1',
    email: 'admin@city.gov',
    password: 'civicpulse',
    name: 'Commissioner R. Varma',
    role: 'admin',
    department: 'Municipal Administration',
    city: 'Vijayawada',
    avatar: '🏛️',
  },
  {
    id: 'usr-admin-2',
    email: 'engineer@city.gov',
    password: 'civicpulse',
    name: 'Priya Sharma (Assistant Engineer)',
    role: 'admin',
    department: 'Roads & Transport',
    city: 'Vijayawada',
    avatar: '👷‍♀️',
  },
  {
    id: 'usr-citizen-1',
    email: 'citizen@civicpulse.app',
    password: 'civicpulse',
    name: 'Ananya Kumar',
    role: 'citizen',
    department: 'Resident',
    city: 'Vijayawada',
    avatar: '👤',
  },
  {
    id: 'usr-citizen-2',
    email: 'demo@civicpulse.app',
    password: 'civicpulse',
    name: 'Demo Citizen',
    role: 'citizen',
    department: 'Resident',
    city: 'Vijayawada',
    avatar: '👤',
  },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('civicpulse_current_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('civicpulse_registered_users')
      return stored ? JSON.parse(stored) : DEFAULT_USERS
    } catch {
      return DEFAULT_USERS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('civicpulse_registered_users', JSON.stringify(registeredUsers))
    } catch (e) {
      console.error('Failed to sync registered users', e)
    }
  }, [registeredUsers])

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('civicpulse_current_user', JSON.stringify(user))
      } else {
        localStorage.removeItem('civicpulse_current_user')
      }
    } catch (e) {
      console.error('Failed to sync current user', e)
    }
  }, [user])

  function login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (!cleanEmail) {
      return { success: false, error: 'Please enter an email address.' }
    }
    if (!cleanPassword) {
      return { success: false, error: 'Please enter a password.' }
    }

    // Check existing registered users
    const matched = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail)

    if (matched) {
      // Validate password if set
      if (matched.password && cleanPassword !== matched.password && cleanPassword !== 'civicpulse') {
        return { success: false, error: 'Incorrect password. (Hint: default demo password is "civicpulse")' }
      }
      setUser(matched)
      return { success: true, user: matched }
    }

    // Smart role determination for new / ad-hoc logins
    // Email domains or prefixes indicating municipal official
    const isMunicipal =
      cleanEmail.endsWith('@city.gov') ||
      cleanEmail.endsWith('@gov.in') ||
      cleanEmail.endsWith('@municipal.gov') ||
      cleanEmail.startsWith('admin@') ||
      cleanEmail.startsWith('municipal@') ||
      cleanEmail.startsWith('officer@') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('municipal')

    const role = isMunicipal ? 'admin' : 'citizen'
    const namePrefix = cleanEmail.split('@')[0]
    const formattedName =
      namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1).replace(/[._-]/g, ' ')

    const newUser = {
      id: 'usr-' + Date.now(),
      email: cleanEmail,
      password: cleanPassword,
      name: isMunicipal ? `Officer ${formattedName}` : formattedName,
      role: role,
      department: isMunicipal ? 'Municipal Corporation' : 'Resident',
      city: 'Vijayawada',
      avatar: isMunicipal ? '🏛️' : '👤',
    }

    setRegisteredUsers((prev) => [...prev, newUser])
    setUser(newUser)
    return { success: true, user: newUser }
  }

  function register({ name, email, password, city, role, department }) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Email and password are required.' }
    }

    const existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail)
    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please log in.' }
    }

    // Auto-detect role if user email is clearly a municipal domain, otherwise respect provided role or default
    const detectedRole =
      role ||
      (cleanEmail.endsWith('@city.gov') || cleanEmail.endsWith('@gov.in') || cleanEmail.endsWith('@municipal.gov')
        ? 'admin'
        : 'citizen')

    const newUser = {
      id: 'usr-' + Date.now(),
      email: cleanEmail,
      password: cleanPassword,
      name: name || (detectedRole === 'admin' ? 'Municipal Officer' : 'Citizen Member'),
      role: detectedRole,
      department: department || (detectedRole === 'admin' ? 'Public Administration' : 'Resident'),
      city: city || 'Vijayawada',
      avatar: detectedRole === 'admin' ? '🏛️' : '👤',
    }

    setRegisteredUsers((prev) => [...prev, newUser])
    setUser(newUser)
    return { success: true, user: newUser }
  }

  function updateUser(updatedFields) {
    if (!user) return
    const updated = { ...user, ...updatedFields }
    setUser(updated)
    setRegisteredUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('civicpulse_current_user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        updateUser,
        logout,
        demoUsers: DEFAULT_USERS,
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
