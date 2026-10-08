import { useState, useEffect } from 'react'
import { getDashboard } from '../api/dashboard'
import { getGradeSummary } from '../api/grades'
import { setAssignmentCompletion } from '../api/assignments'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/shared/LoadingSpinner'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function occurrenceDateOf(iso) {
  return iso.slice(0, 10)
}

function hexToRgba(hex, a) {
  const h = (hex || '#8b5cf6').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function AssignmentItem({ item, onToggle }) {
  return (
    <div className="mb-2 flex items-center gap-3.5 rounded-lg border border-white/5 bg-ink-800 px-4 py-3">
      <input
        type="checkbox"
        className="h-[18px] w-[18px] flex-shrink-0 cursor-pointer accent-violet"
        checked={item.completed}
        onChange={(e) => onToggle(item, e.target.checked)}
      />
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: item.course_color }} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{item.name}</div>
        <div className="text-xs text-zinc-500">{item.course_name}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        {item.is_graded
          ? <span className="rounded-full bg-violet/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-violet-light">{item.earned_score}/{item.max_score}</span>
          : <span className="rounded-full bg-ink-600 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-500">/{item.max_score}</span>
        }
        <div className="text-xs tabular-nums text-zinc-500">{formatDate(item.due_date)}</div>
      </div>
    </div>
  )
}

function GradeCard({ course }) {
  const current = course.current_percent
  const total = course.total_percent
  return (
    <Link
      to={`/courses/${course.course_id}/grades`}
      className="relative block overflow-hidden rounded-xl border border-white/5 p-4 transition hover:border-white/15"
      style={{ backgroundColor: hexToRgba(course.color, 0.1), borderLeft: `3px solid ${course.color}` }}
    >
      <div className="font-display text-base font-semibold">{course.course_name}</div>
      <div className="mb-4 text-xs text-zinc-400">{course.semester}</div>
      {current !== null ? (
        <div className="flex gap-6">
          <div>
            <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-zinc-500">Current</div>
            <div className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{current.toFixed(1)}%</div>
            <div className="text-sm text-zinc-400">{course.current_letter}</div>
          </div>
          <div>
            <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-zinc-500">Total</div>
            <div className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-zinc-400">{total !== null ? total.toFixed(1) + '%' : '—'}</div>
            <div className="text-sm text-zinc-500">{course.total_letter || ''}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500">No grades yet</div>
      )}
    </Link>
  )
}

const RANGE_OPTIONS = [
  { value: 7, label: 'Next 7 Days' },
  { value: 14, label: 'Next 14 Days' },
  { value: 30, label: 'Next 30 Days' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(7)

  const load = (days) => {
    setLoading(true)
    Promise.all([getDashboard(days), getGradeSummary()])
      .then(([d, g]) => {
        setDashboard(d.data)
        setGrades(g.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const toggleCompletion = async (item, completed) => {
    const occurrenceDate = occurrenceDateOf(item.due_date)
    // optimistic update
    setDashboard((prev) => {
      if (!prev) return prev
      const patch = (list) => list.map((i) =>
        i.assignment_id === item.assignment_id && occurrenceDateOf(i.due_date) === occurrenceDate
          ? { ...i, completed }
          : i
      )
      return { today: patch(prev.today), upcoming: patch(prev.upcoming) }
    })
    try {
      await setAssignmentCompletion(item.assignment_id, occurrenceDate, completed)
    } catch {
      load(range)
    }
  }

  if (loading && !dashboard) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Hi, {user?.full_name?.split(' ')[0]} 👋</h1>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-base font-semibold">Due Today</h2>
        {dashboard?.today?.length === 0
          ? <p className="py-2 text-sm text-zinc-500">Nothing due today.</p>
          : dashboard?.today?.map((item) => <AssignmentItem key={`${item.assignment_id}-${item.due_date}`} item={item} onToggle={toggleCompletion} />)
        }
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Upcoming</h2>
          <select
            className="rounded-lg border border-white/10 bg-ink-700 px-2.5 py-1.5 text-sm text-zinc-200 focus:border-violet focus:outline-none"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {dashboard?.upcoming?.length === 0
          ? <p className="py-2 text-sm text-zinc-500">No upcoming assignments.</p>
          : dashboard?.upcoming?.map((item) => <AssignmentItem key={`${item.assignment_id}-${item.due_date}`} item={item} onToggle={toggleCompletion} />)
        }
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Current Grades</h2>
          <Link to="/courses" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white">Manage Courses</Link>
        </div>
        {grades.length === 0
          ? <p className="py-2 text-sm text-zinc-500">No courses yet. <Link to="/courses" className="text-violet-light hover:underline">Add a course</Link></p>
          : <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">{grades.map((c) => <GradeCard key={c.course_id} course={c} />)}</div>
        }
      </section>
    </div>
  )
}
