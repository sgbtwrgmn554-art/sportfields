/**
 * שולח Push Notifications דרך Expo Push API
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

interface ExpoPushMessage {
  to: string | string[]
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return

  // Expo מגביל 100 הודעות בבקשה אחת — חלק ל-chunks
  const chunks: ExpoPushMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      })

      const result = await response.json() as { data: ExpoPushTicket[] }

      // לוג שגיאות אם יש
      for (const ticket of result.data ?? []) {
        if (ticket.status === 'error') {
          console.error('[Push] שגיאת שליחה:', ticket.message, ticket.details)
        }
      }
    } catch (err) {
      console.error('[Push] שגיאת רשת:', err)
    }
  }
}

export function isValidExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
}
