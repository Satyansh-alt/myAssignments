import { useState, useRef, useEffect } from 'react'
import { aiChat, aiConfirm } from '../api/ai'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? 'bg-violet text-white' : 'border border-white/5 bg-ink-700 text-zinc-200'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

function ConfirmAction({ pending, onConfirm, onDecline }) {
  return (
    <div className="rounded-xl border border-violet/40 bg-violet/10 p-4">
      <p className="mb-3 text-sm font-medium text-zinc-200">Confirm this change?</p>
      <div className="flex gap-2">
        <button className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-light" onClick={onConfirm}>Yes, do it</button>
        <button className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-violet/50 hover:text-white" onClick={onDecline}>No, cancel</button>
      </div>
    </div>
  )
}

export default function ChatBot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your grade assistant. I can tell you your current grades, what's due, help you add assignments, and more. What would you like to know?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingAction])

  const historyForApi = () =>
    messages.map((m) => ({ role: m.role, content: m.content }))

  const appendMsg = (role, content) =>
    setMessages((prev) => [...prev, { role, content }])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    appendMsg('user', userMsg)
    setLoading(true)
    try {
      const res = await aiChat(userMsg, historyForApi())
      appendMsg('assistant', res.data.response)
      if (res.data.pending_action) {
        setPendingAction(res.data.pending_action)
      }
    } catch {
      appendMsg('assistant', 'Sorry, something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    const action = pendingAction
    setPendingAction(null)
    setLoading(true)
    try {
      const res = await aiConfirm(action.tool, action.args, true)
      appendMsg('assistant', res.data.response + ' Refresh the page to see changes.')

    } catch {
      appendMsg('assistant', 'Something went wrong making that change.')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    const action = pendingAction
    setPendingAction(null)
    setLoading(true)
    try {
      const res = await aiConfirm(action.tool, action.args, false)
      appendMsg('assistant', res.data.response)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="mt-1 text-sm text-zinc-400">Ask about your grades, assignments, or let me help you add things</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {pendingAction && (
          <ConfirmAction pending={pendingAction} onConfirm={handleConfirm} onDecline={handleDecline} />
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/5 bg-ink-700 px-4 py-2.5 text-sm italic text-zinc-500">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="mt-4 flex gap-2" onSubmit={handleSend}>
        <input
          className="flex-1 rounded-lg border border-white/10 bg-ink-700 px-3.5 py-2.5 text-zinc-100 focus:border-violet focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your grades…"
          disabled={loading || !!pendingAction}
        />
        <button
          type="submit"
          className="rounded-lg bg-violet px-5 py-2.5 font-medium text-white transition hover:bg-violet-light disabled:opacity-50"
          disabled={loading || !!pendingAction || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
