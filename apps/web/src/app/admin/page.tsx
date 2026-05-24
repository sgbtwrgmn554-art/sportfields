'use client'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀',
  football: '⚽',
  tennis: '🎾',
  volleyball: '🏐',
}

interface Court {
  id: string
  name: string
  address: string
  city: string
  sport_types: string[]
  verified: boolean
  notes: string
  lat: number
  lng: number
}

function headers() {
  return { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET }
}

export default function AdminPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Court | null>(null)
  const [adding, setAdding]   = useState(false)
  const [secret, setSecret]   = useState(ADMIN_SECRET)
  const [authed, setAuthed]   = useState(!!ADMIN_SECRET)
  const [stats, setStats]     = useState<any[]>([])

  const fetchCourts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
        ...(cityFilter && { city: cityFilter }),
        ...(sportFilter && { sport: sportFilter }),
        ...(search && { search }),
      })
      const res = await fetch(`${API}/admin/courts?${params}`, { headers: headers() })
      const data = await res.json()
      setCourts(data.courts ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, cityFilter, sportFilter, search])

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/admin/stats`, { headers: headers() })
    const data = await res.json()
    setStats(data ?? [])
  }, [])

  useEffect(() => {
    if (authed) { fetchCourts(); fetchStats() }
  }, [authed, fetchCourts, fetchStats])

  async function deleteCourt(id: string) {
    if (!confirm('למחוק את המגרש?')) return
    await fetch(`${API}/admin/courts/${id}`, { method: 'DELETE', headers: headers() })
    fetchCourts()
    fetchStats()
  }

  async function saveEdit(id: string, data: Partial<Court>) {
    await fetch(`${API}/admin/courts/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    })
    setEditing(null)
    fetchCourts()
  }

  async function addCourt(data: Omit<Court, 'id' | 'verified'>) {
    await fetch(`${API}/admin/courts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    })
    setAdding(false)
    fetchCourts()
    fetchStats()
  }

  // ---- Login screen ----
  if (!authed) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d1117' }}>
        <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:12, padding:32, width:320 }}>
          <h2 style={{ color:'#25a866', marginBottom:16, fontFamily:'Heebo,sans-serif' }}>🔐 Admin Login</h2>
          <input
            type="password"
            placeholder="ADMIN_SECRET"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setAuthed(true)}
            style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #30363d',
              background:'#0d1117', color:'white', fontFamily:'Heebo,sans-serif', fontSize:14 }}
          />
          <button
            onClick={() => setAuthed(true)}
            style={{ marginTop:12, width:'100%', background:'#25a866', color:'white', border:'none',
              padding:'10px', borderRadius:8, fontFamily:'Heebo,sans-serif', fontSize:14, cursor:'pointer' }}>
            כניסה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', color:'#e6edf3', fontFamily:'Heebo,sans-serif', direction:'rtl' }}>
      {/* Header */}
      <div style={{ background:'#161b22', borderBottom:'1px solid #30363d', padding:'12px 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#25a866' }}>⚙️ ניהול מגרשים</h1>
        <div style={{ display:'flex', gap:8 }}>
          <a href="/" style={{ color:'#8b949e', fontSize:13 }}>← חזרה לאפליקציה</a>
        </div>
      </div>

      <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
        {/* Stats cards */}
        <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
          <StatCard label="סה״כ מגרשים" value={total} color="#25a866" />
          {stats.slice(0,4).map(s => (
            <StatCard key={s.city} label={s.city ?? 'לא ידוע'} value={Number(s.total)} color="#1f6feb" />
          ))}
        </div>

        {/* Filters + Add */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input
            placeholder="🔍 חיפוש שם / כתובת..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={inputStyle}
          />
          <input
            placeholder="🏙️ עיר"
            value={cityFilter}
            onChange={e => { setCityFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, width:140 }}
          />
          <select
            value={sportFilter}
            onChange={e => { setSportFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, width:140 }}>
            <option value="">כל הספורט</option>
            <option value="basketball">🏀 כדורסל</option>
            <option value="football">⚽ כדורגל</option>
            <option value="tennis">🎾 טניס</option>
            <option value="volleyball">🏐 כדורעף</option>
          </select>
          <button
            onClick={() => setAdding(true)}
            style={{ marginRight:'auto', background:'#25a866', color:'white', border:'none',
              padding:'8px 16px', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'Heebo,sans-serif' }}>
            + הוסף מגרש
          </button>
        </div>

        {/* Table */}
        <div style={{ background:'#161b22', borderRadius:12, border:'1px solid #30363d', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#21262d', borderBottom:'1px solid #30363d' }}>
                <th style={thStyle}>שם</th>
                <th style={thStyle}>עיר</th>
                <th style={thStyle}>ספורט</th>
                <th style={thStyle}>קואורדינטות</th>
                <th style={thStyle}>מאומת</th>
                <th style={thStyle}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#8b949e' }}>טוען...</td></tr>
              ) : courts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#8b949e' }}>אין מגרשים</td></tr>
              ) : courts.map((court, i) => (
                <tr key={court.id} style={{ borderBottom:'1px solid #21262d',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight:600 }}>{court.name}</div>
                    {court.address && <div style={{ fontSize:11, color:'#8b949e' }}>{court.address}</div>}
                  </td>
                  <td style={tdStyle}>{court.city ?? '—'}</td>
                  <td style={tdStyle}>
                    {court.sport_types?.map(s => (
                      <span key={s} style={{ background:'#21262d', borderRadius:12, padding:'2px 8px',
                        fontSize:11, marginLeft:4 }}>
                        {SPORT_EMOJI[s] ?? '🏟️'} {s}
                      </span>
                    ))}
                  </td>
                  <td style={{ ...tdStyle, fontFamily:'monospace', fontSize:11, color:'#8b949e' }}>
                    {court.lat?.toFixed(4)}, {court.lng?.toFixed(4)}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: court.verified ? '#25a866' : '#f85149' }}>
                      {court.verified ? '✅' : '❌'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => setEditing(court)} style={btnStyle('#1f6feb')}>✏️ עריכה</button>
                    <button onClick={() => deleteCourt(court.id)} style={btnStyle('#f85149')}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p-1)} style={btnStyle('#30363d')}>← הקודם</button>
          <span style={{ color:'#8b949e', fontSize:13, lineHeight:'32px' }}>עמוד {page}</span>
          <button disabled={courts.length < 30} onClick={() => setPage(p => p+1)} style={btnStyle('#30363d')}>הבא →</button>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditModal court={editing} onSave={saveEdit} onClose={() => setEditing(null)} />
      )}

      {/* Add Modal */}
      {adding && (
        <AddModal onSave={addCourt} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}

// ---- Sub-components ----

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background:'#161b22', border:`1px solid ${color}33`, borderRadius:10,
      padding:'12px 20px', minWidth:130 }}>
      <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:12, color:'#8b949e' }}>{label}</div>
    </div>
  )
}

function EditModal({ court, onSave, onClose }: { court: Court; onSave: (id:string, d:any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...court })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={`✏️ עריכת: ${court.name}`} onClose={onClose}>
      <Field label="שם">
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
      </Field>
      <Field label="כתובת">
        <input value={form.address ?? ''} onChange={e => set('address', e.target.value)} style={inputStyle} />
      </Field>
      <Field label="עיר">
        <input value={form.city ?? ''} onChange={e => set('city', e.target.value)} style={inputStyle} />
      </Field>
      <Field label="קו רוחב (lat)">
        <input type="number" step="0.0001" value={form.lat} onChange={e => set('lat', Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="קו אורך (lng)">
        <input type="number" step="0.0001" value={form.lng} onChange={e => set('lng', Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="ספורט">
        <div style={{ display:'flex', gap:8 }}>
          {['basketball','football','tennis','volleyball'].map(s => (
            <label key={s} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={form.sport_types?.includes(s)}
                onChange={e => {
                  const cur = form.sport_types ?? []
                  set('sport_types', e.target.checked ? [...cur, s] : cur.filter(x => x !== s))
                }}
              />
              {SPORT_EMOJI[s]} {s}
            </label>
          ))}
        </div>
      </Field>
      <Field label="הערות">
        <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} style={inputStyle} />
      </Field>
      <Field label="מאומת">
        <label style={{ cursor:'pointer' }}>
          <input type="checkbox" checked={form.verified} onChange={e => set('verified', e.target.checked)} />
          {' '}מאומת
        </label>
      </Field>
      <a
        href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize:12, color:'#25a866', display:'block', marginBottom:12 }}>
        🗺️ פתח במפת גוגל לבדיקה
      </a>
      <button onClick={() => onSave(court.id, form)} style={{ ...btnStyle('#25a866'), padding:'10px 24px', width:'100%' }}>
        💾 שמור
      </button>
    </Modal>
  )
}

function AddModal({ onSave, onClose }: { onSave: (d:any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name:'', address:'', city:'תל אביב', lat:32.085, lng:34.781, sport_types:['basketball'], notes:'' })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title="➕ הוספת מגרש חדש" onClose={onClose}>
      <Field label="שם *"><input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} /></Field>
      <Field label="כתובת"><input value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} /></Field>
      <Field label="עיר"><input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} /></Field>
      <Field label="קו רוחב (lat)">
        <input type="number" step="0.0001" value={form.lat} onChange={e => set('lat', Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="קו אורך (lng)">
        <input type="number" step="0.0001" value={form.lng} onChange={e => set('lng', Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="ספורט">
        <div style={{ display:'flex', gap:8 }}>
          {['basketball','football','tennis','volleyball'].map(s => (
            <label key={s} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={form.sport_types.includes(s)}
                onChange={e => {
                  const cur = form.sport_types
                  set('sport_types', e.target.checked ? [...cur, s] : cur.filter(x => x !== s))
                }}
              />
              {SPORT_EMOJI[s]} {s}
            </label>
          ))}
        </div>
      </Field>
      <Field label="הערות"><input value={form.notes} onChange={e => set('notes', e.target.value)} style={inputStyle} /></Field>
      <a
        href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize:12, color:'#25a866', display:'block', marginBottom:12 }}>
        🗺️ פתח במפת גוגל לבדיקה
      </a>
      <button
        onClick={() => form.name && onSave(form)}
        style={{ ...btnStyle('#25a866'), padding:'10px 24px', width:'100%' }}>
        ➕ הוסף
      </button>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:12,
        padding:28, width:520, maxHeight:'90vh', overflowY:'auto', direction:'rtl' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:800 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8b949e',
            fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, color:'#8b949e', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  )
}

// ---- Styles ----
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #30363d',
  background: '#0d1117', color: '#e6edf3', fontFamily: 'Heebo, sans-serif', fontSize: 13,
}
const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 12,
  color: '#8b949e', borderLeft: '1px solid #30363d',
}
const tdStyle: React.CSSProperties = {
  padding: '10px 16px', borderLeft: '1px solid #21262d', verticalAlign: 'top',
}
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: 'white', border: 'none', padding: '5px 10px',
  borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Heebo, sans-serif', marginLeft: 4,
})
