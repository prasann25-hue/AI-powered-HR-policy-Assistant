import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import MarkdownRenderer from '../components/MarkdownRenderer'
import CitationBadge from '../components/CitationBadge'
import EscalationBanner from '../components/EscalationBanner'
import ErrorBoundary from '../components/ErrorBoundary'
import {
  Shield, Send, LogOut, History, ChevronLeft, ChevronRight,
  Bot, User, Clock, AlertCircle, Loader2, Sparkles, MessageSquare
} from 'lucide-react'
import api from '../api/axios'

const API_URL = import.meta.env.VITE_API_URL

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ status }) => (
  <div className="flex items-center gap-3 animate-fade-in">
    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-primary" />
    </div>
    <div className="chat-bubble-ai flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      {status && <span className="text-xs text-muted-foreground ml-1">{status}</span>}
    </div>
  </div>
)

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, onEscalate }) => {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary/15 border border-primary/20' : 'bg-card border border-border'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-primary" />
          : <Bot className="w-4 h-4 text-muted-foreground" />
        }
      </div>
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {isUser ? (
          <div className="chat-bubble-user text-sm">{msg.content}</div>
        ) : (
          <div className="chat-bubble-ai">
            {msg.error ? (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {msg.content}
              </div>
            ) : (
              <ErrorBoundary fallbackMessage="Failed to render AI response.">
                <MarkdownRenderer content={msg.content} />
                {msg.citations?.length > 0 && <CitationBadge citations={msg.citations} />}
                {msg.requires_escalation && <EscalationBanner onEscalate={() => onEscalate(msg)} />}
              </ErrorBoundary>
            )}
          </div>
        )}
        <span className="text-[10px] text-muted-foreground px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// ── History sidebar item ──────────────────────────────────────────────────────
const HistoryItem = ({ item, onClick }) => (
  <button
    onClick={() => onClick(item)}
    className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors group border border-transparent hover:border-border/40"
  >
    <p className="text-xs font-medium text-foreground/80 truncate group-hover:text-foreground">
      {item.raw_prompt}
    </p>
    <div className="flex items-center gap-2 mt-1">
      <Clock className="w-3 h-3 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">
        {new Date(item.created_at).toLocaleDateString()}
      </span>
      {item.requires_escalation && (
        <span className="badge-yellow text-[9px]">Escalated</span>
      )}
    </div>
  </button>
)

// ── Main Employee Workspace ───────────────────────────────────────────────────
const EmployeeWorkspace = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamStatus, setStreamStatus] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const eventSourceRef = useRef(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Load history
  useEffect(() => {
    api.get('/chat/history')
      .then(res => setHistory(res.data.interactions || []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const loadHistoryItem = (item) => {
    setMessages([
      { role: 'user', content: item.raw_prompt, timestamp: item.created_at },
      {
        role: 'assistant',
        content: item.llm_response,
        citations: item.cited_chunk_ids || [],
        requires_escalation: item.requires_escalation,
        timestamp: item.created_at,
      }
    ])
    setSidebarOpen(false)
  }

  const sendQuestion = useCallback(async () => {
    if (!question.trim() || streaming) return

    const userMsg = { role: 'user', content: question.trim(), timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setStreaming(true)
    setStreamStatus('Connecting…')

    const token = localStorage.getItem('hr_token')

    // Close any existing SSE connection
    if (eventSourceRef.current) eventSourceRef.current.close()

    try {
      // Use fetch for POST + SSE (EventSource only supports GET)
      const response = await fetch(`${API_URL}/api/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: userMsg.content }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event:')) continue
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim())

              // Order matters: check answer first, then requires_escalation (error), then status
              if (data.answer !== undefined) {
                // ── Result event ──────────────────────────────────────────
                setMessages(prev => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: data.answer,
                    citations: data.citations || [],
                    requires_escalation: data.requires_escalation || false,
                    interaction_id: data.interaction_id,
                    timestamp: new Date().toISOString(),
                  }
                ])
                api.get('/chat/history').then(r => setHistory(r.data.interactions || []))
              } else if (data.requires_escalation !== undefined) {
                // ── Error event (has requires_escalation, no answer) ──────
                setMessages(prev => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: data.message || 'An error occurred. Please try again.',
                    error: true,
                    requires_escalation: data.requires_escalation,
                    timestamp: new Date().toISOString(),
                  }
                ])
              } else if (data.message && data.message !== 'Complete') {
                // ── Status event ──────────────────────────────────────────
                setStreamStatus(data.message)
              }
            } catch { /* ignore parse errors on partial lines */ }
          }
        }
      }
    } catch (err) {
      const msg = err.message?.includes('429')
        ? 'Rate limit reached. Please wait a minute before asking another question.'
        : err.message || 'Failed to connect to the AI service. Please try again.'

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: msg,
        error: true,
        requires_escalation: err.message?.includes('429') ? false : true,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setStreaming(false)
      setStreamStatus('')
      inputRef.current?.focus()
    }
  }, [question, streaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuestion()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(p => !p)}
              className="w-8 h-8 rounded-lg border border-border hover:bg-secondary flex items-center justify-center transition-colors"
              title="Toggle history"
            >
              <History className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm gradient-text hidden sm:block">HR Policy Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-foreground">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground">{user?.department}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5 gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── History Sidebar ─────────────────────────────────────────────────── */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 border-r border-border/40 bg-card/30`}>
          <div className="w-72 h-full flex flex-col p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Inquiry History</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {historyLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="skeleton h-14 w-full" />
                ))
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No past inquiries</p>
                </div>
              ) : (
                history.map(item => (
                  <HistoryItem key={item.id} item={item} onClick={loadHistoryItem} />
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Chat Area ──────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Sparkles className="w-9 h-9 text-primary" />
                </div>
                <div className="text-center max-w-md">
                  <h2 className="text-xl font-bold text-foreground mb-2">Ask about HR Policies</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Get instant, AI-powered answers grounded exclusively in your company's approved HR policies.
                    Ask about leave, benefits, conduct guidelines, and more.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {[
                    'What is the remote work policy?',
                    'How many sick days am I entitled to?',
                    'What is the process for requesting leave?',
                    'What is the code of conduct policy?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setQuestion(q); inputRef.current?.focus() }}
                      className="p-3 rounded-xl bg-card border border-border/60 text-sm text-muted-foreground
                                 hover:border-primary/30 hover:text-foreground hover:bg-primary/5
                                 transition-all duration-200 text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} onEscalate={() => {}} />
            ))}

            {streaming && <TypingIndicator status={streamStatus} />}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Bar ────────────────────────────────────────────────────── */}
          <div className="border-t border-border/40 bg-card/30 backdrop-blur-lg p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  id="chat-input"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a policy question… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="input-field flex-1 resize-none min-h-[44px] max-h-32 py-3 pr-12 leading-relaxed"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                  }}
                  disabled={streaming}
                />
                <button
                  id="send-btn"
                  onClick={sendQuestion}
                  disabled={!question.trim() || streaming}
                  className="btn-primary h-11 w-11 p-0 flex-shrink-0"
                >
                  {streaming
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Answers are based exclusively on approved HR policies. For sensitive matters, always escalate to HR.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default EmployeeWorkspace
