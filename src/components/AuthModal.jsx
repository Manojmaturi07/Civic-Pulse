import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthModal({
  isOpen,
  onClose,
  targetPath = '/citizen/report',
  title = 'Sign In or Register Required',
  subtitle = 'To report a civic issue, track crew progress, and receive resolution updates, please sign in or create an account.',
  roleHint = 'citizen',
}) {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleGoToLogin() {
    onClose()
    navigate('/login', {
      state: {
        from: targetPath,
        message: roleHint === 'admin'
          ? 'Please sign in with your municipal credentials (@city.gov) to access Municipal Command.'
          : 'Please sign in with your account to report an issue and track municipal progress.',
      },
    })
  }

  function handleGoToRegister() {
    onClose()
    navigate('/register', {
      state: {
        from: targetPath,
        message: 'Create a new citizen account to report and follow civic infrastructure issues.',
      },
    })
  }

  function handleQuickDemoCitizen() {
    const res = login('citizen@civicpulse.app', 'civicpulse')
    if (res.success) {
      onClose()
      navigate(targetPath)
    }
  }

  function handleQuickDemoAdmin() {
    const res = login('admin@city.gov', 'civicpulse')
    if (res.success) {
      onClose()
      navigate(targetPath.startsWith('/admin') ? targetPath : '/admin')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="modal-icon-badge">
          {roleHint === 'admin' ? '🏛️' : '🔐'}
        </div>

        <h3 className="modal-title">{title}</h3>
        <p className="modal-subtitle">{subtitle}</p>

        <div className="modal-actions-list">
          {/* Option 1: Sign in */}
          <button
            type="button"
            className="modal-action-card modal-action-primary"
            onClick={handleGoToLogin}
          >
            <div className="modal-action-icon">🔑</div>
            <div className="modal-action-text">
              <strong>Sign In to Existing Account</strong>
              <span>Enter your registered email and password</span>
            </div>
            <span className="modal-action-arrow">→</span>
          </button>

          {/* Option 2: Register */}
          <button
            type="button"
            className="modal-action-card modal-action-secondary"
            onClick={handleGoToRegister}
          >
            <div className="modal-action-icon">✨</div>
            <div className="modal-action-text">
              <strong>Create New Account / Register</strong>
              <span>Quick 1-minute registration for community members</span>
            </div>
            <span className="modal-action-arrow">→</span>
          </button>
        </div>

        {/* Demo instant login divider */}
        <div className="modal-demo-section">
          <div className="modal-divider">
            <span>or test immediately with one click</span>
          </div>

          {roleHint === 'admin' ? (
            <button
              type="button"
              className="quick-demo-pill-btn"
              onClick={handleQuickDemoAdmin}
            >
              <span>🏛️ Instant Demo: Continue as <strong>Commissioner Varma (Admin)</strong></span>
              <span className="demo-go">Quick Sign In →</span>
            </button>
          ) : (
            <button
              type="button"
              className="quick-demo-pill-btn"
              onClick={handleQuickDemoCitizen}
            >
              <span>👤 Instant Demo: Continue as <strong>Ananya Kumar (Citizen)</strong></span>
              <span className="demo-go">Quick Sign In →</span>
            </button>
          )}
        </div>

        <div className="modal-footer-note">
          <button type="button" className="modal-cancel-link" onClick={onClose}>
            ← Stay on Home Page
          </button>
        </div>
      </div>
    </div>
  )
}
