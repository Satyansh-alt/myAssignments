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
    <nav className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-7 border-b border-white/5 bg-ink-800/90 px-5 backdrop-blur">
      <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-zinc-100">
        <span className="h-5 w-5 rounded-md bg-gradient-to-br from-violet to-violet-light shadow-[0_0_18px_rgba(139,92,246,0.4)]" />
        myAssignments
      </Link>
      <div className="ml-2 hidden gap-1 sm:flex">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              pathname === l.to ? 'bg-violet/15 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        {editing ? (
          <input
            className="rounded-lg border border-white/10 bg-ink-700 px-2.5 py-1 text-sm focus:border-violet focus:outline-none"
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
          <span
            className="cursor-pointer border-b border-dashed border-transparent text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            title="Click to edit your name"
            onClick={startEditing}
          >
            {user?.full_name}
          </span>
        )}
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white"
          onClick={logout}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
