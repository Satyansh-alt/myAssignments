import { useState, useEffect } from 'react'
import { getDashboard } from '../api/dashboard'
import { getGradeSummary } from '../api/grades'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/shared/LoadingSpinner'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function AssignmentItem({ item }) {
  return (
    <div className={`assignment-item ${item.is_graded ? 'graded' : ''}`}>
      <div className="assignment-item-left">
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
        <div className="due-time">{formatDate(item.due_date)}</div>
      </div>
    </div>
  )
}

function GradeCard({ course }) {
  const pct = course.overall_percent
  return (
    <Link to={`/courses/${course.course_id}/grades`} className="grade-card" style={{ borderLeftColor: course.color }}>
      <div className="grade-card-name">{course.course_name}</div>
      <div className="grade-card-semester">{course.semester}</div>
      <div className="grade-card-grade">
        {pct !== null ? (
          <>
            <span className="grade-pct">{pct.toFixed(1)}%</span>
            <span className="grade-letter">{course.letter_grade}</span>
          </>
        ) : (
          <span className="grade-none">No grades yet</span>
        )}
      </div>
      {course.weight_graded_so_far < 100 && (
        <div className="grade-weight-note">{course.weight_graded_so_far}% of grade graded</div>
      )}
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboard(), getGradeSummary()])
      .then(([d, g]) => {
        setDashboard(d.data)
        setGrades(g.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="page">
      <div className="page-header">
        <h1>Hi, {user?.full_name?.split(' ')[0]} 👋</h1>
      </div>

      <section className="dashboard-section">
        <h2>Due Today</h2>
        {dashboard?.today?.length === 0
          ? <p className="empty-msg">Nothing due today.</p>
          : dashboard?.today?.map((item) => <AssignmentItem key={`${item.assignment_id}-${item.due_date}`} item={item} />)
        }
      </section>

      <section className="dashboard-section">
        <h2>Upcoming — Next 7 Days</h2>
        {dashboard?.upcoming?.length === 0
          ? <p className="empty-msg">No upcoming assignments.</p>
          : dashboard?.upcoming?.map((item) => <AssignmentItem key={`${item.assignment_id}-${item.due_date}`} item={item} />)
        }
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Current Grades</h2>
          <Link to="/courses" className="btn-secondary">Manage Courses</Link>
        </div>
        {grades.length === 0
          ? <p className="empty-msg">No courses yet. <Link to="/courses">Add a course</Link></p>
          : <div className="grade-cards">{grades.map((c) => <GradeCard key={c.course_id} course={c} />)}</div>
        }
      </section>
    </div>
  )
}
