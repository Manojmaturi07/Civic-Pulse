import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function ProtectedRoute({ allowedRoles = ['citizen', 'admin'] }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname + location.search,
          message: 'Please sign in or register to access this portal.',
        }}
        replace
      />
    )
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'citizen') {
      return (
        <Navigate
          to="/citizen"
          state={{
            message: 'Access restricted: Municipal official credentials are required for the Admin portal.',
          }}
          replace
        />
      )
    }
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
