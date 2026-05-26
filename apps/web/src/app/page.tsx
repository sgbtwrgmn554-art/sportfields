'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import CourtList from '@/components/CourtList'
import SportFilter, { Category } from '@/components/SportFilter'
import AuthModal from '@/components/AuthModal'
import AdBanner from '@/components/AdBanner'
import { useAuth } from '@/lib/useAuth'
import { t, Lang } from '@/lib/i18n'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function HomePage() {
  const [view, setView]       = useState<'map' | 'list'>('map')
  const [sport, setSport]     = useState<string>('all')
  const [category, setCategory] = useState<Category>('sports')
  const [showAuth, setShowAuth] = useState(false)
  const [lang, setLang]       = useState<Lang>('he')
  const txt = t[lang]
  const { user, logout, init } = useAuth()

  // טען auth מ-localStorage בטעינה
  useEffect(() => { init() }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--dark)' }}>

      {/* HEADER */}
      <header style={{
        background: 'linear-gradient(135deg, var(--dark), var(--panel))',
        borderBottom: '2px solid var(--green)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--green)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 12px rgba(37,168,102,.4)',
          }}>⚽</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>
              Sport<span style={{ color: 'var(--gl)' }}>Fields</span>
            </h1>
            <div style={{ fontSize: 10, color: 'var(--gray)' }}>{txt.appSub}</div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['map', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 12px', borderRadius: 20, border: 'none',
                fontSize: 12, fontFamily: 'Heebo, sans-serif', fontWeight: 600, cursor: 'pointer',
                background: view === v ? 'var(--green)' : 'rgba(255,255,255,.07)',
                color: view === v ? 'white' : 'var(--gray)', transition: 'background .2s',
              }}>
                {v === 'map' ? txt.map : txt.list}
              </button>
            ))}
            {/* Language toggle */}
            <button onClick={() => setLang(lang === 'he' ? 'en' : 'he')} style={{
              padding: '5px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,.15)',
              fontSize: 12, fontFamily: 'Heebo, sans-serif', fontWeight: 700, cursor: 'pointer',
              background: 'rgba(255,255,255,.07)', color: 'var(--gl)',
            }}>
              {lang === 'he' ? '🇺🇸 EN' : '🇮🇱 HE'}
            </button>
          </div>

          {/* Auth button */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white',
              }}>
                {user.name[0]}
              </div>
              <button onClick={logout} style={{
                background: 'none', border: 'none', color: 'var(--gray)',
                fontFamily: 'Heebo, sans-serif', fontSize: 12, cursor: 'pointer',
              }}>
                {txt.logout}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{
              background: 'var(--green)', color: 'white', border: 'none',
              padding: '6px 14px', borderRadius: 20,
              fontFamily: 'Heebo, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              {txt.login}
            </button>
          )}
        </div>
      </header>

      {/* FILTER */}
      <SportFilter
        category={category}
        selected={sport}
        onCategoryChange={setCategory}
        onChange={setSport}
      />

      {/* AD BANNER — בין הפילטר למפה */}
      <AdBanner slot="1234567890" format="banner" />

      {/* MAIN */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {view === 'map'
          ? <MapView sport={sport} category={category} onAuthRequired={() => setShowAuth(true)} />
          : <CourtList sport={sport} />
        }
      </div>

      {/* Auth Modal */}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
