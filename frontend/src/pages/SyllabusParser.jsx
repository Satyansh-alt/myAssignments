import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse } from '../api/courses'
import { parseSyllabusText, parseSyllabusPdf, applyCategories } from '../api/syllabus'

export default function SyllabusParser() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [tab, setTab] = useState('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getCourse(id).then((r) => setCourse(r.data))
  }, [id])

  const handleParse = async (e) => {
    e.preventDefault()
    setError('')
    setParsed(null)
    setParsing(true)
    try {
      let res
      if (tab === 'text') {
        if (!text.trim()) { setError('Please paste your syllabus text'); return }
        res = await parseSyllabusText(id, text)
      } else {
        if (!file) { setError('Please select a PDF file'); return }
        res = await parseSyllabusPdf(id, file)
      }
      setParsed(res.data.categories)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse syllabus')
    } finally {
      setParsing(false)
    }
  }

  const handleApply = async () => {
    setApplying(true)
    setError('')
    try {
      await applyCategories(id, parsed)
      setSuccess(`Created ${parsed.length} categories! Go to the course to add assignments.`)
      setParsed(null)
      setText('')
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to apply categories')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Import Syllabus</h1>
          {course && <span className="page-subtitle">{course.name}</span>}
        </div>
        <Link to={`/courses/${id}`} className="btn-secondary">← Back to Course</Link>
      </div>

      <p className="page-description">
        Paste your syllabus or upload a PDF — the AI will extract your grade categories, weights, and drop policies automatically.
      </p>

      {success && <div className="success-banner">{success} <Link to={`/courses/${id}`}>View course →</Link></div>}
      {error && <div className="error-banner">{error}</div>}

      {!success && (
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
                placeholder="Paste your syllabus text here…"
                rows={12}
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
              {parsing ? 'Extracting with AI…' : 'Extract Grade Categories'}
            </button>
          </form>
        </div>
      )}

      {parsed && (
        <div className="card">
          <h2>Extracted Categories</h2>
          <p className="hint">Review and adjust before applying. Weights should sum to 100%.</p>
          <div className="parsed-total">
            Total weight: {parsed.reduce((s, c) => s + c.weight_percent, 0).toFixed(1)}%
          </div>
          <table className="parsed-table">
            <thead>
              <tr><th>Category</th><th>Weight %</th><th>Drop Count</th></tr>
            </thead>
            <tbody>
              {parsed.map((cat, i) => (
                <tr key={i}>
                  <td><input value={cat.name} onChange={(e) => { const p = [...parsed]; p[i] = { ...p[i], name: e.target.value }; setParsed(p) }} /></td>
                  <td><input type="number" value={cat.weight_percent} min="0" max="100" onChange={(e) => { const p = [...parsed]; p[i] = { ...p[i], weight_percent: Number(e.target.value) }; setParsed(p) }} /></td>
                  <td><input type="number" value={cat.drop_count ?? 0} min="0" onChange={(e) => { const p = [...parsed]; p[i] = { ...p[i], drop_count: Number(e.target.value) }; setParsed(p) }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleApply} disabled={applying}>
              {applying ? 'Applying…' : 'Apply to Course'}
            </button>
            <button className="btn-secondary" onClick={() => setParsed(null)}>Re-parse</button>
          </div>
        </div>
      )}
    </div>
  )
}
