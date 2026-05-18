import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import aiRoutes from './routes/ai.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173'
  ]
})

await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute'
})

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }
})

app.register(aiRoutes, { prefix: '/api/v1/ai' })

app.get('/health', () => ({ status: 'ok' }))

const port = parseInt(process.env.PORT || '3000', 10)
const host = process.env.HOST || '0.0.0.0'

try {
  await app.listen({ port, host })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
