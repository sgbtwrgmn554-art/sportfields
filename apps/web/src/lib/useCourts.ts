'use client'
import { useState, useCallback, useRef } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface Bbox {
  minLat: number; maxLat: number
  minLng: number; maxLng: number
}

// טוען מגרשים לפי מסגרת המפה הנוכחית בלבד — הרבה יותר מהיר
export function useBboxCourts(sport: string) {
  const [courts, setCourts]   = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const lastBbox = useRef<string>('')

  const fetchByBbox = useCallback(async (bbox: Bbox) => {
    // מונע בקשות כפולות כשהמפה זזה מעט מאוד
    const key = `${bbox.minLat.toFixed(3)},${bbox.maxLat.toFixed(3)},${bbox.minLng.toFixed(3)},${bbox.maxLng.toFixed(3)},${sport}`
    if (key === lastBbox.current) return
    lastBbox.current = key

    setLoading(true)
    try {
      const params: Record<string, unknown> = { ...bbox, limit: 300 }
      if (sport !== 'all') params.sport = sport
      const { data } = await axios.get(`${API}/courts/bbox`, { params })
      setCourts(data)
    } catch (e) {
      console.error('bbox fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [sport])

  return { courts, loading, fetchByBbox }
}

// שמור גם את הישן לתאימות אחורה
export function useNearbyCourts(sport: string) {
  return useBboxCourts(sport)
}
