import { NavLink } from 'react-router-dom'

export function Brand({ to = '/' }) {
  return (
    <NavLink to={to} className="brand">
      <span className="brand-mark">CP</span>
      <span className="brand-title">CivicPulse</span>
    </NavLink>
  )
}

export function Badge({ value }) {
  const key = String(value).toLowerCase().replace(/\s+/g, '-')
  return <span className={`badge ${key}`}>{value}</span>
}
