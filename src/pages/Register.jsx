import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [city, setCity] = useState('Vijayawada')
  const [accountType, setAccountType] = useState('auto') // 'auto', 'citizen', 'admin'
  const [department, setDepartment] = useState('Roads & Transport')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  // Real-time role detection
  const cleanEmail = email.trim().toLowerCase()
  const isGovEmail =
    cleanEmail.endsWith('@city.gov') ||
    cleanEmail.endsWith('@gov.in') ||
    cleanEmail.endsWith('@municipal.gov') ||
    cleanEmail.startsWith('admin@') ||
    cleanEmail.startsWith('municipal@') ||
    cleanEmail.startsWith('officer@')

  const effectiveRole =
    accountType === 'auto'
      ? isGovEmail
        ? 'admin'
        : 'citizen'
      : accountType

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
      role: effectiveRole,
      department: effectiveRole === 'admin' ? department : 'Resident',
    })

    if (!res.success) {
      setError(res.error || 'Registration failed.')
      setIsSubmitting(false)
      return
    }

    const targetPortal = effectiveRole === 'admin' ? 'Municipal Admin' : 'Citizen'
    setSuccessMsg(`Account created successfully for ${res.user.name}! Redirecting to ${targetPortal} portal...`)

    setTimeout(() => {
      if (effectiveRole === 'admin') {
        navigate('/admin')
      } else {
        navigate('/citizen')
      }
    }, 700)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Brand to="/" />
        <div>
          <h2>Create Your CivicPulse Account</h2>
          <p style={{ marginTop: 14, opacity: 0.85, lineHeight: 1.6, maxWidth: 440 }}>
            Join the community intelligence network. Residents report and track local infrastructure issues, while municipal staff manage dispatch, hotspot analysis, and resource planning.
          </p>
        </div>

        <div className="demo-credentials-card">
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold-soft)', marginBottom: 8 }}>
            Smart Account Recognition
          </div>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
            • Enter an official email (e.g. <code>@city.gov</code> or <code>@gov.in</code>) to automatically register as <strong>Municipal Staff</strong>.<br />
            • Enter any resident email to register as a <strong>Citizen Member</strong>.
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
            Unified registration for citizens and municipal staff.
          </p>

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
              placeholder="e.g. you@email.com or officer@city.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {/* Dynamic role detection badge */}
          {cleanEmail && (
            <div className={`role-detector-badge ${effectiveRole === 'admin' ? 'role-detector-admin' : 'role-detector-citizen'}`}>
              <span className="role-detector-dot"></span>
              {effectiveRole === 'admin' ? (
                <span>Account Type: <strong>Municipal Staff</strong> (Admin Portal Access)</span>
              ) : (
                <span>Account Type: <strong>Citizen Resident</strong> (Reporting Portal Access)</span>
              )}
            </div>
          )}

          <label className="field" style={{ marginTop: 12 }}>
            <span>Account Designation / Role</span>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value="auto">Auto-detect from email domain (Recommended)</option>
              <option value="citizen">Citizen Resident</option>
              <option value="admin">Municipal Staff / Officer</option>
            </select>
          </label>

          {effectiveRole === 'admin' && (
            <label className="field">
              <span>Municipal Department</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option>Roads & Transport</option>
                <option>Sanitation</option>
                <option>Water Supply</option>
                <option>Electrical</option>
                <option>Public Works</option>
                <option>Municipal Administration</option>
              </select>
            </label>
          )}

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
            {isSubmitting
              ? 'Creating Account...'
              : `Register as ${effectiveRole === 'admin' ? 'Municipal Staff' : 'Citizen'}`}
          </button>

          <div style={{ marginTop: 16, fontSize: 14, textAlign: 'center', color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'underline' }}>
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
