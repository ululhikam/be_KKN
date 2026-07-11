import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

dotenv.config()

// Force watch reload to load new env credentials
const app = express()
const PORT = process.env.PORT || 3001
const isDev = process.env.NODE_ENV !== 'production'

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isDev ? false : undefined
}))

// CORS — hardcoded production origins + env overrides
const defaultOrigins = [
  'http://localhost:5173',
  'https://kknmenggah.vercel.app',
]
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : []
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])]

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin) return callback(null, true)
    // Allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi dalam 15 menit' }
})

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi dalam 1 jam' }
})

app.use('/api/', limiter)
app.use('/api/auth/login', authLimiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(morgan(isDev ? 'dev' : 'combined'))

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'KKN Padepokan API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  })
})

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api', routes)

// ─── Error Handling ────────────────────────────────────────────────────────
app.use(notFoundHandler as any)
app.use(errorHandler as any)

// ─── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🏛️  KKN Padepokan Backend API       ║
  ║   Running on port: ${PORT}                ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}          ║
  ╚═══════════════════════════════════════╝
  `)
})

export default app
