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
    <div className="page">
      <div className="page-header">
        <h1>Calendar</h1>
      </div>

      <div className="calendar-controls">
        <button className="btn-secondary" onClick={() => goToMonth(-1)}>&larr; Prev</button>
        <h2>{MONTH_NAMES[month - 1]} {year}</h2>
        <button className="btn-secondary" onClick={() => goToMonth(1)}>Next &rarr;</button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {cells.map((d, idx) => {
          if (d === null) return <div key={`empty-${idx}`} className="calendar-cell empty" />
          const items = data?.days?.[dayKey(d)] || []
          const allDone = items.length > 0 && items.every((i) => i.completed)
          return (
            <button
              key={d}
              className={`calendar-cell ${isToday(d) ? 'today' : ''} ${selectedDay === d ? 'selected' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              <span className="calendar-day-num">{d}</span>
              {items.length > 0 && (
                <span className={`calendar-count ${allDone ? 'all-done' : ''}`}>{items.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <section className="dashboard-section calendar-detail">
          <h2>{MONTH_NAMES[month - 1]} {selectedDay}, {year}</h2>
          {selectedItems.length === 0
            ? <p className="empty-msg">Nothing due this day.</p>
            : selectedItems.map((item) => (
              <div key={`${item.assignment_id}-${item.due_date}`} className={`assignment-item ${item.completed ? 'completed' : ''}`}>
                <div className="assignment-item-left">
                  <input
                    type="checkbox"
                    className="assignment-checkbox"
                    checked={item.completed}
                    onChange={(e) => toggleCompletion(item, e.target.checked)}
                  />
                  <span className="course-dot" style={{ background: item.course_color }} />
                  <div>
                    <div className="assignment-name">{item.name}</div>
                    <div className="assignment-course">{item.course_name}</div>
                  </div>
                </div>
                <div className="assignment-item-right">
                  {item.is_graded
                    ? <span className="score-badge">{item.earned_score}/{item.max_score}</span>
                    : <span className="score-badge pending">/{item.max_score}</span>
                  }
                  <div className="due-time">{formatTime(item.due_date)}</div>
                </div>
              </div>
            ))
          }
        </section>
      )}
    </div>
  )
}
