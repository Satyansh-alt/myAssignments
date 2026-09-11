import { useState, useRef, useEffect } from 'react'
import { aiChat, aiConfirm } from '../api/ai'

function Message({ msg }) {
  return (
    <div className={`chat-msg ${msg.role}`}>
      <div className="chat-bubble">{msg.content}</div>
    </div>
  )
}

function ConfirmAction({ pending, onConfirm, onDecline }) {
  return (
    <div className="confirm-action">
      <p className="confirm-label">Confirm this change?</p>
      <div className="confirm-buttons">
        <button className="btn-primary" onClick={onConfirm}>Yes, do it</button>
        <button className="btn-secondary" onClick={onDecline}>No, cancel</button>
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
    <div className="chat-page">
      <div className="chat-header">
        <h1>AI Assistant</h1>
        <p className="chat-subtitle">Ask about your grades, assignments, or let me help you add things</p>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {pendingAction && (
          <ConfirmAction pending={pendingAction} onConfirm={handleConfirm} onDecline={handleDecline} />
        )}
        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-bubble thinking">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your grades…"
          disabled={loading || !!pendingAction}
        />
        <button type="submit" className="btn-primary" disabled={loading || !!pendingAction || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
