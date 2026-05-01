import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { type, status } = req.query
  const where: Record<string, unknown> = { teamId: req.user!.teamId, parentId: null }
  if (type) where.type = type
  if (status) where.status = status

  const goals = await prisma.goal.findMany({
    where,
    include: { children: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ data: goals })
})

router.get('/mission-vision', async (req: AuthRequest, res: Response) => {
  const team = await prisma.team.findUnique({
    where: { id: req.user!.teamId },
    select: { mission: true, vision: true, values: true, name: true }
  })
  res.json({ data: team })
})

router.put('/mission-vision', async (req: AuthRequest, res: Response) => {
  const { mission, vision, values } = req.body
  const team = await prisma.team.update({
    where: { id: req.user!.teamId },
    data: { mission, vision, values },
    select: { mission: true, vision: true, values: true, name: true }
  })
  res.json({ data: team })
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, type, status, deadline, parentId } = req.body
  if (!title || !type) { res.status(400).json({ error: 'Título e tipo são obrigatórios' }); return }

  const goal = await prisma.goal.create({
    data: { title, description, type, status, deadline: deadline ? new Date(deadline) : undefined, parentId, teamId: req.user!.teamId }
  })
  res.status(201).json({ data: goal })
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.goal.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!existing) { res.status(404).json({ error: 'Meta não encontrada' }); return }

  const { title, description, type, status, progress, deadline } = req.body
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { title, description, type, status, progress, deadline: deadline ? new Date(deadline) : undefined }
  })
  res.json({ data: goal })
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.goal.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!existing) { res.status(404).json({ error: 'Meta não encontrada' }); return }

  await prisma.goal.delete({ where: { id: req.params.id } })
  res.json({ message: 'Meta removida com sucesso' })
})

export default router
