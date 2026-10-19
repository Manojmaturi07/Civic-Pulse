import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [city, setCity] = useState('Vijayawada')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTarget = location.state?.from
  const promptMessage = location.state?.message

  function submit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (password.length < 4) {
      setError('Password should be at least 4 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setIsSubmitting(true)

    const res = register({
      name,
      email,
      password,
      city,
      role: 'citizen',
      department: 'Resident',
    })

    if (!res.success) {
      setError(res.error || 'Registration failed.')
      setIsSubmitting(false)
      return
    }

    let dest = redirectTarget || '/citizen'
    if (String(dest).startsWith('/admin')) {
      dest = '/citizen'
    }

    setSuccessMsg(`Account created successfully for ${res.user.name}! Redirecting to Citizen portal...`)

    setTimeout(() => {
      navigate(dest, { replace: true })
    }, 700)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Brand to="/" />
        <div>
          <h2>Create Your CivicPulse Account</h2>
          <p style={{ marginTop: 14, opacity: 0.85, lineHeight: 1.6, maxWidth: 440 }}>
            Join the community intelligence network. Residents report and track local infrastructure issues, receive real-time updates, and engage directly with city improvement initiatives.
          </p>
        </div>

        <div className="demo-credentials-card">
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold-soft)', marginBottom: 8 }}>
            Citizen Community Access
          </div>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
            • Report local civic issues (potholes, garbage, water leaks, streetlights) with GPS coordinates.<br />
            • Track status and crew dispatch in real time from your resident dashboard.
          </p>
        </div>

        <p style={{ opacity: 0.6, fontSize: 13 }}>
          CivicPulse Registration Engine · Capstone C2C-146
        </p>
      </div>

      <div className="auth-form">
        <form className="form" onSubmit={submit}>
          <Brand />
          <h2 style={{ marginTop: 12 }}>Create an Account</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
            Sign up as a citizen to report issues and track municipal progress.
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
            <span>Full Name</span>
            <input
              required
              placeholder="e.g. Ananya Kumar or Rajesh Varma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Email Address</span>
            <input
              type="email"
              required
              placeholder="e.g. you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field" style={{ marginTop: 12 }}>
            <span>Account Designation / Role</span>
            <select
              value="citizen"
              disabled
              style={{ background: 'var(--bg-2)', cursor: 'default', color: 'var(--ink)' }}
            >
              <option value="citizen">Citizen Resident (Default)</option>
            </select>
          </label>

          <div className="role-detector-badge role-detector-citizen" style={{ marginTop: -4, marginBottom: 10 }}>
            <span className="role-detector-dot"></span>
            <span>Default Role: <strong>Citizen Resident</strong> (Reporting & Tracking Access)</span>
          </div>

          <label className="field">
            <span>City / Municipality</span>
            <input
              required
              placeholder="Vijayawada, Guntur, Tenali..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Confirm Password</span>
              <input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 18, height: 46 }}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Register as Citizen'}
          </button>

          <div style={{ marginTop: 16, fontSize: 14, textAlign: 'center', color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link to="/login" state={location.state} style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'underline' }}>
              Sign In
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
