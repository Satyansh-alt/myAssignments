import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateMe } from '../../api/auth'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/courses', label: 'Courses' },
  { to: '/chat', label: 'AI Assistant' },
]

export default function Navbar() {
  const { user, logout, updateUser } = useAuth()
  const { pathname } = useLocation()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setName(user?.full_name || '')
    setEditing(true)
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === user?.full_name) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const res = await updateMe({ full_name: trimmed })
      updateUser(res.data)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

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
        {editing ? (
          <input
            className="user-name-input"
            value={name}
            autoFocus
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span className="user-name" title="Click to edit your name" onClick={startEditing}>
            {user?.full_name}
          </span>
        )}
        <button className="btn-logout" onClick={logout}>Sign out</button>
      </div>
    </nav>
  )
}
