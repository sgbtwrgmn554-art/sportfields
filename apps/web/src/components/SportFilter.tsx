'use client'

export type Category = 'sports' | 'water' | 'nature'

export const CATEGORIES = [
  { id: 'sports' as Category, label: 'ספורט',       emoji: '🏟️' },
  { id: 'water'  as Category, label: 'מים וחופים',  emoji: '🏖️' },
  { id: 'nature' as Category, label: 'טבע ופארקים', emoji: '🌳' },
]

export const SPORTS_BY_CATEGORY: Record<Category, { id: string; label: string; emoji: string }[]> = {
  sports: [
    { id: 'all',        label: 'הכל',        emoji: '🏟️' },
    { id: 'football',   label: 'כדורגל',     emoji: '⚽' },
    { id: 'basketball', label: 'כדורסל',     emoji: '🏀' },
    { id: 'tennis',     label: 'טניס',       emoji: '🎾' },
    { id: 'volleyball', label: 'כדורעף',     emoji: '🏐' },
    { id: 'fitness',    label: 'כושר חוץ',   emoji: '🏋️' },
    { id: 'skate',      label: 'סקייטפארק',  emoji: '🛹' },
    { id: 'padel',      label: 'פדל',        emoji: '🏸' },
    { id: 'pingpong',   label: 'פינג-פונג',  emoji: '🏓' },
    { id: 'pumptrack',  label: 'פאמפטרק',    emoji: '🚴' },
    { id: 'ninja',      label: 'נינג׳ה',     emoji: '🧗' },
  ],
  water: [
    { id: 'all',       label: 'הכל',        emoji: '🌊' },
    { id: 'beach',     label: 'חוף ים',     emoji: '🏖️' },
    { id: 'pool',      label: 'בריכה',      emoji: '🏊' },
    { id: 'surf',      label: 'גלישה',      emoji: '🏄' },
    { id: 'kayak',     label: 'קיאקים',     emoji: '🛶' },
    { id: 'waterpark', label: 'פארק מים',   emoji: '💦' },
  ],
  nature: [
    { id: 'all',     label: 'הכל',          emoji: '🌿' },
    { id: 'park',    label: 'פארק',         emoji: '🌳' },
    { id: 'hiking',  label: 'טיולים',       emoji: '🥾' },
    { id: 'cycling', label: 'אופניים',      emoji: '🚵' },
    { id: 'dog',     label: 'גינת כלבים',   emoji: '🐕' },
    { id: 'picnic',  label: 'פיקניק',       emoji: '🧺' },
  ],
}

export const SPORT_COLORS: Record<string, string> = {
  // sports
  football: '#25a866', basketball: '#e07b2a', tennis: '#c8d42b',
  volleyball: '#2ab8e0', fitness: '#2a7fe0', skate: '#f5c518',
  padel: '#e040a0', pingpong: '#40e0d0', pumptrack: '#ff6b35', ninja: '#9b59b6',
  // water
  beach: '#00bcd4', pool: '#2196f3', surf: '#03a9f4', kayak: '#0097a7', waterpark: '#26c6da',
  // nature
  park: '#4caf50', hiking: '#795548', cycling: '#ff9800', dog: '#a1887f', picnic: '#8bc34a',
}

interface Props {
  category: Category
  selected: string
  onCategoryChange: (c: Category) => void
  onChange: (sport: string) => void
}

export default function SportFilter({ category, selected, onCategoryChange, onChange }: Props) {
  const sports = SPORTS_BY_CATEGORY[category]

  return (
    <div style={{ background: 'rgba(15,31,21,.97)', borderBottom: '1px solid rgba(37,168,102,.2)', flexShrink: 0 }}>

      {/* קטגוריות ראשיות */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => { onCategoryChange(cat.id); onChange('all') }} style={{
            flex: 1, padding: '9px 6px', border: 'none', cursor: 'pointer',
            fontFamily: 'Heebo, sans-serif', fontSize: 12, fontWeight: 700,
            background: category === cat.id ? 'rgba(37,168,102,.18)' : 'transparent',
            color: category === cat.id ? 'var(--gl)' : 'var(--gray)',
            borderBottom: category === cat.id ? '2px solid var(--green)' : '2px solid transparent',
            transition: 'all .15s', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 5,
          }}>
            <span style={{ fontSize: 16 }}>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* פילטרי ספורט לפי קטגוריה */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 10px', overflowX: 'auto' }}>
        {sports.map((s) => (
          <button key={s.id} onClick={() => {
            if (selected === s.id && s.id !== 'all') return
            onChange(s.id)
          }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 11px', borderRadius: 20, whiteSpace: 'nowrap',
            fontFamily: 'Heebo, sans-serif', fontSize: 12, fontWeight: 600,
            cursor: selected === s.id && s.id !== 'all' ? 'default' : 'pointer',
            transition: 'all .15s',
            border: selected === s.id ? `2px solid ${SPORT_COLORS[s.id] || 'var(--gl)'}` : '1px solid rgba(255,255,255,.1)',
            background: selected === s.id ? `${SPORT_COLORS[s.id] || 'var(--green)'}22` : 'rgba(255,255,255,.04)',
            color: selected === s.id ? (SPORT_COLORS[s.id] || 'var(--gl)') : 'var(--gray)',
            transform: selected === s.id ? 'scale(1.05)' : 'scale(1)',
          }}>
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
