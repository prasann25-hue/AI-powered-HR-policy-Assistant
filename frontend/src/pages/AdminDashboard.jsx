import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import MarkdownRenderer from '../components/MarkdownRenderer'
import api from '../api/axios'
import {
  Shield, LogOut, Upload, FileText, Users, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, CheckCircle, Clock,
  Search, Filter, Eye, Layers, User
} from 'lucide-react'

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass-card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
)

// ── Policy Ingest Panel ───────────────────────────────────────────────────────
const IngestPanel = ({ onSuccess }) => {
  const [form, setForm] = useState({ title: '', category: '', content: '', access_level: 'global' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const { data } = await api.post('/policies/ingest', form)
      setResult(data)
      setForm({ title: '', category: '', content: '', access_level: 'global' })
      onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.issues?.[0]?.message || 'Ingestion failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
          <Upload className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Ingest Policy Document</h2>
          <p className="text-xs text-muted-foreground">Chunks, embeds, and stores in pgvector</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Policy Title</label>
            <input
              id="policy-title"
              type="text"
              placeholder="e.g. Remote Work Policy"
              className="input-field"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
            <input
              id="policy-category"
              type="text"
              placeholder="e.g. Benefits, Conduct, Leave"
              className="input-field"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Access Level</label>
          <div className="flex gap-2">
            {[
              { value: 'global', label: 'Global', desc: 'All employees' },
              { value: 'manager', label: 'Manager Only', desc: 'HR admins & managers' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(p => ({ ...p, access_level: opt.value }))}
                className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                  form.access_level === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-border/80'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Policy Content
          </label>
          <textarea
            id="policy-content"
            placeholder="Paste the full policy document text here. It will be automatically chunked into ~500 token segments and embedded."
            className="input-field resize-none"
            rows={8}
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            required
          />
          <p className="text-[10px] text-muted-foreground">
            ~{Math.ceil(form.content.split(/\s+/).filter(Boolean).length / 375)} chunks estimated
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <CheckCircle className="w-4 h-4" />
              Policy ingested successfully!
            </div>
            <p className="text-xs text-green-400/80">
              Created {result.chunks_created} chunks • Policy ID: {result.policy_id?.slice(0, 8)}…
            </p>
          </div>
        )}

        <button id="ingest-submit" type="submit" className="btn-primary w-full" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Chunking & embedding…' : 'Ingest Policy'}
        </button>
      </form>
    </div>
  )
}

// ── Audit Log Row ─────────────────────────────────────────────────────────────
const AuditRow = ({ item }) => {
  const [expanded, setExpanded] = useState(false)
  const [trace, setTrace] = useState(null)
  const [traceLoading, setTraceLoading] = useState(false)

  const loadTrace = async () => {
    if (trace) return
    setTraceLoading(true)
    try {
      const { data } = await api.get(`/interactions/${item.id}/trace`)
      setTrace(data)
    } catch (e) {
      setTrace({ error: 'Failed to load trace.' })
    } finally {
      setTraceLoading(false)
    }
  }

  const toggleExpand = () => {
    setExpanded(p => !p)
    if (!expanded) loadTrace()
  }

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={toggleExpand}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{item.raw_prompt}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(item.created_at).toLocaleString()}
            </span>
            {item.requires_escalation && <span className="badge-yellow">Escalation</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="badge-blue text-[10px]">{item.cited_chunk_ids?.length || 0} citations</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/40 p-4 bg-muted/20 space-y-4">
          {traceLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading audit trace…
            </div>
          ) : trace?.error ? (
            <p className="text-destructive text-sm">{trace.error}</p>
          ) : trace ? (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">AI Response</p>
                <div className="bg-card rounded-lg p-3 border border-border/40">
                  <MarkdownRenderer content={trace.interaction.llm_response} />
                </div>
              </div>
              {trace.cited_chunks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Cited Policy Chunks ({trace.cited_chunks.length})
                  </p>
                  <div className="space-y-2">
                    {trace.cited_chunks.map((chunk, i) => (
                      <div key={chunk.id} className="bg-card rounded-lg p-3 border border-border/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="badge-purple text-[10px]">
                            {chunk.policy_versions?.policies?.title || 'Unknown Policy'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Chunk {chunk.chunk_index + 1} • {chunk.id.slice(0, 8)}…
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                          {chunk.chunk_text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('upload')
  const [interactions, setInteractions] = useState([])
  const [interactionsLoading, setInteractionsLoading] = useState(false)
  const [policies, setPolicies] = useState([])
  const [escalatedOnly, setEscalatedOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ total: 0, escalated: 0, policies: 0 })

  const loadInteractions = async (escalated = false) => {
    setInteractionsLoading(true)
    try {
      const params = new URLSearchParams({ limit: 50 })
      if (escalated) params.set('escalated', 'true')
      const { data } = await api.get(`/interactions?${params}`)
      setInteractions(data.interactions || [])
      if (!escalated) setStats(p => ({ ...p, total: data.pagination?.total || 0 }))
      else setStats(p => ({ ...p, escalated: data.pagination?.total || 0 }))
    } catch (e) {
      console.error(e)
    } finally {
      setInteractionsLoading(false)
    }
  }

  const loadPolicies = async () => {
    try {
      const { data } = await api.get('/policies')
      setPolicies(data.policies || [])
      setStats(p => ({ ...p, policies: data.policies?.length || 0 }))
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    loadInteractions(escalatedOnly)
  }, [escalatedOnly])

  useEffect(() => {
    if (activeTab === 'audit' || activeTab === 'escalations') loadInteractions(activeTab === 'escalations')
    if (activeTab === 'policies') loadPolicies()
    if (activeTab === 'audit') {
      // Also load escalated count for stats
      api.get('/interactions?escalated=true&limit=1')
        .then(r => setStats(p => ({ ...p, escalated: r.data.pagination?.total || 0 })))
        .catch(() => {})
    }
  }, [activeTab])

  const filteredInteractions = interactions.filter(i =>
    i.raw_prompt.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const tabs = [
    { id: 'upload', label: 'Upload Policy', icon: Upload },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'audit', label: 'Audit Log', icon: Eye },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm text-foreground">HR Admin Dashboard</span>
              <span className="hidden sm:inline ml-2 badge-purple text-[10px]">hr_admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.name}</span>
            </div>
            <button onClick={() => { logout(); navigate('/login') }} className="btn-secondary text-xs px-3 py-1.5 gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Total Policies" value={stats.policies} color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={Users} label="Total Inquiries" value={stats.total} color="bg-purple-500/10 text-purple-400" />
          <StatCard icon={AlertTriangle} label="Escalations" value={stats.escalated} color="bg-yellow-500/10 text-yellow-400" />
          <StatCard icon={Layers} label="AI Grounded" value="100%" color="bg-green-500/10 text-green-400" />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border/40 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:block">{tab.label}</span>
              {tab.id === 'escalations' && stats.escalated > 0 && (
                <span className="badge-red text-[10px] px-1.5">{stats.escalated}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        {activeTab === 'upload' && (
          <IngestPanel onSuccess={() => { loadPolicies(); setActiveTab('policies') }} />
        )}

        {activeTab === 'policies' && (
          <div className="glass-card p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Ingested Policies
            </h2>
            {policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <FileText className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">No policies ingested yet.</p>
                <button onClick={() => setActiveTab('upload')} className="btn-primary text-xs px-4 py-2">
                  Upload First Policy
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {policies.map(policy => (
                  <div key={policy.id} className="p-4 border border-border/40 rounded-xl hover:border-border/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{policy.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{policy.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-blue text-[10px]">
                          {policy.policy_versions?.length || 0} version(s)
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(policy.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'audit' || activeTab === 'escalations') && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                {activeTab === 'escalations'
                  ? <><AlertTriangle className="w-4 h-4 text-yellow-400" /> Escalation Queue</>
                  : <><Eye className="w-4 h-4 text-primary" /> Audit Log</>
                }
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  id="audit-search"
                  type="text"
                  placeholder="Search questions…"
                  className="input-field pl-8 text-xs h-8 w-56"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {interactionsLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}
              </div>
            ) : filteredInteractions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <Eye className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">No interactions found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInteractions.map(item => (
                  <AuditRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
