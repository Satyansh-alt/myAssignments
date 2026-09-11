import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse } from '../api/courses'
import { parseAssignmentsText, parseAssignmentsPdf, applyAssignments } from '../api/syllabus'

export default function AssignmentImporter() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [tab, setTab] = useState('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [categories, setCategories] = useState([])
  const [parsing, setParsing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    getCourse(id).then((r) => setCourse(r.data))
  }, [id])

  const handleParse = async (e) => {
    e.preventDefault()
    setError('')
    setParsed(null)
    setResult(null)
    setParsing(true)
    try {
      let res
      if (tab === 'text') {
        if (!text.trim()) { setError('Please paste your schedule text'); setParsing(false); return }
        res = await parseAssignmentsText(id, text)
      } else {
        if (!file) { setError('Please select a PDF file'); setParsing(false); return }
        res = await parseAssignmentsPdf(id, file)
      }
      if (res.data.assignments.length === 0) {
        setError('No assignments found. Try pasting more of the schedule, or make sure your course has grade categories set up first.')
        return
      }
      setParsed(res.data.assignments)
      setCategories(res.data.categories)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse schedule')
    } finally {
      setParsing(false)
    }
  }

  const handleApply = async () => {
    setApplying(true)
    setError('')
    try {
      const res = await applyAssignments(id, parsed)
      setResult(res.data)
      setParsed(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to apply assignments')
    } finally {
      setApplying(false)
    }
  }

  const updateField = (i, field, value) => {
    const updated = [...parsed]
    updated[i] = { ...updated[i], [field]: value }
    setParsed(updated)
  }

  const removeRow = (i) => setParsed(parsed.filter((_, idx) => idx !== i))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Import Assignments</h1>
          {course && <span className="page-subtitle">{course.name}</span>}
        </div>
        <Link to={`/courses/${id}`} className="btn-secondary">← Back to Course</Link>
      </div>

      <p className="page-description">
        Paste your course schedule or upload a PDF — the AI will extract every assignment, quiz, exam, and homework deadline automatically.
        Make sure you've set up your grade categories first so assignments can be matched correctly.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="success-banner">
          Added {result.created} assignments!
          {result.skipped?.length > 0 && ` (${result.skipped.length} skipped — category not found: ${result.skipped.join(', ')})`}
          {' '}<Link to={`/courses/${id}`}>View course →</Link>
        </div>
      )}

      {!result && (
        <div className="card">
          <div className="tabs">
            <button className={`tab ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>Paste Text</button>
            <button className={`tab ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>Upload PDF</button>
          </div>

          <form onSubmit={handleParse}>
            {tab === 'text' ? (
              <textarea
                className="syllabus-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your course schedule here — weekly schedule, assignment list, anything with deadlines…"
                rows={14}
              />
            ) : (
              <div className="file-drop">
                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} id="pdf-input" />
                <label htmlFor="pdf-input" className="file-drop-label">
                  {file ? file.name : 'Click to select a PDF file'}
                </label>
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={parsing}>
              {parsing ? 'Extracting with AI…' : 'Extract Assignments'}
            </button>
          </form>
        </div>
      )}

      {parsed && (
        <div className="card">
          <div className="section-header">
            <div>
              <h2>Extracted Assignments</h2>
              <p className="hint">Review and edit before applying. Click × to remove any you don't want.</p>
            </div>
            <span className="parsed-total">{parsed.length} assignments</span>
          </div>

          <div className="import-table-wrapper">
            <table className="parsed-table import-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Due Date</th>
                  <th>Max Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <input value={a.name} onChange={(e) => updateField(i, 'name', e.target.value)} />
                    </td>
                    <td>
                      <select
                        value={a.category_name}
                        onChange={(e) => updateField(i, 'category_name', e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value={a.category_name}>{a.category_name}</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={a.due_date ? a.due_date.slice(0, 16) : ''}
                        onChange={(e) => updateField(i, 'due_date', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={a.max_score}
                        onChange={(e) => updateField(i, 'max_score', Number(e.target.value))}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td>
                      <button className="btn-danger-sm" onClick={() => removeRow(i)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleApply} disabled={applying}>
              {applying ? 'Adding…' : `Add ${parsed.length} Assignments`}
            </button>
            <button className="btn-secondary" onClick={() => setParsed(null)}>Re-parse</button>
          </div>
        </div>
      )}
    </div>
  )
}
