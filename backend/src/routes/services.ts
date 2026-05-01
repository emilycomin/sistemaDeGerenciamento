import { Router, Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()
router.use(authMiddleware)

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  status: string
  deliveryTime: string | null
  workProcess: string | null
  deliverables: string | null
  requiredDocuments: string | null
  referenceLinks: string | null
  createdAt: Date
  updatedAt: Date
  teamId: string
  salesCount: bigint | number
  totalRevenue: number | null
}

// ─── GET / — listar serviços ──────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const q      = req.query as Record<string, string>
  const status = q.status ?? null

  const rows = status
    ? await prisma.$queryRaw<ServiceRow[]>`
        SELECT
          s.id, s.name, s.description, s.price, s.category, s.status,
          s."deliveryTime", s."workProcess", s.deliverables,
          s."requiredDocuments", s."referenceLinks",
          s."createdAt", s."updatedAt", s."teamId",
          COUNT(t.id)   AS "salesCount",
          SUM(t.amount) AS "totalRevenue"
        FROM "Service" s
        LEFT JOIN "Transaction" t ON t."serviceId" = s.id AND t.type = 'INCOME'
        WHERE s."teamId" = ${teamId} AND s.status = ${status}::"ServiceStatus"
        GROUP BY s.id
        ORDER BY s."createdAt" DESC
      `
    : await prisma.$queryRaw<ServiceRow[]>`
        SELECT
          s.id, s.name, s.description, s.price, s.category, s.status,
          s."deliveryTime", s."workProcess", s.deliverables,
          s."requiredDocuments", s."referenceLinks",
          s."createdAt", s."updatedAt", s."teamId",
          COUNT(t.id)   AS "salesCount",
          SUM(t.amount) AS "totalRevenue"
        FROM "Service" s
        LEFT JOIN "Transaction" t ON t."serviceId" = s.id AND t.type = 'INCOME'
        WHERE s."teamId" = ${teamId}
        GROUP BY s.id
        ORDER BY s."createdAt" DESC
      `

  // normaliza bigint → number
  const data = rows.map(r => ({
    ...r,
    salesCount:   Number(r.salesCount ?? 0),
    totalRevenue: Number(r.totalRevenue ?? 0),
  }))

  res.json({ data })
})

// ─── GET /stats — totais globais ─────────────────────────────────────────────

router.get('/stats', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId

  const rows = await prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
    SELECT status, COUNT(*) AS cnt
    FROM "Service"
    WHERE "teamId" = ${teamId}
    GROUP BY status
  `

  const counts: Record<string, number> = { ACTIVE: 0, IN_DEVELOPMENT: 0, INACTIVE: 0, total: 0 }
  for (const r of rows) {
    counts[r.status] = Number(r.cnt)
    counts.total += Number(r.cnt)
  }

  res.json({ data: counts })
})

// ─── GET /:id — detalhe do serviço ───────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const id     = req.params.id

  const rows = await prisma.$queryRaw<ServiceRow[]>`
    SELECT
      s.id, s.name, s.description, s.price, s.category, s.status,
      s."deliveryTime", s."workProcess", s.deliverables,
      s."requiredDocuments", s."referenceLinks",
      s."createdAt", s."updatedAt", s."teamId",
      COUNT(t.id)   AS "salesCount",
      SUM(t.amount) AS "totalRevenue"
    FROM "Service" s
    LEFT JOIN "Transaction" t
      ON t."serviceId" = s.id AND t.type = 'INCOME'
    WHERE s.id = ${id} AND s."teamId" = ${teamId}
    GROUP BY s.id
  `

  if (!rows[0]) { res.status(404).json({ error: 'Serviço não encontrado' }); return }

  const r = rows[0]
  res.json({
    data: {
      ...r,
      salesCount:   Number(r.salesCount ?? 0),
      totalRevenue: Number(r.totalRevenue ?? 0),
    }
  })
})

// ─── POST / — criar serviço ───────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const {
    name, description, price, category, status,
    deliveryTime, workProcess, deliverables, requiredDocuments, referenceLinks,
  } = req.body

  if (!name || price === undefined || price === null || price === '') {
    res.status(400).json({ error: 'Nome e preço são obrigatórios' }); return
  }

  const id  = randomUUID()
  const now = new Date()
  const st  = status ?? 'ACTIVE'

  await prisma.$executeRaw`
    INSERT INTO "Service"
      (id, name, description, price, category, status,
       "deliveryTime", "workProcess", deliverables,
       "requiredDocuments", "referenceLinks",
       "teamId", "createdAt", "updatedAt")
    VALUES (
      ${id}, ${name}, ${description ?? null}, ${Number(price)},
      ${category ?? null}, ${st}::"ServiceStatus",
      ${deliveryTime ?? null}, ${workProcess ?? null}, ${deliverables ?? null},
      ${requiredDocuments ?? null}, ${referenceLinks ?? null},
      ${teamId}, ${now}, ${now}
    )
  `

  res.status(201).json({
    data: {
      id, name, description, price: Number(price), category, status: st,
      deliveryTime, workProcess, deliverables, requiredDocuments, referenceLinks,
      teamId, createdAt: now, updatedAt: now, salesCount: 0, totalRevenue: 0,
    }
  })
})

// ─── PUT /:id — editar serviço ────────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const id     = req.params.id

  // verifica ownership
  const existing = await prisma.service.findFirst({ where: { id, teamId } })
  if (!existing) { res.status(404).json({ error: 'Serviço não encontrado' }); return }

  const {
    name, description, price, category, status,
    deliveryTime, workProcess, deliverables, requiredDocuments, referenceLinks,
  } = req.body

  const now = new Date()

  const finalName        = name             !== undefined ? name             : existing.name
  const finalDesc        = description      !== undefined ? description      : existing.description
  const finalPrice       = price            !== undefined ? Number(price)    : existing.price
  const finalCategory    = category         !== undefined ? category         : existing.category
  const finalStatus      = status           !== undefined ? status           : (existing.status as string)
  const finalDelivery    = deliveryTime     !== undefined ? (deliveryTime     || null) : null
  const finalProcess     = workProcess      !== undefined ? (workProcess      || null) : null
  const finalDeliv       = deliverables     !== undefined ? (deliverables     || null) : null
  const finalDocs        = requiredDocuments !== undefined ? (requiredDocuments || null) : null
  const finalLinks       = referenceLinks   !== undefined ? (referenceLinks   || null) : null

  await prisma.$executeRaw`
    UPDATE "Service" SET
      name                = ${finalName},
      description         = ${finalDesc},
      price               = ${finalPrice},
      category            = ${finalCategory},
      status              = ${finalStatus}::"ServiceStatus",
      "deliveryTime"      = ${finalDelivery},
      "workProcess"       = ${finalProcess},
      deliverables        = ${finalDeliv},
      "requiredDocuments" = ${finalDocs},
      "referenceLinks"    = ${finalLinks},
      "updatedAt"         = ${now}
    WHERE id = ${id}
  `

  res.json({ data: { id, ...req.body, updatedAt: now } })
})

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const teamId = req.user!.teamId
  const id     = req.params.id

  const existing = await prisma.service.findFirst({ where: { id, teamId } })
  if (!existing) { res.status(404).json({ error: 'Serviço não encontrado' }); return }

  await prisma.service.delete({ where: { id } })
  res.json({ message: 'Serviço removido com sucesso' })
})

export default router
