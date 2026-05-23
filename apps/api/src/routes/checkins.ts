import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/pool'

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

    return reply.status(201).send(rows[0])
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
