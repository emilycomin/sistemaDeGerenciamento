import { Router, Response, Request } from 'express'
import { google } from 'googleapis'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

// Retorna a URL de autorização do Google (requer auth do app)
router.get('/auth-url', authMiddleware, (req: AuthRequest, res: Response) => {
  const oauth2Client = getOAuthClient()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: req.user!.id,
  })
  res.json({ url })
})

// Callback do Google (chamado pelo Google, sem auth do app)
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state: userId, error } = req.query
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  if (error || !code || !userId) {
    res.redirect(`${frontendUrl}/tasks?google=error`)
    return
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code as string)

    if (!tokens.refresh_token) {
      res.redirect(`${frontendUrl}/tasks?google=error&reason=no_refresh_token`)
      return
    }

    await prisma.user.update({
      where: { id: userId as string },
      data: { googleRefreshToken: tokens.refresh_token },
    })

    res.redirect(`${frontendUrl}/tasks?google=connected`)
  } catch {
    res.redirect(`${frontendUrl}/tasks?google=error`)
  }
})

// Status da conexão
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { googleRefreshToken: true },
  })
  res.json({ connected: !!user?.googleRefreshToken })
})

// Busca eventos do Google Calendar
router.get('/events', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { googleRefreshToken: true },
  })

  if (!user?.googleRefreshToken) {
    res.status(401).json({ error: 'Google Calendar não conectado' })
    return
  }

  const { start, end } = req.query
  const now = new Date()
  const timeMin = (start as string) || now.toISOString()
  const timeMax = (end as string) || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const oauth2Client = getOAuthClient()
    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 200,
    })

    const events = (response.data.items ?? []).map(e => ({
      id: e.id,
      title: e.summary ?? '(sem título)',
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      allDay: !e.start?.dateTime,
      location: e.location,
      description: e.description,
      htmlLink: e.htmlLink,
    }))

    res.json({ data: events })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    res.status(500).json({ error: 'Erro ao buscar eventos', details: message })
  }
})

// Desconectar
router.delete('/disconnect', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { googleRefreshToken: null },
  })
  res.json({ message: 'Google Calendar desconectado' })
})

export default router
