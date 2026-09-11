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
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{course?.name}</h1>
          {course?.semester && <span className="course-semester">{course.semester}</span>}
        </div>
        <div className="header-actions">
          <Link to={`/courses/${id}/grades`} className="btn-secondary">View Grades</Link>
          <Link to={`/courses/${id}/syllabus`} className="btn-secondary">Import Syllabus</Link>
          <Link to={`/courses/${id}/import-assignments`} className="btn-secondary">Import Assignments</Link>
        </div>
      </div>

      {/* Categories */}
      <section className="detail-section">
        <div className="section-header">
          <h2>Grade Categories <span className="weight-total">({totalWeight.toFixed(0)}% total)</span></h2>
          <button className="btn-secondary" onClick={() => setShowCatForm(!showCatForm)}>
            {showCatForm ? 'Cancel' : '+ Add Category'}
          </button>
        </div>

        {showCatForm && (
          <form onSubmit={handleCreateCategory} className="inline-form">
            <input placeholder="Name (e.g. Homework)" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
            <input type="number" placeholder="Weight %" min="0" max="100" value={catForm.weight_percent} onChange={(e) => setCatForm({ ...catForm, weight_percent: e.target.value })} required />
            <input type="number" placeholder="Drop count" min="0" value={catForm.drop_count} onChange={(e) => setCatForm({ ...catForm, drop_count: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}

        <div className="categories-list">
          {categories.map((cat) => (
            <div key={cat.id} className="category-row">
              <div className="category-info">
                <span className="category-name">{cat.name}</span>
                <span className="category-meta">{cat.weight_percent}% weight{cat.drop_count > 0 ? ` · drops ${cat.drop_count} lowest` : ''}</span>
              </div>
              <button className="btn-danger-sm" onClick={async () => { if (confirm('Delete category and all its assignments?')) { await deleteCategory(cat.id); load() } }}>×</button>
            </div>
          ))}
          {categories.length === 0 && <p className="empty-msg">No categories yet. Import a syllabus or add manually.</p>}
        </div>
      </section>

      {/* Assignments */}
      <section className="detail-section">
        <div className="section-header">
          <h2>Assignments</h2>
          <button className="btn-secondary" onClick={() => setShowAssignForm(!showAssignForm)} disabled={categories.length === 0}>
            {showAssignForm ? 'Cancel' : '+ Add Assignment'}
          </button>
        </div>

        {showAssignForm && (
          <form onSubmit={handleCreateAssignment} className="card form-card">
            <div className="form-row">
              <label>Category *
                <select value={assignForm.category_id} onChange={(e) => setAssignForm({ ...assignForm, category_id: e.target.value })} required>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>Name *
                <input value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} required placeholder="e.g., HW 1" />
              </label>
            </div>
            <div className="form-row">
              <label>Max Score *
                <input type="number" value={assignForm.max_score} onChange={(e) => setAssignForm({ ...assignForm, max_score: e.target.value })} required min="0" />
              </label>
              <label>Earned Score (leave blank if not graded)
                <input type="number" value={assignForm.earned_score} onChange={(e) => setAssignForm({ ...assignForm, earned_score: e.target.value })} min="0" />
              </label>
            </div>
            <div className="form-row">
              <label>Due Date
                <input type="datetime-local" value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} />
              </label>
              <label>Recurrence
                <select value={assignForm.recurrence_pattern} onChange={(e) => setAssignForm({ ...assignForm, recurrence_pattern: e.target.value, is_recurring: e.target.value !== '' })}>
                  {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
            <label>Notes
              <input value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="Optional" />
            </label>
            <button type="submit" className="btn-primary">Add Assignment</button>
          </form>
        )}

        {categories.map((cat) => {
          const catAssignments = assignmentsByCategory(cat.id)
          if (catAssignments.length === 0) return null
          return (
            <div key={cat.id} className="category-assignments">
              <h3 className="cat-label">{cat.name}</h3>
              <div className="assignments-table">
                <div className="assignments-table-header">
                  <span>Name</span><span>Score</span><span>Due</span><span></span>
                </div>
                {catAssignments.map((a) => (
                  editingId === a.id ? (
                    <div key={a.id} className="assignment-edit-row">
                      <div className="edit-row-grid">
                        <label>Name
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </label>
                        <label>Earned Score
                          <input type="number" value={editForm.earned_score} onChange={(e) => setEditForm({ ...editForm, earned_score: e.target.value })} placeholder="blank = ungraded" min="0" />
                        </label>
                        <label>Max Score
                          <input type="number" value={editForm.max_score} onChange={(e) => setEditForm({ ...editForm, max_score: e.target.value })} min="0" />
                        </label>
                        <label>Due Date
                          <input type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                        </label>
                        <label>Recurrence
                          <select value={editForm.recurrence_pattern} onChange={(e) => setEditForm({ ...editForm, recurrence_pattern: e.target.value })}>
                            {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </label>
                        <label>Notes
                          <input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional" />
                        </label>
                      </div>
                      <div className="edit-row-actions">
                        <button className="btn-primary" onClick={() => handleSaveEdit(a)}>Save</button>
                        <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={a.id} className="assignment-row">
                      <span className="asgn-name">{a.name}{a.is_recurring && <span className="recurring-badge">↺</span>}</span>
                      <span className="asgn-score">
                        <button className="score-btn" onClick={() => startEdit(a)}>
                          {a.earned_score !== null ? `${a.earned_score}/${a.max_score}` : `—/${a.max_score}`}
                        </button>
                      </span>
                      <span className="asgn-due">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</span>
                      <span className="asgn-actions">
                        <button className="btn-xs edit-btn" onClick={() => startEdit(a)}>Edit</button>
                        <button className="btn-danger-sm" onClick={() => handleDeleteAssignment(a.id)}>×</button>
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )
        })}
        {assignments.length === 0 && <p className="empty-msg">No assignments yet.</p>}
      </section>
    </div>
  )
}
