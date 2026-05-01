import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()
router.use(authMiddleware)

router.get('/stats', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const rows = await prisma.contact.groupBy({
    by: ['status'],
    where: { teamId },
    _count: { _all: true },
  })
  const counts = { total: 0, LEAD: 0, PROSPECT: 0, CLIENT: 0, INACTIVE: 0 } as Record<string, number>
  for (const row of rows) {
    counts[row.status] = row._count._all
    counts.total += row._count._all
  }
  const conversionRate = counts.total > 0 ? Math.round((counts.CLIENT / counts.total) * 100) : 0
  res.json({ data: { ...counts, conversionRate } })
})

router.get('/', async (req: AuthRequest, res: Response) => {
  const q = req.query as Record<string, string>
  const search = q.search ?? ''
  const status = q.status ?? ''
  const page = Number(q.page ?? 1)
  const limit = Number(q.limit ?? 15)
  const skip = (page - 1) * limit

  const ALLOWED_SORT = ['name', 'company', 'lastContact', 'createdAt']
  const orderField = ALLOWED_SORT.includes(q.sortBy) ? q.sortBy : 'createdAt'
  const orderDir: 'asc' | 'desc' = q.sortOrder === 'asc' ? 'asc' : 'desc'

  const where: Record<string, unknown> = { teamId: req.user!.teamId }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, skip, take: limit, orderBy: { [orderField]: orderDir } }),
    prisma.contact.count({ where })
  ])

  res.json({ data: contacts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, email, phone, company, position, status, notes, tags, lastContact } = req.body
  if (!name) { res.status(400).json({ error: 'Nome é obrigatório' }); return }

  const contact = await prisma.contact.create({
    data: {
      name, email, phone, company, position, status, notes,
      tags: tags || [],
      lastContact: lastContact ? new Date(lastContact) : null,
      teamId: req.user!.teamId
    }
  })
  res.status(201).json({ data: contact })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const contact = await prisma.contact.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!contact) { res.status(404).json({ error: 'Contato não encontrado' }); return }
  res.json({ data: contact })
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!existing) { res.status(404).json({ error: 'Contato não encontrado' }); return }

  const { name, email, phone, company, position, status, notes, tags, lastContact } = req.body
  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: {
      name, email, phone, company, position, status, notes, tags,
      lastContact: lastContact ? new Date(lastContact) : null,
    }
  })
  res.json({ data: contact })
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!existing) { res.status(404).json({ error: 'Contato não encontrado' }); return }

  await prisma.contact.delete({ where: { id: req.params.id } })
  res.json({ message: 'Contato removido com sucesso' })
})

export default router
