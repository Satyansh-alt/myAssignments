import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse } from '../api/courses'
import { getCategories, createCategory, deleteCategory } from '../api/categories'
import { getAssignmentsByCourse, createAssignment, updateAssignment, deleteAssignment } from '../api/assignments'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Not recurring' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

const btnPrimary = 'rounded-lg bg-violet px-4 py-2 font-medium text-white transition hover:bg-violet-light disabled:opacity-60'
const btnSecondary = 'rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white disabled:opacity-40'
const inputCls = 'rounded-lg border border-white/10 bg-ink-700 px-3 py-2 text-zinc-100 focus:border-violet focus:outline-none'
const labelCls = 'flex flex-col gap-1.5 text-sm text-zinc-300'
const card = 'mb-4 flex flex-col gap-4 rounded-xl border border-white/5 bg-ink-800 p-5 shadow-glow'

export default function CourseDetail() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [categories, setCategories] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatForm, setShowCatForm] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', weight_percent: '', drop_count: 0 })
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignForm, setAssignForm] = useState({ category_id: '', name: '', max_score: '', earned_score: '', due_date: '', is_recurring: false, recurrence_pattern: '', notes: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = useCallback(() => {
    Promise.all([getCourse(id), getCategories(id), getAssignmentsByCourse(id)])
      .then(([c, cats, asgn]) => {
        setCourse(c.data)
        setCategories(cats.data)
        setAssignments(asgn.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    await createCategory(id, { ...catForm, weight_percent: Number(catForm.weight_percent), drop_count: Number(catForm.drop_count) })
    setCatForm({ name: '', weight_percent: '', drop_count: 0 })
    setShowCatForm(false)
    load()
  }

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    const data = {
      category_id: Number(assignForm.category_id),
      name: assignForm.name,
      max_score: Number(assignForm.max_score),
      earned_score: assignForm.earned_score !== '' ? Number(assignForm.earned_score) : null,
      due_date: assignForm.due_date || null,
      is_recurring: assignForm.is_recurring,
      recurrence_pattern: assignForm.recurrence_pattern || null,
      notes: assignForm.notes || null,
    }
    await createAssignment(data)
    setAssignForm({ category_id: '', name: '', max_score: '', earned_score: '', due_date: '', is_recurring: false, recurrence_pattern: '', notes: '' })
    setShowAssignForm(false)
    load()
  }

  const startEdit = (a) => {
    setEditingId(a.id)
    setEditForm({
      name: a.name,
      max_score: a.max_score,
      earned_score: a.earned_score ?? '',
      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '',
      recurrence_pattern: a.recurrence_pattern ?? '',
      notes: a.notes ?? '',
    })
  }

  const handleSaveEdit = async (a) => {
    await updateAssignment(a.id, {
      name: editForm.name,
      max_score: Number(editForm.max_score),
      earned_score: editForm.earned_score === '' ? null : Number(editForm.earned_score),
      due_date: editForm.due_date || null,
      recurrence_pattern: editForm.recurrence_pattern || null,
      is_recurring: editForm.recurrence_pattern !== '',
      notes: editForm.notes || null,
    })
    setEditingId(null)
    load()
  }

  const handleDeleteAssignment = async (aId) => {
    if (!confirm('Delete this assignment?')) return
    await deleteAssignment(aId)
    load()
  }

  if (loading) return <LoadingSpinner />

  const assignmentsByCategory = (catId) => assignments.filter((a) => a.category_id === catId)
  const totalWeight = categories.reduce((s, c) => s + c.weight_percent, 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{course?.name}</h1>
          {course?.semester && <span className="text-sm text-zinc-400">{course.semester}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/courses/${id}/grades`} className={btnSecondary}>View Grades</Link>
          <Link to={`/courses/${id}/syllabus`} className={btnSecondary}>Import Syllabus</Link>
          <Link to={`/courses/${id}/import-assignments`} className={btnSecondary}>Import Assignments</Link>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Grade Categories <span className="text-sm font-normal text-zinc-500">({totalWeight.toFixed(0)}% total)</span></h2>
          <button className={btnSecondary} onClick={() => setShowCatForm(!showCatForm)}>
            {showCatForm ? 'Cancel' : '+ Add Category'}
          </button>
        </div>

        {showCatForm && (
          <form onSubmit={handleCreateCategory} className="mb-4 flex flex-wrap gap-2">
            <input className={`${inputCls} flex-1`} placeholder="Name (e.g. Homework)" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
            <input className={`${inputCls} w-28`} type="number" placeholder="Weight %" min="0" max="100" value={catForm.weight_percent} onChange={(e) => setCatForm({ ...catForm, weight_percent: e.target.value })} required />
            <input className={`${inputCls} w-28`} type="number" placeholder="Drop count" min="0" value={catForm.drop_count} onChange={(e) => setCatForm({ ...catForm, drop_count: e.target.value })} />
            <button type="submit" className={btnPrimary}>Add</button>
          </form>
        )}

        <div className="flex flex-col">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between border-b border-white/5 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{cat.name}</span>
                <span className="text-xs text-zinc-500">{cat.weight_percent}% weight{cat.drop_count > 0 ? ` · drops ${cat.drop_count} lowest` : ''}</span>
              </div>
              <button className="rounded px-2 py-1 text-grade-f transition hover:bg-grade-f/10" onClick={async () => { if (confirm('Delete category and all its assignments?')) { await deleteCategory(cat.id); load() } }}>×</button>
            </div>
          ))}
          {categories.length === 0 && <p className="py-2 text-sm text-zinc-500">No categories yet. Import a syllabus or add manually.</p>}
        </div>
      </section>

      {/* Assignments */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Assignments</h2>
          <button className={btnSecondary} onClick={() => setShowAssignForm(!showAssignForm)} disabled={categories.length === 0}>
            {showAssignForm ? 'Cancel' : '+ Add Assignment'}
          </button>
        </div>

        {showAssignForm && (
          <form onSubmit={handleCreateAssignment} className={card}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Category *
                <select className={inputCls} value={assignForm.category_id} onChange={(e) => setAssignForm({ ...assignForm, category_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>Name *
                <input className={inputCls} value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} required placeholder="e.g., HW 1" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Max Score *
                <input className={inputCls} type="number" value={assignForm.max_score} onChange={(e) => setAssignForm({ ...assignForm, max_score: e.target.value })} required min="0" />
              </label>
              <label className={labelCls}>Earned Score (leave blank if not graded)
                <input className={inputCls} type="number" value={assignForm.earned_score} onChange={(e) => setAssignForm({ ...assignForm, earned_score: e.target.value })} min="0" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Due Date
                <input className={inputCls} type="datetime-local" value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} />
              </label>
              <label className={labelCls}>Recurrence
                <select className={inputCls} value={assignForm.recurrence_pattern} onChange={(e) => setAssignForm({ ...assignForm, recurrence_pattern: e.target.value, is_recurring: e.target.value !== '' })}>
                  {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
            <label className={labelCls}>Notes
              <input className={inputCls} value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="Optional" />
            </label>
            <button type="submit" className={`${btnPrimary} self-start`}>Add Assignment</button>
          </form>
        )}

        {categories.map((cat) => {
          const catAssignments = assignmentsByCategory(cat.id)
          if (catAssignments.length === 0) return null
          return (
            <div key={cat.id} className="mb-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{cat.name}</h3>
              <div className="overflow-hidden rounded-xl border border-white/5">
                <div className="grid grid-cols-[1fr_100px_90px_90px] gap-2 border-b border-white/5 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <span>Name</span><span>Score</span><span>Due</span><span></span>
                </div>
                {catAssignments.map((a) => (
                  editingId === a.id ? (
                    <div key={a.id} className="border-b border-white/5 bg-ink-800 p-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={labelCls}>Name
                          <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </label>
                        <label className={labelCls}>Earned Score
                          <input className={inputCls} type="number" value={editForm.earned_score} onChange={(e) => setEditForm({ ...editForm, earned_score: e.target.value })} placeholder="blank = ungraded" min="0" />
                        </label>
                        <label className={labelCls}>Max Score
                          <input className={inputCls} type="number" value={editForm.max_score} onChange={(e) => setEditForm({ ...editForm, max_score: e.target.value })} min="0" />
                        </label>
                        <label className={labelCls}>Due Date
                          <input className={inputCls} type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                        </label>
                        <label className={labelCls}>Recurrence
                          <select className={inputCls} value={editForm.recurrence_pattern} onChange={(e) => setEditForm({ ...editForm, recurrence_pattern: e.target.value })}>
                            {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </label>
                        <label className={labelCls}>Notes
                          <input className={inputCls} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional" />
                        </label>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button className={btnPrimary} onClick={() => handleSaveEdit(a)}>Save</button>
                        <button className={btnSecondary} onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={a.id} className="grid grid-cols-[1fr_100px_90px_90px] items-center gap-2 border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
                      <span className="flex items-center gap-1.5 truncate">{a.name}{a.is_recurring && <span className="text-xs text-violet-light" title="Recurring">↺</span>}</span>
                      <span>
                        <button className="rounded bg-ink-700 px-2 py-1 text-xs tabular-nums text-zinc-200 transition hover:bg-ink-600" onClick={() => startEdit(a)}>
                          {a.earned_score !== null ? `${a.earned_score}/${a.max_score}` : `—/${a.max_score}`}
                        </button>
                      </span>
                      <span className="text-xs tabular-nums text-zinc-500">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</span>
                      <span className="flex items-center justify-end gap-1">
                        <button className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-violet/50 hover:text-white" onClick={() => startEdit(a)}>Edit</button>
                        <button className="rounded px-2 py-1 text-grade-f transition hover:bg-grade-f/10" onClick={() => handleDeleteAssignment(a.id)}>×</button>
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )
        })}
        {assignments.length === 0 && <p className="py-2 text-sm text-zinc-500">No assignments yet.</p>}
      </section>
    </div>
  )
}
