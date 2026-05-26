import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/pool'
import { sendPushNotifications } from '../lib/push'

const CHECKIN_RADIUS_METERS = 150

const checkinSchema = z.object({
  court_id: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  privacy: z.enum(['public', 'friends', 'anonymous', 'hidden']).default('public'),
})

export async function checkinsRoutes(app: FastifyInstance) {
  app.post('/checkins', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = checkinSchema.parse(req.body)
    const userId = (req.user as { userId: string }).userId

    // אימות GPS — המשתמש חייב להיות בטווח 150 מטר מהמגרש
    const { rows: distRows } = await db.query(
      `SELECT ST_Distance(location, ST_MakePoint($1, $2)::geography) as distance
       FROM courts WHERE id = $3`,
      [body.lng, body.lat, body.court_id]
    )

    if (!distRows[0]) return reply.status(404).send({ error: 'Court not found' })
    if (distRows[0].distance > CHECKIN_RADIUS_METERS) {
      return reply.status(400).send({
        error: `אתה נמצא ${Math.round(distRows[0].distance)} מטר מהמגרש. צריך להיות בטווח ${CHECKIN_RADIUS_METERS} מטר לביצוע Check-in`,
      })
    }

    // Check-out מכל מגרש פעיל קודם
    await db.query(
      `UPDATE checkins SET checked_out_at = now()
       WHERE user_id = $1 AND checked_out_at IS NULL`,
      [userId]
    )

    const { rows } = await db.query(
      `INSERT INTO checkins (user_id, court_id, privacy)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, body.court_id, body.privacy]
    )

    // ─── שלח Push Notifications לאוהדי המגרש ─────────────────────────────
    // (אסינכרוני — לא חוסם את התשובה)
    sendCheckinNotifications(body.court_id, userId).catch(err =>
      console.error('[Push] שגיאה בשליחת התראות:', err)
    )

    return reply.status(201).send(rows[0])
  })

  // ─── Active players endpoint ──────────────────────────────────────────
  app.get('/checkins/active/:courtId', async (req) => {
    const { courtId } = req.params as { courtId: string }
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.avatar_url, c.privacy, c.checked_in_at
       FROM checkins c
       JOIN users u ON u.id = c.user_id
       WHERE c.court_id = $1 AND c.checked_out_at IS NULL
       ORDER BY c.checked_in_at ASC`,
      [courtId]
    )
    return rows
  })

  // Check-out (DELETE)
  app.delete('/checkins/active', { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as { userId: string }).userId
    await db.query(`UPDATE checkins SET checked_out_at = now() WHERE user_id = $1 AND checked_out_at IS NULL`, [userId])
    return { success: true }
  })

  // Check-out (POST alias — נוח לפרונטאנד)
  app.post('/checkins/checkout', { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as { userId: string }).userId
    await db.query(`UPDATE checkins SET checked_out_at = now() WHERE user_id = $1 AND checked_out_at IS NULL`, [userId])
    return { success: true }
  })
}

// ─── Helper: שלח Push לכל מי שהמגרש אצלו במועדפים ────────────────────────
async function sendCheckinNotifications(courtId: string, checkinUserId: string): Promise<void> {
  // מצא שם המגרש + מספר שחקנים פעילים
  const { rows: courtRows } = await db.query(
    `SELECT c.name,
            (SELECT COUNT(*) FROM checkins ch WHERE ch.court_id = c.id AND ch.checked_out_at IS NULL) as active_count
     FROM courts c WHERE c.id = $1`,
    [courtId]
  )
  if (!courtRows[0]) return

  const { name: courtName, active_count } = courtRows[0]
  const count = Number(active_count)

  // שלח רק כשיש 1, 3, 5 שחקנים (לא על כל check-in)
  const notifyAt = [1, 3, 5]
  if (!notifyAt.includes(count)) return

  // מצא את כל המשתמשים שהמגרש הזה אצלם במועדפים + יש להם push_token
  // למעט המשתמש שזה עתה עשה check-in
  const { rows: users } = await db.query(
    `SELECT u.push_token
     FROM user_favorites uf
     JOIN users u ON u.id = uf.user_id
     WHERE uf.court_id = $1
       AND uf.user_id != $2
       AND u.push_token IS NOT NULL`,
    [courtId, checkinUserId]
  )

  if (users.length === 0) return

  const emoji = count === 1 ? '🏃' : count === 3 ? '🔥' : '🔥🔥'
  const messages = users.map(u => ({
    to: u.push_token as string,
    title: `${emoji} ${courtName}`,
    body: `יש עכשיו ${count} שחקן${count > 1 ? 'ים' : ''} במגרש — בוא לשחק!`,
    data: { courtId },
    sound: 'default' as const,
  }))

  await sendPushNotifications(messages)
  console.log(`[Push] נשלחו ${messages.length} התראות על ${courtName} (${count} שחקנים)`)
}
