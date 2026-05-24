import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { courtsRoutes } from './routes/courts'
import { checkinsRoutes } from './routes/checkins'
import { adminRoutes } from './routes/admin'

const app = Fastify({ logger: true })

// JWT authenticate decorator
app.decorate('authenticate', async (req: any, reply: any) => {
  try {
    await req.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

async function main() {
  await app.register(cors, { origin: true })
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' })

  await app.register(authRoutes)
  await app.register(courtsRoutes)
  await app.register(checkinsRoutes)
  await app.register(adminRoutes)

  app.get('/health', () => ({ status: 'ok' }))

  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
}

main()
