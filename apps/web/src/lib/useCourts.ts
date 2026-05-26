'use client'
import { useState, useCallback, useRef } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface Bbox {
  minLat: number; maxLat: number
  minLng: number; maxLng: number
}

// מה שייך לכל קטגוריה
export const CATEGORY_SPORTS: Record<string, string[]> = {
  sports: ['football','basketball','tennis','volleyball','fitness','skate','padel','pingpong','pumptrack','ninja'],
  water:  ['beach','pool','surf','kayak','waterpark'],
  nature: ['park','hiking','cycling','dog','picnic'],
}

export function useBboxCourts(sport: string, category?: string, ownerCode?: string, accessCode?: string) {
  const [courts, setCourts]   = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const lastBbox = useRef<string>('')

  const fetchByBbox = useCallback(async (bbox: Bbox) => {
    const key = `${bbox.minLat.toFixed(3)},${bbox.maxLat.toFixed(3)},${bbox.minLng.toFixed(3)},${bbox.maxLng.toFixed(3)},${sport},${category},${ownerCode ?? ''}`
    if (key === lastBbox.current) return
    lastBbox.current = key

    setLoading(true)
    try {
      const params: Record<string, unknown> = { ...bbox, limit: 300 }

      if (sport !== 'all') {
        // ספורט ספציפי נבחר
        params.sport = sport
      } else if (category && CATEGORY_SPORTS[category]) {
        // "הכל" בקטגוריה — מסנן לפי רשימת הספורטים של הקטגוריה
        params.sports = CATEGORY_SPORTS[category].join(',')
      }

      const headers: Record<string, string> = {}
      if (ownerCode)  headers['x-owner-code']  = ownerCode
      if (accessCode) headers['x-access-code'] = accessCode

      const { data } = await axios.get(`${API}/courts/bbox`, { params, headers })
      setCourts(data)
    } catch (e) {
      console.error('bbox fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [sport, category, ownerCode, accessCode])

  return { courts, loading, fetchByBbox }
}

export function useNearbyCourts(sport: string) {
  return useBboxCourts(sport)
}
