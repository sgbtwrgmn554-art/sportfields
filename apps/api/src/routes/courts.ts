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
  sport:  z.string().optional(),        // סוג בודד
  sports: z.string().optional(),        // רשימה מופרדת בפסיקים (לפי קטגוריה)
  limit:  z.coerce.number().default(300),
})

const addCourtSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  sport_types: z.array(z.string()).min(1),
  is_private: z.boolean().optional(),
  trail_km: z.number().optional(),
  trail_minutes: z.number().int().optional(),
  trail_difficulty: z.enum(['easy','medium','hard']).optional(),
  payment_token: z.string().optional(), // לאנטי-ספאם
})

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const OWNER_CODE = process.env.OWNER_CODE || 'OWNER2026'

export async function courtsRoutes(app: FastifyInstance) {

  // ── bbox endpoint — רק מה שנמצא בתוך מסגרת המפה הנוכחית ───────────────
  app.get('/courts/bbox', async (req) => {
    const q = bboxSchema.parse(req.query)
    // בנה פילטר ספורט
    let sportFilter = ''
    const params: unknown[] = [q.minLng, q.minLat, q.maxLng, q.maxLat]

    if (q.sport) {
      // סוג בודד
      sportFilter = `AND $5 = ANY(c.sport_types)`
      params.push(q.sport)
    } else if (q.sports) {
      // רשימת סוגים (קטגוריה)
      const list = q.sports.split(',').map(s => s.trim()).filter(Boolean)
      sportFilter = `AND c.sport_types && $5`
      params.push(list)
    }
    params.push(q.limit)

    const ownerCode = (req.headers as any)['x-owner-code']
    const accessCode = (req.headers as any)['x-access-code']
    const isOwner = ownerCode === OWNER_CODE

    // בעלים רואה הכל; אחרים רואים רק ציבורי + מה שיש להם קוד אליו
    const privateFilter = isOwner
      ? ''
      : accessCode
        ? `AND (c.is_private = false OR c.access_code = '${accessCode.replace(/'/g,"''")}')`
        : `AND (c.is_private = false OR c.is_private IS NULL)`

    const { rows } = await db.query(
      `SELECT
        c.id, c.name, c.address, c.sport_types, c.verified, c.photo_url,
        c.is_private, c.access_code, c.trail_km, c.trail_minutes, c.trail_difficulty,
        ST_X(c.location::geometry) as lng,
        ST_Y(c.location::geometry) as lat,
        COUNT(ci.id) FILTER (WHERE ci.checked_out_at IS NULL) as active_players
       FROM courts c
       LEFT JOIN checkins ci ON ci.court_id = c.id
       WHERE ST_X(c.location::geometry) BETWEEN $1 AND $3
         AND ST_Y(c.location::geometry) BETWEEN $2 AND $4
         ${sportFilter}
         ${privateFilter}
       GROUP BY c.id
       ORDER BY active_players DESC
       LIMIT $${params.length}`,
      params
    )
    // אם פרטי ולא בעלים — מסתיר את הקוד עצמו
    return rows.map(r => isOwner ? r : { ...r, access_code: r.is_private ? '••••••' : null })
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

  // תיקון סוג ספורט — crowdsource (כל משתמש יכול לתקן)
  app.patch('/courts/:id/sport', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { sport_type } = req.body as { sport_type: string }
    const validSports = ['football','basketball','tennis','volleyball','fitness','skate','padel','pingpong','pumptrack','ninja']
    if (!validSports.includes(sport_type))
      return reply.status(400).send({ error: 'סוג ספורט לא תקין' })
    await db.query('UPDATE courts SET sport_types = $1 WHERE id = $2', [[sport_type], id])
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

  // דירוג מגרש ⭐
  app.post('/courts/:id/rate', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { rating } = req.body as { rating: number }
    if (!rating || rating < 1 || rating > 5) return reply.status(400).send({ error: 'דירוג לא תקין' })

    let userId: string | null = null
    try { await req.jwtVerify(); userId = (req.user as any)?.userId } catch {}

    if (userId) {
      // משתמש מחובר — שמור דירוג אישי (פעם אחת לכל מגרש)
      await db.query(
        `INSERT INTO court_ratings (court_id, user_id, rating)
         VALUES ($1, $2, $3)
         ON CONFLICT (court_id, user_id) DO UPDATE SET rating = $3`,
        [id, userId, rating]
      )
      // עדכן סיכום
      const { rows } = await db.query(
        `SELECT COALESCE(SUM(rating),0) as s, COUNT(*) as c FROM court_ratings WHERE court_id = $1`, [id]
      )
      await db.query(`UPDATE courts SET rating_sum=$1, rating_count=$2 WHERE id=$3`,
        [rows[0].s, rows[0].c, id])
    } else {
      // אנונימי — סתם מוסיף לסכום
      await db.query(
        `UPDATE courts SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE id = $2`,
        [rating, id]
      )
    }
    const { rows } = await db.query(`SELECT rating_sum, rating_count FROM courts WHERE id=$1`, [id])
    const avg = rows[0].rating_count > 0 ? (rows[0].rating_sum / rows[0].rating_count).toFixed(1) : null
    return { success: true, avg, count: rows[0].rating_count }
  })

  // Leaderboard — שחקנים הכי פעילים
  app.get('/leaderboard', async () => {
    const { rows } = await db.query(
      `SELECT u.id, u.name,
        COUNT(ci.id) as checkin_count,
        CASE
          WHEN COUNT(ci.id) >= 50 THEN '🏆 אלוף'
          WHEN COUNT(ci.id) >= 20 THEN '⭐ מקצוען'
          WHEN COUNT(ci.id) >= 10 THEN '🔥 סדיר'
          WHEN COUNT(ci.id) >= 3  THEN '🌱 מתחיל'
          ELSE '👋 חדש'
        END as badge
       FROM users u
       JOIN checkins ci ON ci.user_id = u.id
       GROUP BY u.id, u.name
       ORDER BY checkin_count DESC
       LIMIT 20`
    )
    return rows
  })

  // הוספת מגרש חדש (crowdsource)
  app.post('/courts', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = addCourtSchema.parse(req.body)
    const userId = (req.user as { userId: string }).userId

    // ── אנטי-ספאם: בדוק כמה הוסיף היום ────────────────────────
    const todayCount = await db.query(
      `SELECT COUNT(*) FROM courts WHERE added_by = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    )
    const count = parseInt(todayCount.rows[0].count)
    if (count >= 5) {
      return reply.status(429).send({ error: 'הגעת למגבלה — ניתן להוסיף עד 5 מקומות ביום' })
    }

    // ── מקום פרטי — יצירת קוד גישה ────────────────────────────
    const accessCode = body.is_private ? generateCode() : null

    const { rows } = await db.query(
      `INSERT INTO courts
         (name, address, location, sport_types, added_by,
          is_private, access_code, trail_km, trail_minutes, trail_difficulty)
       VALUES ($1,$2,ST_MakePoint($3,$4)::geography,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, name, address, sport_types, is_private, access_code`,
      [
        body.name, body.address, body.lng, body.lat, body.sport_types, userId,
        body.is_private ?? false, accessCode,
        body.trail_km ?? null, body.trail_minutes ?? null, body.trail_difficulty ?? null,
      ]
    )

    return reply.status(201).send(rows[0])
  })

  // בדיקת קוד גישה למקום פרטי
  app.get('/courts/:id/verify-code', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { code } = req.query as { code: string }
    const ownerCode = (req.headers as any)['x-owner-code']

    if (ownerCode === OWNER_CODE) return { valid: true, isOwner: true }

    const { rows } = await db.query(
      `SELECT access_code FROM courts WHERE id = $1 AND is_private = true`, [id]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'לא נמצא' })
    const valid = rows[0].access_code === code?.toUpperCase()
    return { valid }
  })
}
