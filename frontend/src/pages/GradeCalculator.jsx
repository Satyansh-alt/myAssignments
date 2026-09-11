import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGradesForCourse } from '../api/grades'
import LoadingSpinner from '../components/shared/LoadingSpinner'

function LetterBadge({ letter }) {
  const colors = { A: '#059669', B: '#0891b2', C: '#d97706', D: '#f59e0b', F: '#dc2626' }
  return <span className="letter-badge" style={{ background: colors[letter] || '#6b7280' }}>{letter}</span>
}

function GradeBar({ percent }) {
  const capped = Math.min(percent ?? 0, 100)
  const color = percent >= 90 ? '#059669' : percent >= 80 ? '#0891b2' : percent >= 70 ? '#d97706' : '#dc2626'
  return (
    <div className="grade-bar-track">
      <div className="grade-bar-fill" style={{ width: `${capped}%`, background: color }} />
    </div>
  )
}

export default function GradeCalculator() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGradesForCourse(id)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{data?.course_name}</h1>
          <span className="page-subtitle">Grade Calculator</span>
        </div>
        <Link to={`/courses/${id}`} className="btn-secondary">← Back to Course</Link>
      </div>

      {/* Overall */}
      <div className="overall-grade-card">
        <div className="overall-left">
          <div className="overall-label">Current Grade</div>
          {data?.overall_percent !== null
            ? <>
                <div className="overall-pct">{data.overall_percent.toFixed(2)}%</div>
                <GradeBar percent={data.overall_percent} />
                <div className="weight-note">{data.weight_graded_so_far}% of total grade graded so far</div>
              </>
            : <div className="overall-none">No graded assignments yet</div>
          }
        </div>
        {data?.letter_grade && (
          <div className="overall-right">
            <LetterBadge letter={data.letter_grade} />
          </div>
        )}
      </div>

      {/* Breakdown */}
      <section className="detail-section">
        <h2>Breakdown by Category</h2>
        <div className="breakdown-list">
          {data?.breakdown?.map((cat) => (
            <div key={cat.category_id} className="breakdown-row">
              <div className="breakdown-header">
                <div>
                  <span className="breakdown-name">{cat.category_name}</span>
                  <span className="breakdown-meta">
                    {cat.weight_percent}% weight
                    {cat.drop_count > 0 && ` · drop ${cat.drop_count} lowest`}
                    {' · '}{cat.graded_assignments}/{cat.total_assignments} graded
                  </span>
                </div>
                {cat.raw_percent !== null && <LetterBadge letter={cat.letter_grade} />}
              </div>
              {cat.raw_percent !== null ? (
                <>
                  <GradeBar percent={cat.raw_percent} />
                  <div className="breakdown-numbers">
                    <span>{cat.raw_percent.toFixed(2)}% raw</span>
                    <span>contributes {cat.contribution.toFixed(2)}% to final</span>
                  </div>
                </>
              ) : (
                <div className="empty-msg">No graded assignments in this category</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
