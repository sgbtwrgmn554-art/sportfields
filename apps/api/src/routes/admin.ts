import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/pool'

const updateCourtSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  sport_types: z.array(z.string()).min(1).optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  verified: z.boolean().optional(),
})

const addCourtSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  sport_types: z.array(z.string()).min(1),
  city: z.string().optional(),
  notes: z.string().optional(),
})

// בדיקת ADMIN_SECRET מה-header
async function adminGuard(req: any, reply: any) {
  const secret = req.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // רשימת כל המגרשים (עם pagination)
  app.get('/admin/courts', { preHandler: [adminGuard] }, async (req) => {
    const { page = '1', limit = '50', city, sport, search } = req.query as Record<string, string>
    const offset = (Number(page) - 1) * Number(limit)

    const conditions: string[] = []
    const params: unknown[] = []

    if (city) {
      params.push(city)
      conditions.push(`c.city = $${params.length}`)
    }
    if (sport) {
      params.push(sport)
      conditions.push(`$${params.length} = ANY(c.sport_types)`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(c.name ILIKE $${params.length} OR c.address ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    params.push(Number(limit), offset)
    const { rows } = await db.query(
      `SELECT
        c.id, c.name, c.address, c.city, c.sport_types, c.verified, c.notes,
        ST_X(c.location::geometry) as lng,
        ST_Y(c.location::geometry) as lat,
        c.created_at
       FROM courts c
       ${where}
       ORDER BY c.city, c.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    const countRes = await db.query(
      `SELECT COUNT(*) FROM courts c ${where}`,
      params.slice(0, -2)
    )

    return {
      courts: rows,
      total: Number(countRes.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    }
  })

  // עדכון מגרש (מיקום, שם, ספורט, עיר)
  app.patch('/admin/courts/:id', { preHandler: [adminGuard] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateCourtSchema.parse(req.body)

    const sets: string[] = []
    const params: unknown[] = []

    if (body.name !== undefined) { params.push(body.name); sets.push(`name = $${params.length}`) }
    if (body.address !== undefined) { params.push(body.address); sets.push(`address = $${params.length}`) }
    if (body.city !== undefined) { params.push(body.city); sets.push(`city = $${params.length}`) }
    if (body.notes !== undefined) { params.push(body.notes); sets.push(`notes = $${params.length}`) }
    if (body.sport_types !== undefined) { params.push(body.sport_types); sets.push(`sport_types = $${params.length}`) }
    if (body.verified !== undefined) { params.push(body.verified); sets.push(`verified = $${params.length}`) }
    if (body.lat !== undefined && body.lng !== undefined) {
      params.push(body.lng, body.lat)
      sets.push(`location = ST_MakePoint($${params.length - 1}, $${params.length})::geography`)
    }

    if (sets.length === 0) return reply.status(400).send({ error: 'No fields to update' })

    params.push(id)
    const { rows } = await db.query(
      `UPDATE courts SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, name, address, city, sport_types, verified`,
      params
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Court not found' })
    return rows[0]
  })

  // מחיקת מגרש
  app.delete('/admin/courts/:id', { preHandler: [adminGuard] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { rowCount } = await db.query('DELETE FROM courts WHERE id = $1', [id])
    if (!rowCount) return reply.status(404).send({ error: 'Court not found' })
    return { success: true }
  })

  // הוספת מגרש חדש (ידני)
  app.post('/admin/courts', { preHandler: [adminGuard] }, async (req, reply) => {
    const body = addCourtSchema.parse(req.body)

    const { rows } = await db.query(
      `INSERT INTO courts (name, address, location, sport_types, city, notes, verified)
       VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, true)
       RETURNING id, name, address, city, sport_types`,
      [body.name, body.address ?? null, body.lng, body.lat, body.sport_types, body.city ?? null, body.notes ?? null]
    )

    return reply.status(201).send(rows[0])
  })

  // סטטיסטיקות לפי עיר
  app.get('/admin/stats', { preHandler: [adminGuard] }, async () => {
    const { rows } = await db.query(
      `SELECT
        city,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE verified) as verified,
        array_agg(DISTINCT unnest_sports) as sports
       FROM courts, unnest(sport_types) as unnest_sports
       GROUP BY city
       ORDER BY total DESC`
    )
    return rows
  })
}
