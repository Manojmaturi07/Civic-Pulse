import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTarget = location.state?.from
  const promptMessage = location.state?.message

  // Real-time role hint based on the entered email
  const cleanEmail = email.trim().toLowerCase()
  const detectedRole = cleanEmail
    ? cleanEmail.endsWith('@city.gov') ||
      cleanEmail.endsWith('@gov.in') ||
      cleanEmail.endsWith('@municipal.gov') ||
      cleanEmail.startsWith('admin@') ||
      cleanEmail.startsWith('municipal@') ||
      cleanEmail.startsWith('officer@') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('municipal')
      ? 'admin'
      : 'citizen'
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setIsLoading(true)

    const result = await login(email, password)

    if (!result.success) {
      setError(result.error || 'Invalid credentials. Please try again.')
      setIsLoading(false)
      return
    }

    const user = result.user
    const roleTitle = user.role === 'admin' ? 'Municipal Staff' : 'Citizen'
    
    // Choose destination: use state.from if compatible with user role
    let dest = redirectTarget || (user.role === 'admin' ? '/admin' : '/citizen')
    if (user.role !== 'admin' && String(dest).startsWith('/admin')) {
      dest = '/citizen'
    }

    setSuccessMsg(`Authenticated as ${roleTitle} (${user.name}). Redirecting...`)
    setTimeout(() => {
      navigate(dest, { replace: true })
    }, 600)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Brand to="/" />
        <div>
          <h2>Single Sign-On for Citizens & Municipal Teams</h2>
          <p style={{ marginTop: 14, opacity: 0.85, maxWidth: 440, lineHeight: 1.6 }}>
            Enter your credentials. CivicPulse automatically recognizes your account role and routes you directly to the Citizen reporting dashboard or the Municipal administrative workbench.
          </p>
        </div>

        <p style={{ opacity: 0.6, fontSize: 13 }}>
          CivicPulse Secure Authentication Engine · Capstone C2C-146
        </p>
      </div>

      <div className="auth-form">
        <form className="form" onSubmit={handleSubmit}>
          <Brand />
          <h2 style={{ marginTop: 12 }}>Sign In</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18 }}>
            Single unified login for both citizens and municipal officers.
          </p>

          {promptMessage && !error && !successMsg && (
            <div className="auth-alert info-alert" role="status">
              <span>ℹ️</span>
              <span>{promptMessage}</span>
            </div>
          )}

          {error && (
            <div className="auth-alert error-alert" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success-alert" role="alert">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          <label className="field">
            <span>Email Address</span>
            <input
              type="email"
              required
              placeholder="e.g. admin@city.gov or citizen@civicpulse.app"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              autoComplete="email"
            />
          </label>

          {/* Dynamic role detection badge */}
          {detectedRole && (
            <div className={`role-detector-badge ${detectedRole === 'admin' ? 'role-detector-admin' : 'role-detector-citizen'}`}>
              <span className="role-detector-dot"></span>
              {detectedRole === 'admin' ? (
                <span>Detected: <strong>Municipal Officer Account</strong> → will redirect to <strong>Admin Portal</strong></span>
              ) : (
                <span>Detected: <strong>Citizen Account</strong> → will redirect to <strong>Citizen Portal</strong></span>
              )}
            </div>
          )}

          <label className="field" style={{ marginTop: 14 }}>
            <span>Password</span>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoComplete="current-password"
            />
          </label>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 18, height: 46 }}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying credentials...' : 'Sign In'}
          </button>

          <div style={{ marginTop: 18, fontSize: 14, textAlign: 'center', color: 'var(--muted)' }}>
            Need an account?{' '}
            <Link to="/register" state={location.state} style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'underline' }}>
              Create an account
            </Link>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
            <Link to="/" style={{ color: 'var(--muted)' }}>
              ← Return to homepage
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
