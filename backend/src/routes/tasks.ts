import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, priority, assigneeId, page = 1, limit = 50 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where: Record<string, unknown> = { teamId: req.user!.teamId }
  if (status) where.status = status
  if (priority) where.priority = priority
  if (assigneeId) where.assigneeId = assigneeId

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where, skip, take: Number(limit),
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } }, creator: { select: { id: true, name: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.task.count({ where })
  ])

  res.json({ data: tasks, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, status, priority, dueDate, scheduledStart, assigneeId } = req.body
  if (!title) { res.status(400).json({ error: 'Título é obrigatório' }); return }

  const task = await prisma.task.create({
    data: { title, description, status, priority, dueDate: dueDate ? new Date(dueDate) : undefined, scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined, assigneeId, creatorId: req.user!.id, teamId: req.user!.teamId },
    include: { assignee: { select: { id: true, name: true, avatarUrl: true } } }
  })
  res.status(201).json({ data: task })
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!existing) { res.status(404).json({ error: 'Tarefa não encontrada' }); return }

  const { title, description, status, priority, dueDate, scheduledStart, assigneeId } = req.body
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { title, description, status, priority, dueDate: dueDate ? new Date(dueDate) : undefined, scheduledStart: scheduledStart !== undefined ? (scheduledStart ? new Date(scheduledStart) : null) : undefined, assigneeId },
    include: { assignee: { select: { id: true, name: true, avatarUrl: true } } }
  })
  res.json({ data: task })
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, teamId: req.user!.teamId } })
  if (!existing) { res.status(404).json({ error: 'Tarefa não encontrada' }); return }

  await prisma.task.delete({ where: { id: req.params.id } })
  res.json({ message: 'Tarefa removida com sucesso' })
})

export default router
