import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, getMe } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register(form)
      const token = res.data.access_token
      localStorage.setItem('token', token)
      const me = await getMe()
      loginWithToken(token, me.data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/5 bg-ink-800 p-7 shadow-glow">
        <h1 className="font-display text-2xl font-bold tracking-tight">myAssignments</h1>
        <p className="mb-6 mt-1 text-sm text-zinc-400">Create your account</p>
        {error && (
          <div className="mb-4 rounded-lg border border-grade-f/40 bg-grade-f/10 px-3 py-2 text-sm text-grade-f">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Full Name
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              className="rounded-lg border border-white/10 bg-ink-700 px-3 py-2 text-zinc-100 focus:border-violet focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="rounded-lg border border-white/10 bg-ink-700 px-3 py-2 text-zinc-100 focus:border-violet focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              className="rounded-lg border border-white/10 bg-ink-700 px-3 py-2 text-zinc-100 focus:border-violet focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-violet px-4 py-2.5 font-medium text-white transition hover:bg-violet-light disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-400">
          Already have an account? <Link to="/login" className="text-violet-light hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
