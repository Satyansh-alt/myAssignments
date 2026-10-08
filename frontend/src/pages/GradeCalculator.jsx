import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGradesForCourse } from '../api/grades'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const LETTER_COLORS = { A: '#34d399', B: '#38bdf8', C: '#fbbf24', D: '#fb923c', F: '#f87171' }

function LetterBadge({ letter }) {
  return (
    <span
      className="inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-sm font-semibold text-ink"
      style={{ background: LETTER_COLORS[letter] || '#6b7280' }}
    >
      {letter}
    </span>
  )
}

function GradeBar({ percent }) {
  const capped = Math.min(percent ?? 0, 100)
  const color = percent >= 90 ? LETTER_COLORS.A : percent >= 80 ? LETTER_COLORS.B : percent >= 70 ? LETTER_COLORS.C : percent >= 60 ? LETTER_COLORS.D : LETTER_COLORS.F
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ink-600">
      <div className="h-full rounded-full" style={{ width: `${capped}%`, background: color }} />
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{data?.course_name}</h1>
          <span className="text-sm text-zinc-400">Grade Calculator</span>
        </div>
        <Link to={`/courses/${id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white">← Back to Course</Link>
      </div>

      {/* Dual grade tiles */}
      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-violet bg-gradient-to-b from-violet/15 to-ink-800 p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Current Grade</div>
          {data?.current_percent !== null ? (
            <>
              <div className="mb-3 mt-2.5 flex items-end gap-2">
                <span className="font-display text-4xl font-semibold tabular-nums">{data.current_percent.toFixed(1)}%</span>
                {data.current_letter && <span className="mb-1 text-lg text-violet-light">{data.current_letter}</span>}
              </div>
              <GradeBar percent={data.current_percent} />
              <div className="mt-3 text-xs text-zinc-400">Based on {data.weight_graded_so_far}% of coursework graded so far</div>
            </>
          ) : (
            <div className="mt-3 text-sm text-zinc-400">No graded assignments yet</div>
          )}
        </div>

        <div className="rounded-xl border border-white/5 bg-ink-800 p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Grade</div>
          {data?.total_percent !== null ? (
            <>
              <div className="mb-3 mt-2.5 flex items-end gap-2">
                <span className="font-display text-4xl font-semibold tabular-nums text-zinc-300">{data.total_percent.toFixed(1)}%</span>
                {data.total_letter && <span className="mb-1 text-lg text-zinc-500">{data.total_letter}</span>}
              </div>
              <GradeBar percent={data.total_percent} />
              <div className="mt-3 text-xs text-zinc-400">If ungraded work counts as zero</div>
            </>
          ) : (
            <div className="mt-3 text-sm text-zinc-400">No assignments yet</div>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Breakdown by Category</h2>
        <div className="flex flex-col">
          {data?.breakdown?.map((cat) => (
            <div key={cat.category_id} className="border-b border-white/5 py-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold">{cat.category_name}</span>
                  <div className="text-xs text-zinc-500">
                    {cat.weight_percent}% weight
                    {cat.drop_count > 0 && ` · drop ${cat.drop_count} lowest`}
                    {' · '}{cat.graded_assignments}/{cat.total_assignments} graded
                  </div>
                </div>
                {cat.raw_percent !== null && <LetterBadge letter={cat.letter_grade} />}
              </div>
              {cat.raw_percent !== null ? (
                <>
                  <GradeBar percent={cat.raw_percent} />
                  <div className="mt-1.5 flex justify-between text-xs text-zinc-500">
                    <span className="tabular-nums">{cat.raw_percent.toFixed(2)}% raw</span>
                    <span className="tabular-nums">contributes {cat.contribution.toFixed(2)}% to final</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-zinc-500">No graded assignments in this category</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
