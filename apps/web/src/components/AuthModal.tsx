'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'

interface Props {
  open: boolean
  onClose: () => void
}

const inp: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(37,168,102,.3)',
  borderRadius: 10,
  padding: '11px 14px',
  color: 'var(--white)',
  fontFamily: 'Heebo, sans-serif',
  fontSize: 15,
  outline: 'none',
  direction: 'rtl',
  marginTop: 5,
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--gray)',
  textTransform: 'uppercase',
  letterSpacing: '.5px',
}

export default function AuthModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const { login, register, loading, error, clearError } = useAuth()

  useEffect(() => { if (!open) { clearError(); setName(''); setEmail(''); setPass('') } }, [open])

  if (!open) return null

  async function submit() {
    let ok = false
    if (tab === 'login') {
      ok = await login(email, password)
    } else {
      ok = await register(name, email, password)
    }
    if (ok) onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid rgba(37,168,102,.4)',
        borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 400,
        direction: 'rtl', fontFamily: 'Heebo, sans-serif', textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚽</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>SportFields</div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 24 }}>מפה שיתופית של מגרשי ספורט</div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {(['login', 'register'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); clearError() }} style={{
              flex: 1, padding: '8px', borderRadius: 9, border: 'none',
              fontFamily: 'Heebo, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: tab === t ? 'var(--green)' : 'transparent',
              color: tab === t ? 'white' : 'var(--gray)',
              transition: 'all .2s',
            }}>
              {t === 'login' ? '🔑 כניסה' : '✨ הרשמה'}
            </button>
          ))}
        </div>

        {/* Fields */}
        {tab === 'register' && (
          <div style={{ marginBottom: 14, textAlign: 'right' }}>
            <label style={lbl}>שם מלא</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" />
          </div>
        )}
        <div style={{ marginBottom: 14, textAlign: 'right' }}>
          <label style={lbl}>אימייל</label>
          <input style={inp} type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div style={{ marginBottom: 20, textAlign: 'right' }}>
          <label style={lbl}>סיסמה</label>
          <input style={inp} type="password" dir="ltr" value={password} onChange={e => setPass(e.target.value)} placeholder="לפחות 6 תווים" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,50,50,.1)', border: '1px solid rgba(255,50,50,.3)',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ff6b6b', marginBottom: 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button onClick={submit} disabled={loading} style={{
          width: '100%', background: loading ? 'var(--gray)' : 'var(--green)',
          color: 'white', border: 'none', padding: 13, borderRadius: 10,
          fontFamily: 'Heebo, sans-serif', fontSize: 16, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 10,
        }}>
          {loading ? '⏳ רגע...' : tab === 'login' ? 'כניסה ←' : 'הרשמה ←'}
        </button>

        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--gray)',
          fontFamily: 'Heebo, sans-serif', fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
        }}>
          המשך ללא חשבון 👤
        </button>
      </div>
    </div>
  )
}
