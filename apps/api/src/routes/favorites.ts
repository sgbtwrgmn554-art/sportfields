import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/pool'
import { isValidExpoPushToken } from '../lib/push'

const pushTokenSchema = z.object({
  token: z.string().min(10),
})

export async function favoritesRoutes(app: FastifyInstance) {
  // ─── שמירת Push Token ──────────────────────────────────────────────────
  app.put('/users/push-token', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { token } = pushTokenSchema.parse(req.body)
    const userId = (req.user as { userId: string }).userId

    if (!isValidExpoPushToken(token)) {
      return reply.status(400).send({ error: 'Invalid Expo push token' })
    }

    await db.query('UPDATE users SET push_token = $1 WHERE id = $2', [token, userId])
    return { success: true }
  })

  // ─── קבלת מועדפים ──────────────────────────────────────────────────────
  app.get('/favorites', { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as { userId: string }).userId
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.address,
              ST_Y(c.location::geometry) as lat, ST_X(c.location::geometry) as lng,
              c.sport_types, c.verified,
              (SELECT COUNT(*) FROM checkins ch WHERE ch.court_id = c.id AND ch.checked_out_at IS NULL) as active_players
       FROM user_favorites uf
       JOIN courts c ON c.id = uf.court_id
       WHERE uf.user_id = $1
       ORDER BY uf.created_at DESC`,
      [userId]
    )
    return rows
  })

  // ─── הוסף מועדף ────────────────────────────────────────────────────────
  app.post('/favorites/:courtId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as { userId: string }).userId
    const { courtId } = req.params as { courtId: string }

    await db.query(
      'INSERT INTO user_favorites (user_id, court_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, courtId]
    )
    return reply.status(201).send({ success: true })
  })

  // ─── הסר מועדף ─────────────────────────────────────────────────────────
  app.delete('/favorites/:courtId', { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as { userId: string }).userId
    const { courtId } = req.params as { courtId: string }

    await db.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND court_id = $2',
      [userId, courtId]
    )
    return { success: true }
  })

  // ─── בדוק אם מועדף ─────────────────────────────────────────────────────
  app.get('/favorites/:courtId/check', { preHandler: [app.authenticate] }, async (req) => {
    const userId = (req.user as { userId: string }).userId
    const { courtId } = req.params as { courtId: string }

    const { rows } = await db.query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND court_id = $2',
      [userId, courtId]
    )
    return { isFavorite: rows.length > 0 }
  })
}
