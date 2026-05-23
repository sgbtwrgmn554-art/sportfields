'use client'
import { useNearbyCourts } from '@/lib/useCourts'
import { SPORT_COLORS } from './SportFilter'

const SPORT_EMOJI: Record<string, string> = {
  basketball: '🏀', football: '⚽', tennis: '🎾',
  volleyball: '🏐', fitness: '🏋️', skate: '🛹',
}

interface Props { sport: string }

export default function CourtList({ sport }: Props) {
  const { courts, loading } = useNearbyCourts(sport)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 32 }}>⚽</div>
        <div>טוען מגרשים...</div>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {courts.map((court) => {
        const sport = court.sport_types?.[0] || 'football'
        const emoji = SPORT_EMOJI[sport] || '🏟️'
        const color = SPORT_COLORS[sport] || 'var(--gl)'

        return (
          <div
            key={court.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(37,168,102,.12)',
              cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,168,102,.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Emoji pin */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: color + '22', border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', marginBottom: 2 }}>
                {court.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                📍 {court.address || 'ישראל'}
              </div>
            </div>

            {/* Players badge */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: Number(court.active_players) > 0 ? 'var(--accent)' : 'var(--gray)',
              }}>
                {court.active_players || 0}
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray)' }}>שחקנים</div>
            </div>
          </div>
        )
      })}

      {courts.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 40 }}>🔍</div>
          <div>לא נמצאו מגרשים בסביבה</div>
        </div>
      )}
    </div>
  )
}
