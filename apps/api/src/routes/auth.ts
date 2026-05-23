import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { db } from '../db/pool'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const body = registerSchema.parse(req.body)
    const hash = await bcrypt.hash(body.password, 10)

    const { rows } = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [body.name, body.email, hash]
    )

    const token = app.jwt.sign({ userId: rows[0].id })
    return reply.status(201).send({ user: rows[0], token })
  })

  app.post('/auth/login', async (req, reply) => {
    const body = loginSchema.parse(req.body)

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [body.email])
    if (!rows[0]) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.password, rows[0].password_hash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = app.jwt.sign({ userId: rows[0].id })
    return { user: { id: rows[0].id, name: rows[0].name, email: rows[0].email }, token }
  })
}
