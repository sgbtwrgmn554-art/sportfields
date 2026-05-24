import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/pool'

const nearbyCourtsSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().default(5000), // meters
  sport: z.string().optional(),
})

const bboxSchema = z.object({
  minLat: z.coerce.number(),
  maxLat: z.coerce.number(),
  minLng: z.coerce.number(),
  maxLng: z.coerce.number(),
  sport: z.string().optional(),
  limit: z.coerce.number().default(300),
})

const addCourtSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  sport_types: z.array(z.string()).min(1),
})

export async function courtsRoutes(app: FastifyInstance) {

  // ── bbox endpoint — רק מה שנמצא בתוך מסגרת המפה הנוכחית ───────────────
  app.get('/courts/bbox', async (req) => {
    const q = bboxSchema.parse(req.query)
    const sportFilter = q.sport ? `AND $5 = ANY(c.sport_types)` : ''
    const params: unknown[] = [q.minLng, q.minLat, q.maxLng, q.maxLat]
    if (q.sport) params.push(q.sport)
    params.push(q.limit)

    const { rows } = await db.query(
      `SELECT
        c.id, c.name, c.address, c.sport_types, c.verified, c.photo_url,
        ST_X(c.location::geometry) as lng,
        ST_Y(c.location::geometry) as lat,
        COUNT(ci.id) FILTER (WHERE ci.checked_out_at IS NULL) as active_players
       FROM courts c
       LEFT JOIN checkins ci ON ci.court_id = c.id
       WHERE ST_X(c.location::geometry) BETWEEN $1 AND $3
         AND ST_Y(c.location::geometry) BETWEEN $2 AND $4
         ${sportFilter}
       GROUP BY c.id
       ORDER BY active_players DESC
       LIMIT $${params.length}`,
      params
    )
    return rows
  })

  // ── מגרשים קרובים + כמה שחקנים נמצאים שם ─────────────────────────────
  app.get('/courts/nearby', async (req) => {
    const query = nearbyCourtsSchema.parse(req.query)

    const sportFilter = query.sport
      ? `AND $4 = ANY(c.sport_types)`
      : ''

    const params: unknown[] = [query.lng, query.lat, query.radius]
    if (query.sport) params.push(query.sport)

    const { rows } = await db.query(
      `SELECT
        c.id, c.name, c.address, c.sport_types, c.verified,
        ST_X(c.location::geometry) as lng,
        ST_Y(c.location::geometry) as lat,
        ST_Distance(c.location, ST_MakePoint($1, $2)::geography) as distance,
        COUNT(ci.id) FILTER (WHERE ci.checked_out_at IS NULL) as active_players
      FROM courts c
      LEFT JOIN checkins ci ON ci.court_id = c.id
      WHERE ST_DWithin(c.location, ST_MakePoint($1, $2)::geography, $3)
      ${sportFilter}
      GROUP BY c.id
      ORDER BY distance`,
      params
    )

    return rows
  })

  // פרטי מגרש + מי שם עכשיו
  app.get('/courts/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const court = await db.query(
      `SELECT c.*, ST_X(c.location::geometry) as lng, ST_Y(c.location::geometry) as lat
       FROM courts c WHERE c.id = $1`,
      [id]
    )
    if (!court.rows[0]) return reply.status(404).send({ error: 'Court not found' })

    const checkins = await db.query(
      `SELECT u.id, u.name, u.avatar_url, ci.privacy, ci.checked_in_at
       FROM checkins ci
       JOIN users u ON u.id = ci.user_id
       WHERE ci.court_id = $1 AND ci.checked_out_at IS NULL`,
      [id]
    )

    return {
      ...court.rows[0],
      active_players: checkins.rows.map((p) =>
        p.privacy === 'anonymous'
          ? { id: null, name: 'שחקן אנונימי', avatar_url: null }
          : { id: p.id, name: p.name, avatar_url: p.avatar_url }
      ),
    }
  })

  // עדכון מיקום מגרש
  app.patch('/courts/:id/location', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { lat, lng } = req.body as { lat: number; lng: number }

    await db.query(
      `UPDATE courts SET location = ST_MakePoint($1, $2)::geography WHERE id = $3`,
      [lng, lat, id]
    )
    return { success: true }
  })

  // מחיקת מגרש — אדמין או יוצר המגרש
  app.delete('/courts/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const adminSecret = (req.headers as any)['x-admin-secret']
    const isAdmin = adminSecret && adminSecret === process.env.ADMIN_SECRET

    if (isAdmin) {
      const { rowCount } = await db.query('DELETE FROM courts WHERE id = $1', [id])
      if (!rowCount) return reply.status(404).send({ error: 'Court not found' })
      return { success: true }
    }

    // משתמש מחובר — יכול למחוק רק מגרשים שהוא הוסיף
    try {
      await req.jwtVerify()
      const userId = (req.user as any)?.userId
      const { rowCount } = await db.query(
        'DELETE FROM courts WHERE id = $1 AND added_by = $2', [id, userId]
      )
      if (!rowCount) return reply.status(403).send({ error: 'אין הרשאה למחיקה' })
      return { success: true }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  // דיווח על מגרש שגוי
  app.post('/courts/:id/report', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { reason } = (req.body as any) || {}

    // שמור בDB (נוסיף עמודה reports בעתיד) — כרגע רק log
    console.log(`[REPORT] court=${id} reason=${reason}`)

    // סמן את המגרש כ-unverified אם יש מספיק דיווחים
    await db.query(
      `UPDATE courts SET verified = false WHERE id = $1 AND verified = true
       -- רק אם כבר היה verified, פשוט מסמן לבדיקה`,
      [id]
    ).catch(() => {})

    return { success: true, message: 'הדיווח התקבל — תודה!' }
  })

  // הוספת מגרש חדש (crowdsource)
  app.post('/courts', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = addCourtSchema.parse(req.body)
    const userId = (req.user as { userId: string }).userId

    const { rows } = await db.query(
      `INSERT INTO courts (name, address, location, sport_types, added_by)
       VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6)
       RETURNING id, name, address, sport_types`,
      [body.name, body.address, body.lng, body.lat, body.sport_types, userId]
    )

    return reply.status(201).send(rows[0])
  })
}
