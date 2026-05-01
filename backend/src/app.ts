import express from 'express'
import cors from 'cors'
import 'dotenv/config'

import authRoutes from './routes/auth'
import crmRoutes from './routes/crm'
import financeRoutes from './routes/finance'
import tasksRoutes from './routes/tasks'
import goalsRoutes from './routes/goals'
import servicesRoutes from './routes/services'
import googleRoutes from './routes/google'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/crm', crmRoutes)
app.use('/api/finance', financeRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/google', googleRoutes)

app.use(errorHandler)

export default app
