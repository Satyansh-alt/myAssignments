import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse } from '../api/courses'
import { parseSyllabusText, parseSyllabusPdf, applyCategories } from '../api/syllabus'

const btnPrimary = 'rounded-lg bg-violet px-4 py-2.5 font-medium text-white transition hover:bg-violet-light disabled:opacity-60'
const btnSecondary = 'rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white'
const card = 'mb-5 rounded-xl border border-white/5 bg-ink-800 p-5 shadow-glow'
const inputCls = 'w-full rounded-md border border-white/10 bg-ink-700 px-2.5 py-1.5 text-zinc-100 focus:border-violet focus:outline-none'

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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Import Syllabus</h1>
          {course && <span className="text-sm text-zinc-400">{course.name}</span>}
        </div>
        <Link to={`/courses/${id}`} className={btnSecondary}>← Back to Course</Link>
      </div>

      <p className="mb-6 text-sm text-zinc-400">
        Paste your syllabus or upload a PDF — the AI will extract your grade categories, weights, and drop policies automatically.
      </p>

      {success && (
        <div className="mb-5 rounded-lg border border-grade-a/40 bg-grade-a/10 px-3 py-2 text-sm text-grade-a">
          {success} <Link to={`/courses/${id}`} className="underline">View course →</Link>
        </div>
      )}
      {error && <div className="mb-5 rounded-lg border border-grade-f/40 bg-grade-f/10 px-3 py-2 text-sm text-grade-f">{error}</div>}

      {!success && (
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
                placeholder="Paste your syllabus text here…"
                rows={12}
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
              {parsing ? 'Extracting with AI…' : 'Extract Grade Categories'}
            </button>
          </form>
        </div>
      )}

      {parsed && (
        <div className={card}>
          <h2 className="font-display text-lg font-semibold">Extracted Categories</h2>
          <p className="mb-3 mt-1 text-sm text-zinc-400">Review and adjust before applying. Weights should sum to 100%.</p>
          <div className="mb-3 text-sm font-medium text-zinc-300">
            Total weight: {parsed.reduce((s, c) => s + c.weight_percent, 0).toFixed(1)}%
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-3 font-semibold">Category</th><th className="pb-2 pr-3 font-semibold">Weight %</th><th className="pb-2 font-semibold">Drop Count</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((cat, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-3"><input className={inputCls} value={cat.name} onChange={(e) => { const p = [...parsed]; p[i] = { ...p[i], name: e.target.value }; setParsed(p) }} /></td>
                    <td className="py-1 pr-3"><input className={inputCls} type="number" value={cat.weight_percent} min="0" max="100" onChange={(e) => { const p = [...parsed]; p[i] = { ...p[i], weight_percent: Number(e.target.value) }; setParsed(p) }} /></td>
                    <td className="py-1"><input className={inputCls} type="number" value={cat.drop_count ?? 0} min="0" onChange={(e) => { const p = [...parsed]; p[i] = { ...p[i], drop_count: Number(e.target.value) }; setParsed(p) }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} onClick={handleApply} disabled={applying}>
              {applying ? 'Applying…' : 'Apply to Course'}
            </button>
            <button className={btnSecondary} onClick={() => setParsed(null)}>Re-parse</button>
          </div>
        </div>
      )}
    </div>
  )
}
