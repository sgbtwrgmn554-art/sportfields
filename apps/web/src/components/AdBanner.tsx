'use client'
import { useEffect, useRef } from 'react'

interface Props {
  slot: string    // מספר slot מ-Google AdSense
  format?: 'banner' | 'rectangle'  // סוג הפרסומת
}

declare global {
  interface Window { adsbygoogle: any[] }
}

/**
 * AdBanner — פרסומת Google AdSense
 *
 * שלבים לפעילות:
 * 1. נרשם ב-https://adsense.google.com
 * 2. מקבל Publisher ID (ca-pub-XXXXXXXXXX)
 * 3. מחליף את NEXT_PUBLIC_ADSENSE_CLIENT ב-.env.local
 * 4. יוצר Ad Unit ב-AdSense ומקבל data-ad-slot
 */
export default function AdBanner({ slot, format = 'banner' }: Props) {
  const adRef  = useRef<HTMLDivElement>(null)
  const pushed = useRef(false)

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (pushed.current || !clientId) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {}
  }, [clientId])

  // אם אין עדיין client ID — מציג placeholder בצבע כהה
  if (!clientId) {
    return (
      <div style={{
        width: '100%',
        height: format === 'banner' ? 60 : 250,
        background: 'rgba(255,255,255,.04)',
        border: '1px dashed rgba(37,168,102,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: 'rgba(255,255,255,.25)',
        fontFamily: 'Heebo, sans-serif', flexShrink: 0,
      }}>
        📢 מיקום פרסומת — AdSense יופעל לאחר אישור
      </div>
    )
  }

  return (
    <div ref={adRef} style={{ display: 'block', textAlign: 'center', flexShrink: 0 }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: format === 'banner' ? 60 : 250 }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format === 'banner' ? 'horizontal' : 'rectangle'}
        data-full-width-responsive="true"
      />
    </div>
  )
}
