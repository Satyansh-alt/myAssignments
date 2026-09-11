import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/courses', label: 'Courses' },
  { to: '/chat', label: 'AI Assistant' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">myAssignments</Link>
      <div className="navbar-links">
        {NAV_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className={`nav-link ${pathname === l.to ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </div>
      <div className="navbar-user">
        <span className="user-name">{user?.full_name}</span>
        <button className="btn-logout" onClick={logout}>Sign out</button>
      </div>
    </nav>
  )
}
