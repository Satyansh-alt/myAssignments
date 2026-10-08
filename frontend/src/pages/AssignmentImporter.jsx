import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse } from '../api/courses'
import { parseAssignmentsText, parseAssignmentsPdf, applyAssignments } from '../api/syllabus'

const btnPrimary = 'rounded-lg bg-violet px-4 py-2.5 font-medium text-white transition hover:bg-violet-light disabled:opacity-60'
const btnSecondary = 'rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white'
const card = 'mb-5 rounded-xl border border-white/5 bg-ink-800 p-5 shadow-glow'
const cellInput = 'w-full rounded-md border border-white/10 bg-ink-700 px-2 py-1.5 text-zinc-100 focus:border-violet focus:outline-none'

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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Import Assignments</h1>
          {course && <span className="text-sm text-zinc-400">{course.name}</span>}
        </div>
        <Link to={`/courses/${id}`} className={btnSecondary}>← Back to Course</Link>
      </div>

      <p className="mb-6 text-sm text-zinc-400">
        Paste your course schedule or upload a PDF — the AI will extract every assignment, quiz, exam, and homework deadline automatically.
        Make sure you've set up your grade categories first so assignments can be matched correctly.
      </p>

      {error && <div className="mb-5 rounded-lg border border-grade-f/40 bg-grade-f/10 px-3 py-2 text-sm text-grade-f">{error}</div>}

      {result && (
        <div className="mb-5 rounded-lg border border-grade-a/40 bg-grade-a/10 px-3 py-2 text-sm text-grade-a">
          Added {result.created} assignments!
          {result.skipped?.length > 0 && ` (${result.skipped.length} skipped — category not found: ${result.skipped.join(', ')})`}
          {' '}<Link to={`/courses/${id}`} className="underline">View course →</Link>
        </div>
      )}

      {!result && (
        <div className={card}>
          <div className="mb-4 flex gap-2 border-b border-white/5 pb-3">
            <button className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'text' ? 'bg-violet/15 text-white' : 'text-zinc-400 hover:text-zinc-200'}`} onClick={() => setTab('text')}>Paste Text</button>
            <button className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'pdf' ? 'bg-violet/15 text-white' : 'text-zinc-400 hover:text-zinc-200'}`} onClick={() => setTab('pdf')}>Upload PDF</button>
          </div>

          <form onSubmit={handleParse} className="flex flex-col gap-4">
            {tab === 'text' ? (
              <textarea
                className="w-full rounded-lg border border-white/10 bg-ink-700 px-3 py-2.5 text-sm text-zinc-100 focus:border-violet focus:outline-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your course schedule here — weekly schedule, assignment list, anything with deadlines…"
                rows={14}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 p-8 text-center">
                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} id="pdf-input" className="hidden" />
                <label htmlFor="pdf-input" className="cursor-pointer text-sm text-zinc-300 hover:text-violet-light">
                  {file ? file.name : 'Click to select a PDF file'}
                </label>
              </div>
            )}
            <button type="submit" className={`${btnPrimary} self-start`} disabled={parsing}>
              {parsing ? 'Extracting with AI…' : 'Extract Assignments'}
            </button>
          </form>
        </div>
      )}

      {parsed && (
        <div className={card}>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Extracted Assignments</h2>
              <p className="mt-1 text-sm text-zinc-400">Review and edit before applying. Click × to remove any you don't want.</p>
            </div>
            <span className="text-sm font-medium text-zinc-300">{parsed.length} assignments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-2 font-semibold">Name</th>
                  <th className="pb-2 pr-2 font-semibold">Category</th>
                  <th className="pb-2 pr-2 font-semibold">Due Date</th>
                  <th className="pb-2 pr-2 font-semibold">Max Score</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((a, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <input className={cellInput} value={a.name} onChange={(e) => updateField(i, 'name', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        className={cellInput}
                        value={a.category_name}
                        onChange={(e) => updateField(i, 'category_name', e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value={a.category_name}>{a.category_name}</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={cellInput}
                        type="datetime-local"
                        value={a.due_date ? a.due_date.slice(0, 16) : ''}
                        onChange={(e) => updateField(i, 'due_date', e.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={`${cellInput} w-20`}
                        type="number"
                        value={a.max_score}
                        onChange={(e) => updateField(i, 'max_score', Number(e.target.value))}
                      />
                    </td>
                    <td className="py-1">
                      <button className="rounded px-2 py-1 text-grade-f transition hover:bg-grade-f/10" onClick={() => removeRow(i)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} onClick={handleApply} disabled={applying}>
              {applying ? 'Adding…' : `Add ${parsed.length} Assignments`}
            </button>
            <button className={btnSecondary} onClick={() => setParsed(null)}>Re-parse</button>
          </div>
        </div>
      )}
    </div>
  )
}
