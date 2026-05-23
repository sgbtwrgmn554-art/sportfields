'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useNearbyCourts(sport: string) {
  const [courts, setCourts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserLocation({ lat, lng })

        const params: Record<string, unknown> = { lat, lng, radius: 5000 }
        if (sport !== 'all') params.sport = sport

        const { data } = await axios.get(`${API}/courts/nearby`, { params })
        setCourts(data)
        setLoading(false)
      },
      () => {
        // fallback — תל אביב
        setUserLocation({ lat: 32.08, lng: 34.78 })
        setLoading(false)
      }
    )
  }, [sport])

  return { courts, loading, userLocation }
}
