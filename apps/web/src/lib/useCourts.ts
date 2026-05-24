'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// מרכז ישראל בערך — מכסה את כל הארץ בטווח 500 ק"מ
const ISRAEL_CENTER = { lat: 31.5, lng: 34.9 }
const ISRAEL_RADIUS = 500_000 // 500 ק"מ — כל ישראל

async function fetchCourts(lat: number, lng: number, sport: string) {
  const params: Record<string, unknown> = { lat, lng, radius: ISRAEL_RADIUS }
  if (sport !== 'all') params.sport = sport
  const { data } = await axios.get(`${API}/courts/nearby`, { params })
  return data
}

export function useNearbyCourts(sport: string) {
  const [courts, setCourts]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLocation({ lat, lng })
        try {
          const data = await fetchCourts(lat, lng, sport)
          if (!cancelled) setCourts(data)
        } catch (e) {
          console.error('fetchCourts error', e)
        } finally {
          if (!cancelled) setLoading(false)
        }
      },
      async () => {
        // Fallback — GPS נדחה, מביאים מכל ישראל
        if (cancelled) return
        setUserLocation(ISRAEL_CENTER)
        try {
          const data = await fetchCourts(ISRAEL_CENTER.lat, ISRAEL_CENTER.lng, sport)
          if (!cancelled) setCourts(data)
        } catch (e) {
          console.error('fetchCourts fallback error', e)
        } finally {
          if (!cancelled) setLoading(false)
        }
      },
      { timeout: 5000 }
    )

    return () => { cancelled = true }
  }, [sport])

  return { courts, loading, userLocation }
}
