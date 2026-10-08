import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, createCourse, updateCourse, deleteCourse } from '../api/courses'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777']

const btnPrimary = 'rounded-lg bg-violet px-4 py-2.5 font-medium text-white transition hover:bg-violet-light disabled:opacity-60'
const btnSecondary = 'rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white'
const inputCls = 'rounded-lg border border-white/10 bg-ink-700 px-3 py-2 text-zinc-100 focus:border-violet focus:outline-none'
const labelCls = 'flex flex-col gap-1.5 text-sm text-zinc-300'
const EMPTY = { name: '', semester: '', description: '', color: '#4f46e5' }

function hexToRgba(hex, a) {
  const h = (hex || '#8b5cf6').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function CourseForm({ title, form, setForm, onSubmit, onCancel, saving, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="mb-5 flex flex-col gap-4 rounded-xl border border-white/5 bg-ink-800 p-5 shadow-glow">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Course Name *
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., CS 301" />
        </label>
        <label className={labelCls}>
          Semester
          <input className={inputCls} value={form.semester || ''} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="e.g., Fall 2026" />
        </label>
      </div>
      <label className={labelCls}>
        Description
        <input className={inputCls} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
      </label>
      <label className={labelCls}>
        Color
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`h-7 w-7 rounded-full transition ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-800' : ''}`}
              style={{ background: c }}
              onClick={() => setForm({ ...form, color: c })}
            />
          ))}
        </div>
      </label>
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className={btnSecondary} onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY)

  const load = () => getCourses().then((r) => setCourses(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCourse(form)
      setForm(EMPTY)
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (course) => {
    setEditForm({
      name: course.name,
      semester: course.semester || '',
      description: course.description || '',
      color: course.color || '#4f46e5',
    })
    setEditingId(course.id)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateCourse(editingId, editForm)
      setEditingId(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this course and all its assignments?')) return
    await deleteCourse(id)
    setCourses(courses.filter((c) => c.id !== id))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">My Courses</h1>
        <button className={btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Course'}
        </button>
      </div>

      {showForm && (
        <CourseForm
          title="New Course"
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          saving={saving}
          submitLabel="Create Course"
        />
      )}

      {courses.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
          <p className="mb-4 text-zinc-400">You haven't added any courses yet.</p>
          <button className={btnPrimary} onClick={() => setShowForm(true)}>Add Your First Course</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          editingId === course.id ? (
            <div key={course.id} className="sm:col-span-2 lg:col-span-3">
              <CourseForm
                title={`Edit ${course.name}`}
                form={editForm}
                setForm={setEditForm}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                saving={saving}
                submitLabel="Save Changes"
              />
            </div>
          ) : (
            <div
              key={course.id}
              className="overflow-hidden rounded-xl border border-white/5 p-4"
              style={{ backgroundColor: hexToRgba(course.color, 0.1), borderLeft: `3px solid ${course.color}` }}
            >
              <div className="mb-3">
                <h3 className="font-display text-base font-semibold">{course.name}</h3>
                {course.semester && <span className="text-xs text-zinc-400">{course.semester}</span>}
              </div>
              {course.description && <p className="mb-3 text-sm text-zinc-400">{course.description}</p>}
              <div className="flex flex-wrap gap-2">
                <Link to={`/courses/${course.id}`} className={btnSecondary}>View</Link>
                <Link to={`/courses/${course.id}/grades`} className={btnSecondary}>Grades</Link>
                <Link to={`/courses/${course.id}/syllabus`} className={btnSecondary}>Syllabus</Link>
                <button className={btnSecondary} onClick={() => startEdit(course)}>Edit</button>
                <button className="rounded-lg border border-grade-f/30 px-3 py-1.5 text-sm text-grade-f transition hover:bg-grade-f/10" onClick={() => handleDelete(course.id)}>Delete</button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
