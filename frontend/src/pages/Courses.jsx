import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, createCourse, deleteCourse } from '../api/courses'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777']

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', semester: '', description: '', color: '#4f46e5' })
  const [saving, setSaving] = useState(false)

  const load = () => getCourses().then((r) => setCourses(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCourse(form)
      setForm({ name: '', semester: '', description: '', color: '#4f46e5' })
      setShowForm(false)
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
    <div className="page">
      <div className="page-header">
        <h1>My Courses</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Course'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card form-card">
          <h2>New Course</h2>
          <div className="form-row">
            <label>Course Name *
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., CS 301" />
            </label>
            <label>Semester
              <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="e.g., Fall 2025" />
            </label>
          </div>
          <label>Description
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>
          <label>Color
            <div className="color-picker">
              {COLORS.map((c) => (
                <button key={c} type="button" className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
              ))}
            </div>
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Course'}</button>
        </form>
      )}

      {courses.length === 0 && !showForm && (
        <div className="empty-state">
          <p>You haven't added any courses yet.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>Add Your First Course</button>
        </div>
      )}

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card" style={{ borderTopColor: course.color }}>
            <div className="course-card-header">
              <div>
                <h3>{course.name}</h3>
                {course.semester && <span className="course-semester">{course.semester}</span>}
              </div>
            </div>
            {course.description && <p className="course-desc">{course.description}</p>}
            <div className="course-card-actions">
              <Link to={`/courses/${course.id}`} className="btn-secondary">View</Link>
              <Link to={`/courses/${course.id}/grades`} className="btn-secondary">Grades</Link>
              <Link to={`/courses/${course.id}/syllabus`} className="btn-secondary">Syllabus</Link>
              <button className="btn-danger-sm" onClick={() => handleDelete(course.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
