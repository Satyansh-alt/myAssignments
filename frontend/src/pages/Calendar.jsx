import { useState, useEffect } from 'react'
import { getMonthView } from '../api/calendar'
import { setAssignmentCompletion } from '../api/assignments'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function hexToRgba(hex, a) {
  const h = (hex || '#8b5cf6').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  const load = () => {
    setLoading(true)
    getMonthView(year, month)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const goToMonth = (delta) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear += 1 }
    if (newMonth < 1) { newMonth = 12; newYear -= 1 }
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDay(null)
  }

  const toggleCompletion = async (item, completed) => {
    const occurrenceDate = item.due_date.slice(0, 10)
    setData((prev) => {
      if (!prev) return prev
      const newDays = { ...prev.days }
      newDays[occurrenceDate] = newDays[occurrenceDate].map((i) =>
        i.assignment_id === item.assignment_id ? { ...i, completed } : i
      )
      return { ...prev, days: newDays }
    })
    try {
      await setAssignmentCompletion(item.assignment_id, occurrenceDate, completed)
    } catch {
      load()
    }
  }

  if (loading && !data) return <LoadingSpinner />

  const totalDays = daysInMonth(year, month)
  const startWeekday = firstWeekday(year, month)
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()

  const dayKey = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const selectedItems = selectedDay ? (data?.days?.[dayKey(selectedDay)] || []) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Calendar</h1>
      </div>

      <div className="mb-5 flex items-center justify-center gap-5">
        <button className="h-9 w-9 rounded-lg border border-white/10 bg-ink-700 text-zinc-400 transition hover:border-violet/50 hover:text-white" onClick={() => goToMonth(-1)}>←</button>
        <h2 className="min-w-[190px] text-center font-display text-lg font-semibold">{MONTH_NAMES[month - 1]} {year}</h2>
        <button className="h-9 w-9 rounded-lg border border-white/10 bg-ink-700 text-zinc-400 transition hover:border-violet/50 hover:text-white" onClick={() => goToMonth(1)}>→</button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="pb-1.5 text-center text-[0.68rem] font-semibold uppercase tracking-wide text-zinc-600">{d}</div>
        ))}
        {cells.map((d, idx) => {
          if (d === null) return <div key={`empty-${idx}`} />
          const items = data?.days?.[dayKey(d)] || []
          const shown = items.slice(0, 3)
          const extra = items.length - shown.length
          return (
            <button
              key={d}
              className={`flex min-h-[78px] flex-col gap-1 rounded-lg border p-1.5 text-left transition ${
                isToday(d) ? 'border-violet shadow-[inset_0_0_0_1px_#8b5cf6]' : 'border-white/5'
              } ${selectedDay === d ? 'bg-violet/15' : 'bg-ink-800 hover:border-white/15'}`}
              onClick={() => setSelectedDay(d)}
            >
              <span className={`text-xs font-semibold ${isToday(d) ? 'text-violet-light' : 'text-zinc-400'}`}>{d}</span>
              {shown.map((item) => (
                <span
                  key={`${item.assignment_id}-${item.due_date}`}
                  className={`truncate rounded px-1.5 py-0.5 text-[0.64rem] font-medium ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                  style={{ background: hexToRgba(item.course_color, 0.18), borderLeft: `3px solid ${item.course_color}` }}
                >
                  {item.name}
                </span>
              ))}
              {extra > 0 && <span className="pl-1 text-[0.62rem] text-zinc-500">+{extra} more</span>}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-base font-semibold">{MONTH_NAMES[month - 1]} {selectedDay}, {year}</h2>
          {selectedItems.length === 0
            ? <p className="py-2 text-sm text-zinc-500">Nothing due this day.</p>
            : selectedItems.map((item) => (
              <div key={`${item.assignment_id}-${item.due_date}`} className="mb-2 flex items-center gap-3.5 rounded-lg border border-white/5 bg-ink-800 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-[18px] w-[18px] flex-shrink-0 cursor-pointer accent-violet"
                  checked={item.completed}
                  onChange={(e) => toggleCompletion(item, e.target.checked)}
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
                  <div className="text-xs tabular-nums text-zinc-500">{formatTime(item.due_date)}</div>
                </div>
              </div>
            ))
          }
        </section>
      )}
    </div>
  )
}
