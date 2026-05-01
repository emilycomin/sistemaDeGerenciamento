import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()
router.use(authMiddleware)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRange(q: Record<string, string>) {
  const now = new Date()
  const dateFrom = q.dateFrom ? new Date(q.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1)
  const dateTo   = q.dateTo   ? new Date(q.dateTo + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return { dateFrom, dateTo }
}

// ─── GET / — listar transações (com filtro de período) ───────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  const q      = req.query as Record<string, string>
  const page   = Number(q.page  ?? 1)
  const limit  = Number(q.limit ?? 100)
  const skip   = (page - 1) * limit
  const { dateFrom, dateTo } = parseRange(q)

  const where: Record<string, unknown> = {
    teamId: req.user!.teamId,
    date: { gte: dateFrom, lte: dateTo },
  }
  if (q.type)     where.type     = q.type
  if (q.status)   where.status   = q.status
  if (q.category) where.category = q.category

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
    prisma.transaction.count({ where })
  ])

  res.json({ data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

// ─── GET /monthly — dados mensais p/ gráfico ─────────────────────────────────

router.get('/monthly', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const q      = req.query as Record<string, string>
  const months = Math.min(Number(q.months ?? 6), 24)
  const now    = new Date()
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const data = await Promise.all(
    Array.from({ length: months }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      return Promise.all([
        prisma.transaction.aggregate({ where: { teamId, type: 'INCOME',  date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { teamId, type: 'EXPENSE', date: { gte: start, lte: end } }, _sum: { amount: true } }),
      ]).then(([inc, exp]) => ({
        month:   MONTH_NAMES[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? `/${String(d.getFullYear()).slice(2)}` : ''),
        receita: inc._sum.amount ?? 0,
        despesa: exp._sum.amount ?? 0,
      }))
    })
  )

  res.json({ data })
})

// ─── GET /summary — resumo financeiro ────────────────────────────────────────

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const now    = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [income, expenses] = await Promise.all([
    prisma.transaction.aggregate({
      where: { teamId, type: 'INCOME',  date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { teamId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
  ])

  // Lê metas financeiras via SQL direto (contorna regeneração do Prisma Client)
  const teamGoals = await prisma.$queryRaw<{ revenueGoal: number | null; expenseLimit: number | null }[]>`
    SELECT "revenueGoal", "expenseLimit" FROM "Team" WHERE id = ${teamId}
  `
  const goals = teamGoals[0] ?? { revenueGoal: null, expenseLimit: null }

  const totalIncome   = income._sum.amount  ?? 0
  const totalExpenses = expenses._sum.amount ?? 0

  res.json({
    data: {
      income:       totalIncome,
      expenses:     totalExpenses,
      balance:      totalIncome - totalExpenses,
      revenueGoal:  goals.revenueGoal,
      expenseLimit: goals.expenseLimit,
    }
  })
})

// ─── PUT /goals — salvar metas financeiras ────────────────────────────────────

router.put('/goals', async (req: AuthRequest, res: Response) => {
  const teamId      = req.user!.teamId
  const revenueGoal  = req.body.revenueGoal  ? Number(req.body.revenueGoal)  : null
  const expenseLimit = req.body.expenseLimit ? Number(req.body.expenseLimit) : null

  await prisma.$executeRaw`
    UPDATE "Team"
    SET "revenueGoal"  = ${revenueGoal}::double precision,
        "expenseLimit" = ${expenseLimit}::double precision,
        "updatedAt"    = NOW()
    WHERE id = ${teamId}
  `

  res.json({ data: { revenueGoal, expenseLimit } })
})

// ─── POST / — criar transação (com suporte a recorrência mensal) ──────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  const { type, amount, description, category, date, status, notes, serviceId, recurring, recurrenceEnd } = req.body
  if (!type || !amount || !description || !category || !date) {
    res.status(400).json({ error: 'Campos obrigatórios faltando' }); return
  }

  const teamId = req.user!.teamId

  // ── Recorrência mensal ───────────────────────────────────────────────────────
  if (recurring && recurrenceEnd) {
    const start = new Date(date)
    const end   = new Date(recurrenceEnd)

    if (end < start) {
      res.status(400).json({ error: 'Data final deve ser após a data inicial' }); return
    }

    // Gera lista de datas mensais (1 por mês, mesmo dia)
    const dates: Date[] = []
    let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    while (cur <= end) {
      dates.push(new Date(cur))
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate())
    }

    if (dates.length > 60) {
      res.status(400).json({ error: 'Recorrência limitada a 60 meses' }); return
    }

    const created = await Promise.all(
      dates.map(d =>
        prisma.transaction.create({
          data: {
            type, amount: Number(amount), description, category,
            date: d, status, notes: notes || null, serviceId: serviceId || null,
            teamId,
          },
        })
      )
    )

    res.status(201).json({ data: created[0], count: created.length, recurring: true })
    return
  }

  // ── Transação única ──────────────────────────────────────────────────────────
  const transaction = await prisma.transaction.create({
    data: {
      type, amount: Number(amount), description, category,
      date: new Date(date), status, notes: notes || null, serviceId: serviceId || null,
      teamId,
    }
  })
  res.status(201).json({ data: transaction })
})

// ─── PUT /:id — editar transação ──────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id     = req.params.id as string
  const teamId = req.user!.teamId as string
  const existing = await prisma.transaction.findFirst({ where: { id, teamId } })
  if (!existing) { res.status(404).json({ error: 'Transação não encontrada' }); return }

  const b = req.body as { type?: string; amount?: string | number; description?: string; category?: string; date?: string; status?: string; notes?: string }
  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      type:        b.type        as 'INCOME' | 'EXPENSE'                       | undefined,
      amount:      b.amount      ? Number(b.amount)                            : undefined,
      description: b.description,
      category:    b.category,
      date:        b.date        ? new Date(b.date)                            : undefined,
      status:      b.status      as 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | undefined,
      notes:       b.notes,
    }
  })
  res.json({ data: transaction })
})

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id     = req.params.id as string
  const teamId = req.user!.teamId as string
  const existing = await prisma.transaction.findFirst({ where: { id, teamId } })
  if (!existing) { res.status(404).json({ error: 'Transação não encontrada' }); return }

  await prisma.transaction.delete({ where: { id } })
  res.json({ message: 'Transação removida com sucesso' })
})

export default router
