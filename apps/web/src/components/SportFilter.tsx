'use client'

export const SPORTS = [
  { id: 'all',        label: 'הכל',       emoji: '🏟️' },
  { id: 'football',   label: 'כדורגל',    emoji: '⚽' },
  { id: 'basketball', label: 'כדורסל',    emoji: '🏀' },
  { id: 'tennis',     label: 'טניס',      emoji: '🎾' },
  { id: 'volleyball', label: 'כדורעף',    emoji: '🏐' },
  { id: 'fitness',    label: 'כושר חוץ',  emoji: '🏋️' },
  { id: 'skate',      label: 'סקייטפארק', emoji: '🛹' },
]

export const SPORT_COLORS: Record<string, string> = {
  football:   '#25a866',
  basketball: '#e07b2a',
  tennis:     '#c8d42b',
  volleyball: '#2ab8e0',
  fitness:    '#2a7fe0',
  skate:      '#f5c518',
}

interface Props {
  selected: string
  onChange: (sport: string) => void
}

export default function SportFilter({ selected, onChange }: Props) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '8px 12px',
      background: 'rgba(15,31,21,.95)',
      borderBottom: '1px solid rgba(37,168,102,.2)',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {SPORTS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            borderRadius: 20,
            border: selected === s.id
              ? '1px solid var(--gl)'
              : '1px solid rgba(37,168,102,.2)',
            fontSize: 12,
            fontFamily: 'Heebo, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all .15s',
            background: selected === s.id ? 'var(--green)' : 'rgba(255,255,255,.04)',
            color: selected === s.id ? 'white' : 'var(--gray)',
          }}
        >
          <span>{s.emoji}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}
