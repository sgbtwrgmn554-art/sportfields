'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useBboxCourts } from '@/lib/useCourts'
import { useAuth } from '@/lib/useAuth'
import { SPORT_COLORS } from './SportFilter'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀', football: '⚽', tennis: '🎾',
  volleyball: '🏐', fitness: '🏋️', skate: '🛹',
  padel: '🏸', pingpong: '🏓', pumptrack: '🚴', ninja: '🧗',
}

const SPORT_OPTIONS = [
  { value: 'football',   label: '⚽ כדורגל' },
  { value: 'basketball', label: '🏀 כדורסל' },
  { value: 'tennis',     label: '🎾 טניס' },
  { value: 'volleyball', label: '🏐 כדורעף' },
  { value: 'fitness',    label: '🏋️ כושר חוץ' },
  { value: 'skate',      label: '🛹 סקייטפארק' },
  { value: 'padel',      label: '🏸 פדל' },
  { value: 'pingpong',   label: '🏓 פינג-פונג' },
  { value: 'pumptrack',  label: '🚴 פאמפטרק' },
  { value: 'ninja',      label: '🧗 נינג׳ה' },
]

interface Court {
  id: string; name: string; address?: string; sport_types: string[]
  lat: number; lng: number; active_players: number; photo_url?: string
}

interface Props { sport: string; onAuthRequired: () => void }

export default function MapView({ sport, onAuthRequired }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef  = useRef<any>(null)   // cluster group
  const leafletRef  = useRef<any>(null)

  const [addMode, setAddMode]       = useState(false)
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [toast, setToast]           = useState('')
  const [form, setForm]             = useState({ name: '', city: '', sport: 'football' })
  const [courtCount, setCourtCount] = useState(0)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [checkedIn, setCheckedIn]         = useState<string | null>(null)

  const { courts, loading, fetchByBbox } = useBboxCourts(sport)
  const { user, token } = useAuth()

  // ── Init Leaflet + Cluster ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstance.current) return

    // טוענים leaflet CSS + leaflet + markercluster
    const addCss = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = href
      document.head.appendChild(link)
    }
    addCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
    addCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css')
    addCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css')

    import('leaflet').then(async (Lmod) => {
      const L = (Lmod.default ?? Lmod) as any
      ;(window as any).L = L          // markercluster צריך L גלובלי
      leafletRef.current = L

      await import('leaflet.markercluster')

      const container = mapRef.current as any
      if (!container || container._leaflet_id) return

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(container, { center: [32.08, 34.78], zoom: 13, zoomControl: true })
      mapInstance.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // Cluster group
      const cluster = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount()
          return L.divIcon({
            html: `<div style="background:var(--green);color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.5)">${count}</div>`,
            className: '', iconSize: [36, 36],
          })
        },
      })
      map.addLayer(cluster)
      markersRef.current = cluster

      // טוען מגרשים בכל פעם שהמפה זזה/זום
      const loadBbox = () => {
        const b = map.getBounds()
        fetchByBbox({
          minLat: b.getSouth(), maxLat: b.getNorth(),
          minLng: b.getWest(),  maxLng: b.getEast(),
        })
      }

      map.on('moveend', loadBbox)
      map.on('zoomend', loadBbox)
      loadBbox() // טעינה ראשונית

      // GPS
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
        () => {}, { timeout: 5000 }
      )
    })

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    }
  }, [])

  // כשהספורט משתנה — טוען מחדש
  useEffect(() => {
    if (!mapInstance.current) return
    const b = mapInstance.current.getBounds()
    fetchByBbox({
      minLat: b.getSouth(), maxLat: b.getNorth(),
      minLng: b.getWest(),  maxLng: b.getEast(),
    })
  }, [sport])

  // ── עדכון markers בכל פעם שהנתונים משתנים ──────────────────
  useEffect(() => {
    const map = mapInstance.current
    const L   = leafletRef.current
    const cluster = markersRef.current
    if (!map || !L || !cluster) return

    cluster.clearLayers()
    setCourtCount(courts.length)

    courts.forEach((court: Court) => {
      const sp    = court.sport_types?.[0] || 'football'
      const emoji = SPORT_EMOJI[sp] || '🏟️'
      const color = SPORT_COLORS[sp] || '#25a866'
      const count = Number(court.active_players) || 0
      const isCI  = checkedIn === court.id

      const icon = L.divIcon({
        html: `<div style="position:relative;width:34px;height:34px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.5);border:2px solid ${isCI ? '#f5c518' : 'rgba(255,255,255,.3)'}"><span style="transform:rotate(45deg);font-size:14px">${emoji}</span>${count > 0 ? `<div style="position:absolute;top:-5px;right:-5px;background:#f5c518;color:#000;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;transform:rotate(45deg)">${count}</div>` : ''}</div>`,
        className: '', iconSize: [34, 34], iconAnchor: [10, 34], popupAnchor: [10, -38],
      })

      const marker = L.marker([court.lat, court.lng], { icon })
      marker.on('click', () => setSelectedCourt(court))
      cluster.addLayer(marker)
    })
  }, [courts, checkedIn])

  // ── Click-to-add ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    if (addMode) {
      map.getContainer().style.cursor = 'crosshair'
      const handler = (e: any) => {
        setPendingPos({ lat: e.latlng.lat, lng: e.latlng.lng })
        setShowModal(true); setAddMode(false)
        map.getContainer().style.cursor = ''
        map.off('click', handler)
      }
      map.on('click', handler)
      return () => { map.off('click', handler) }
    } else {
      map.getContainer().style.cursor = ''
    }
  }, [addMode])

  // ── Check-in ─────────────────────────────────────────────────
  async function doCheckin(court: Court) {
    if (!user || !token) { onAuthRequired(); return }
    if (checkedIn === court.id) {
      try {
        await axios.post(`${API}/checkins/checkout`, {}, { headers: { Authorization: `Bearer ${token}` } })
        setCheckedIn(null); showToast('👋 יצאת מהמגרש'); setSelectedCourt(null)
      } catch { showToast('שגיאה בצ\'ק-אאוט') }
      return
    }
    showToast('⏳ מאתר מיקום...')
    const getPos = (): Promise<{lat:number,lng:number}> =>
      new Promise((res) => {
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
          ()  => res({ lat: court.lat, lng: court.lng }),
          { timeout: 5000 }
        )
      })
    const pos = await getPos()
    try {
      await axios.post(`${API}/checkins`,
        { court_id: court.id, lat: pos.lat, lng: pos.lng, privacy: 'public' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCheckedIn(court.id); showToast('📍 אתה במגרש!'); setSelectedCourt(null)
    } catch (e: any) { showToast(e.response?.data?.error || 'שגיאה בצ\'ק-אין') }
  }

  // ── Delete court (admin / reporter) ─────────────────────────
  async function deleteCourt(court: Court) {
    if (!confirm(`למחוק את "${court.name}"?`)) return
    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET
      await axios.delete(`${API}/courts/${court.id}`, {
        headers: { 'x-admin-secret': adminSecret || '', Authorization: token ? `Bearer ${token}` : '' }
      })
      setSelectedCourt(null)
      showToast('🗑️ המגרש נמחק')
      // רענן את המגרשים
      const b = mapInstance.current?.getBounds()
      if (b) fetchByBbox({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() })
    } catch { showToast('אין הרשאה למחיקה') }
  }

  // ── Report wrong court ───────────────────────────────────────
  async function reportCourt(court: Court) {
    try {
      await axios.post(`${API}/courts/${court.id}/report`,
        { reason: 'wrong_location' },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      showToast('✅ הדיווח נשלח — תודה!')
      setSelectedCourt(null)
    } catch { showToast('שגיאה בדיווח') }
  }

  // ── Save new court ────────────────────────────────────────────
  async function saveNewCourt() {
    if (!user || !token) { onAuthRequired(); return }
    if (!pendingPos || !form.name.trim() || !form.city.trim()) {
      showToast('נא למלא שם ועיר'); return
    }
    try {
      await axios.post(`${API}/courts`, {
        name: form.name.trim(), address: form.city.trim(),
        lat: pendingPos.lat, lng: pendingPos.lng, sport_types: [form.sport],
      }, { headers: { Authorization: `Bearer ${token}` } })
      setShowModal(false); setForm({ name: '', city: '', sport: 'football' }); setPendingPos(null)
      showToast('✅ המגרש נוסף!')
    } catch { showToast('שגיאה — נסה שוב') }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(37,168,102,.3)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--white)',
    fontFamily: 'Heebo, sans-serif', fontSize: 14, outline: 'none', direction: 'rtl',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray)',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px',
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Map */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Counter */}
      {courtCount > 0 && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 900,
          background: 'rgba(15,31,21,.9)', border: '1px solid var(--green)',
          borderRadius: 20, padding: '4px 12px',
          fontFamily: 'Heebo, sans-serif', fontSize: 12, color: 'var(--gray)',
        }}>
          {loading ? '⏳' : `🏟️ ${courtCount} מגרשים`}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => { if (!user) { onAuthRequired(); return }; setAddMode(!addMode) }} style={{
        position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: addMode ? '#c0392b' : 'var(--green)',
        color: 'white', border: 'none', padding: '12px 26px', borderRadius: 50,
        fontFamily: 'Heebo, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(26,122,74,.6)', transition: 'background .2s',
      }}>
        {addMode ? '✕ ביטול' : '＋ הוסף מגרש'}
      </button>

      {addMode && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'var(--accent)', color: 'var(--dark)',
          padding: '8px 22px', borderRadius: 50,
          fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
        }}>
          📍 לחץ על המפה לסימון מיקום
        </div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1100, background: 'var(--green)', color: 'white',
          padding: '9px 20px', borderRadius: 50,
          fontFamily: 'Heebo, sans-serif', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* ── Court Popup ── */}
      {selectedCourt && (
        <div style={{
          position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: '90%', maxWidth: 360,
          background: 'var(--panel)', border: '1px solid var(--green)',
          borderRadius: 16, padding: '16px 18px', direction: 'rtl',
          fontFamily: 'Heebo, sans-serif', boxShadow: '0 8px 30px rgba(0,0,0,.7)',
        }}>
          <button onClick={() => setSelectedCourt(null)} style={{
            position: 'absolute', top: 10, left: 12, background: 'none', border: 'none',
            color: 'var(--gray)', cursor: 'pointer', fontSize: 16,
          }}>✕</button>

          {selectedCourt.photo_url && (
            <img src={selectedCourt.photo_url} style={{
              width: '100%', maxHeight: 110, objectFit: 'cover',
              borderRadius: 10, marginBottom: 10, display: 'block',
            }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{selectedCourt.name}</div>
              <div style={{ fontSize: 12, color: SPORT_COLORS[selectedCourt.sport_types[0]] || 'var(--gl)', fontWeight: 600 }}>
                {SPORT_EMOJI[selectedCourt.sport_types[0]] || '🏟️'} {selectedCourt.sport_types[0]}
              </div>
              {selectedCourt.address && (
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>📍 {selectedCourt.address}</div>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                {selectedCourt.active_players || 0}
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray)' }}>שחקנים</div>
            </div>
          </div>

          {/* Check-in */}
          <button onClick={() => doCheckin(selectedCourt)} style={{
            width: '100%', marginTop: 12, padding: '11px',
            borderRadius: 10, border: 'none',
            background: checkedIn === selectedCourt.id ? '#c0392b' : 'var(--green)',
            color: 'white', fontFamily: 'Heebo, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            {checkedIn === selectedCourt.id ? '👋 צ\'ק-אאוט — יצאתי' : '📍 אני כאן! צ\'ק-אין'}
          </button>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <a href={`https://waze.com/ul?ll=${selectedCourt.lat},${selectedCourt.lng}&navigate=yes`}
               target="_blank" rel="noopener noreferrer"
               style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                 padding: '9px 0', borderRadius: 10, textDecoration: 'none',
                 background: '#33ccff', color: '#fff',
                 fontFamily: 'Heebo, sans-serif', fontSize: 13, fontWeight: 700 }}>
              🚙 Waze
            </a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${selectedCourt.lat},${selectedCourt.lng}`}
               target="_blank" rel="noopener noreferrer"
               style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                 padding: '9px 0', borderRadius: 10, textDecoration: 'none',
                 background: 'rgba(255,255,255,.08)', color: 'white',
                 border: '1px solid rgba(255,255,255,.2)',
                 fontFamily: 'Heebo, sans-serif', fontSize: 13, fontWeight: 700 }}>
              🗺️ Google
            </a>
          </div>

          {/* Report / Delete */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => reportCourt(selectedCourt)} style={{
              flex: 1, background: 'none', border: '1px solid rgba(255,100,100,.3)',
              color: 'rgba(255,150,150,.8)', borderRadius: 8, padding: '7px',
              fontFamily: 'Heebo, sans-serif', fontSize: 12, cursor: 'pointer',
            }}>
              ⚠️ דווח על שגיאה
            </button>
            {user?.isAdmin && (
              <button onClick={() => deleteCourt(selectedCourt)} style={{
                flex: 1, background: 'rgba(192,57,43,.2)', border: '1px solid rgba(192,57,43,.4)',
                color: '#e74c3c', borderRadius: 8, padding: '7px',
                fontFamily: 'Heebo, sans-serif', fontSize: 12, cursor: 'pointer',
              }}>
                🗑️ מחק מגרש
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Add Court Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--green)',
            borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 400,
            fontFamily: 'Heebo, sans-serif', direction: 'rtl',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
              ➕ הוספת <span style={{ color: 'var(--gl)' }}>מגרש חדש</span>
            </h2>
            <div style={{
              background: 'rgba(245,197,24,.1)', border: '1px solid rgba(245,197,24,.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--accent)', marginBottom: 12,
            }}>
              📍 {pendingPos?.lat.toFixed(5)}, {pendingPos?.lng.toFixed(5)}
            </div>

            {[['name', 'שם המגרש', 'מגרש פארק הירקון'], ['city', 'עיר / כתובת', 'תל אביב']].map(([key, lbl, ph]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{lbl}</label>
                <input value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>סוג ספורט</label>
              <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })} style={inputStyle}>
                {SPORT_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: 'var(--panel)' }}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowModal(false); setPendingPos(null) }} style={{
                background: 'transparent', color: 'var(--gray)', border: '1px solid rgba(255,255,255,.15)',
                padding: '10px 16px', borderRadius: 8, fontFamily: 'Heebo, sans-serif', fontSize: 14, cursor: 'pointer',
              }}>ביטול</button>
              <button onClick={saveNewCourt} style={{
                flex: 1, background: 'var(--green)', color: 'white', border: 'none',
                padding: '10px', borderRadius: 8, fontFamily: 'Heebo, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>✓ שמור מגרש</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
