import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand, Badge } from '../components/ui.jsx'
import { useIssues } from '../context/IssueContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import LeafletMap from '../components/LeafletMap.jsx'
import AuthModal from '../components/AuthModal.jsx'
import { api } from '../services/api.js'

export default function Home() {
  const { issues, stats, typeCounts } = useIssues()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const [hotspots, setHotspots] = useState([])
  const [activeHotspot, setActiveHotspot] = useState(null)

  useEffect(() => {
    async function loadHotspots() {
      try {
        const live = await api.getHotspots()
        if (Array.isArray(live) && live.length > 0) {
          setHotspots(live)
          setActiveHotspot(live[0])
        }
      } catch (err) {
        console.warn('Could not load live hotspots on home page:', err.message)
      }
    }
    loadHotspots()
  }, [])
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    targetPath: '/citizen/report',
    title: 'Sign In or Register to Report an Issue',
    subtitle: 'To report a community hazard and track municipal crew resolution, please sign in to your account or create a new citizen account.',
    roleHint: 'citizen',
  })

  function handleReportClick(e) {
    if (e) e.preventDefault()
    if (!isAuthenticated) {
      setAuthModal({
        isOpen: true,
        targetPath: '/citizen/report',
        title: 'Sign In or Register to Report an Issue',
        subtitle: 'To report a community hazard and track municipal crew resolution, please sign in to your account or create a new citizen account.',
        roleHint: 'citizen',
      })
    } else {
      navigate('/citizen/report')
    }
  }

  function handleCommandClick(e) {
    if (e) e.preventDefault()
    if (!isAuthenticated) {
      setAuthModal({
        isOpen: true,
        targetPath: '/admin',
        title: 'Municipal Command Center Access',
        subtitle: 'Access to the administrative hotspot analysis and resource planning engine requires municipal official authentication (@city.gov).',
        roleHint: 'admin',
      })
    } else if (user?.role !== 'admin') {
      setAuthModal({
        isOpen: true,
        targetPath: '/admin',
        title: 'Municipal Officer Account Required',
        subtitle: `You are currently signed in as Citizen (${user.name}). To access Municipal Command, please sign in with an official municipal staff account (@city.gov).`,
        roleHint: 'admin',
      })
    } else {
      navigate('/admin')
    }
  }

  const maxTypeCount = Math.max(...typeCounts.map((t) => t.count), 1)
  const recentReports = issues.slice(0, 6)

  const COVERED_CITIES = [
    { name: 'Vijayawada', count: '520+ issues', areas: 'Benz Circle, Patamata, Governorpet', icon: '🏙️' },
    { name: 'Guntur', count: '340+ issues', areas: 'Brodipet, Arundelpet, Nagarampalem', icon: '🏛️' },
    { name: 'Tenali', count: '160+ issues', areas: 'Gandhi Chowk, Chenchupet', icon: '🌳' },
    { name: 'Mangalagiri', count: '80+ issues', areas: 'NH-16 Bypass, Temple Road', icon: '🛤️' },
  ]

  return (
    <div>
      <header className="site-header">
        <Brand />
        <nav className="nav">
          <a href="#about">About</a>
          <a href="#hotspots">Hotspots</a>
          <a href="#recent">Recent Issues</a>
          <a href="#how">How It Works</a>
          <a href="#stats">Statistics</a>
          <a href="#coverage">Coverage</a>
        </nav>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <div className="home-user-pill">
                <span className="home-user-avatar">{user?.avatar || '👤'}</span>
                <span>{user?.name?.split(' ')[0]} ({user?.role === 'admin' ? 'Admin' : 'Citizen'})</span>
              </div>
              <Link
                className="btn btn-primary"
                to={user?.role === 'admin' ? '/admin' : '/citizen'}
              >
                Go to Portal →
              </Link>
              <button
                className="btn btn-ghost"
                style={{ padding: '8px 14px' }}
                onClick={logout}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">
                Sign In
              </Link>
              <Link className="btn btn-primary" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div>
          <div className="kicker">AI-Driven Community Hotspot Analysis & Municipal Resource Planning</div>
          <h1 className="brand-title" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.8rem)', marginBottom: 12, lineHeight: 1.05 }}>
            CivicPulse
          </h1>
          <h2>Identify where civic problems cluster — and dispatch crews first.</h2>
          <p className="lede">
            CivicPulse turns scattered complaint tickets into intelligent hotspot density maps, priority scores, and department workload plans so roads, drainage, water supply, and garbage issues get resolved faster.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReportClick}
            >
              ➕ Report an Issue
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleCommandClick}
            >
              🏛️ Municipal Command
            </button>
            <a className="btn btn-ghost" href="#hotspots">
              📍 Explore Hotspots
            </a>
          </div>

          {isAuthenticated && (
            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Signed in as <strong>{user?.name}</strong> ({user?.role === 'admin' ? '🏛️ Municipal Staff' : '👤 Citizen Member'})</span>
              <span>·</span>
              <button
                type="button"
                onClick={logout}
                style={{ background: 'none', border: 'none', color: 'var(--forest)', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        <div className="hero-panel">
          <h3>Live Municipal Pulse</h3>
          <div className="stat-grid">
            <div className="stat-chip">
              <b>{stats.total.toLocaleString()}</b>
              Issues analysed
            </div>
            <div className="stat-chip">
              <b>{stats.pending}</b>
              Pending review
            </div>
            <div className="stat-chip">
              <b>{stats.assigned}</b>
              Active works
            </div>
            <div className="stat-chip">
              <b>{stats.resolved}</b>
              Resolved works
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold-soft)', fontWeight: 700 }}>
              Top Priority Hotspot
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#fff' }}>Benz Circle, Vijayawada</strong>
                <div style={{ fontSize: 12, opacity: 0.8 }}>64 concentrated reports · Critical Severity</div>
              </div>
              <span className="badge critical" style={{ fontSize: 11 }}>Critical</span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section" id="about">
        <h3>About CivicPulse</h3>
        <p className="sub">
          Traditional grievance portals collect complaints into static queues. CivicPulse provides spatial clustering and decision intelligence: it weighs report volume, geographical density, severity rating, and unresolved wait time to highlight recurring problem zones.
        </p>
        <div className="cards">
          <article className="card">
            <div className="icon">01</div>
            <h4>Unified Single Sign-On</h4>
            <p>One seamless login recognizes whether you are a resident reporting a pothole or a municipal official orchestrating city maintenance.</p>
          </article>
          <article className="card">
            <div className="icon">02</div>
            <h4>Geospatial Hotspots</h4>
            <p>Coordinates and recurring ticket timestamps reveal high-pressure problem clusters that require immediate structural intervention.</p>
          </article>
          <article className="card">
            <div className="icon">03</div>
            <h4>Data-Backed Resource Planning</h4>
            <p>Department workloads (Roads, Sanitation, Water, Power) are balanced against priority scores to optimize crew and budget deployment.</p>
          </article>
        </div>
      </section>

      {/* Interactive Hotspots Preview Section */}
      <section className="section" id="hotspots" style={{ paddingTop: 0 }}>
        <h3>Interactive Hotspot Explorer</h3>
        <p className="sub">
          Click any cluster to inspect concentrated complaint volume, priority ranking, and suggested crew allocation.
        </p>

        <div className="dash-grid">
          <div className="card" style={{ padding: 12 }}>
            <LeafletMap
              height="380px"
              hotspots={hotspots}
              activeItem={activeHotspot}
              onItemSelect={(h) => setActiveHotspot(h)}
              center={[activeHotspot?.lat || 16.5062, activeHotspot?.lng || 80.648]}
              zoom={11}
            />
            <div style={{ marginTop: 12, padding: '0 6px', fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 16 }}>
              <span>🔴 <strong>Critical</strong></span>
              <span>🟠 <strong>High</strong></span>
              <span>🟡 <strong>Medium</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeHotspot ? (
              <div className="card" style={{ borderLeft: '4px solid var(--forest)' }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>
                  Selected Zone
                </span>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.4rem', marginTop: 4 }}>
                  {activeHotspot.name}
                </h3>
                <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: 14 }}>
                  <strong>{activeHotspot.issues}</strong> verified reports registered ·{' '}
                  <Badge value={activeHotspot.priority} />
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                  High density indicates chronic infrastructure failure. Priority calculation routes prompt assistance to this coordinate cluster before isolated tickets.
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                <span>Loading live geospatial hotspot intelligence...</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {hotspots.slice(0, 4).map((h) => (
                <button
                  key={h.name || h.id}
                  type="button"
                  onClick={() => setActiveHotspot(h)}
                  className="card"
                  style={{
                    padding: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: activeHotspot?.name === h.name ? 'var(--forest)' : undefined,
                    background: activeHotspot?.name === h.name ? 'var(--bg-2)' : '#fff',
                  }}
                >
                  <strong style={{ fontSize: 13, display: 'block' }}>{(h.name || '').split(',')[0]}</strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{h.issues} tickets</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Community Issues Section */}
      <section className="section" id="recent" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Recent Community Reports</h3>
            <p className="sub" style={{ marginBottom: 0 }}>
              Live public log of verified civic grievances submitted by citizens across monitored wards.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReportClick}
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
          >
            ➕ Submit a Report
          </button>
        </div>

        <div className="home-issues-grid">
          {recentReports.map((i) => (
            <div key={i.id} className="home-issue-card">
              <div>
                <div className="home-issue-header">
                  <span className="home-issue-id">{i.id}</span>
                  <Badge value={i.status} />
                </div>
                <h4 style={{ margin: '10px 0 6px', fontSize: '1.05rem' }}>{i.type}</h4>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {i.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                <span>📍 {i.area}, {i.city}</span>
                <span>📅 {i.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how" style={{ paddingTop: 0 }}>
        <h3>How CivicPulse Works</h3>
        <p className="sub">From resident submission to municipal crew dispatch and transparent closure.</p>
        <div className="steps">
          <div className="step">
            <span>1</span>
            <h4>Report & Geotag</h4>
            <p>Residents pin their location, select an issue category, and describe the hazard.</p>
          </div>
          <div className="step">
            <span>2</span>
            <h4>Score & Weigh</h4>
            <p>Algorithms combine complaint frequency, severity index, and waiting time into a unified score.</p>
          </div>
          <div className="step">
            <span>3</span>
            <h4>Map Hotspots</h4>
            <p>Spatial analysis clusters recurring complaints into distinct district and neighborhood zones.</p>
          </div>
          <div className="step">
            <span>4</span>
            <h4>Dispatch & Plan</h4>
            <p>Municipal departments balance crew availability to resolve concentrated problem areas first.</p>
          </div>
        </div>
      </section>

      {/* Community Statistics */}
      <section className="section" id="stats" style={{ paddingTop: 0 }}>
        <h3>Community Issue Statistics</h3>
        <p className="sub">Category breakdown across the municipal data lake (1,100+ analyzed records).</p>
        <div className="card">
          <div className="bars">
            {typeCounts.map((row) => (
              <div className="bar-row" key={row.type}>
                <strong>{row.type}</strong>
                <div className="bar">
                  <i style={{ width: `${(row.count / maxTypeCount) * 100}%` }} />
                </div>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Covered Cities */}
      <section className="section" id="coverage" style={{ paddingTop: 0 }}>
        <h3>Municipal Coverage Area</h3>
        <p className="sub">CivicPulse connects community members and local administration across the capital region.</p>
        <div className="city-grid">
          {COVERED_CITIES.map((c) => (
            <div key={c.name} className="city-card">
              <div className="city-icon">{c.icon}</div>
              <div className="city-name">{c.name}</div>
              <div style={{ color: 'var(--forest)', fontWeight: 700, fontSize: 13, marginTop: 4 }}>{c.count}</div>
              <div className="city-meta">{c.areas}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="cta-banner">
        <div className="cta-content">
          <h3>Empower Your Community Today</h3>
          <p>
            Report broken infrastructure, follow ticket resolution progress in real time, or manage municipal operations with data-backed hotspot analytics.
          </p>
        </div>
        <div className="cta-actions">
          <button
            type="button"
            onClick={handleReportClick}
            className="btn btn-gold"
          >
            Report an Issue
          </button>
          {isAuthenticated ? (
            <Link
              to={user?.role === 'admin' ? '/admin' : '/citizen'}
              className="btn btn-ghost"
              style={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              Go to Portal →
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn btn-ghost"
              style={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              Create Account
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div>
          <strong>CivicPulse</strong>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Community Issue Hotspot Analysis & Resource Planning
          </div>
        </div>
        <div>
          <span>Capstone Project C2C-146 · Data Science & Big Data Analytics</span>
        </div>
      </footer>

      {/* Auth Prompt Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
        targetPath={authModal.targetPath}
        title={authModal.title}
        subtitle={authModal.subtitle}
        roleHint={authModal.roleHint}
      />
    </div>
  )
}
