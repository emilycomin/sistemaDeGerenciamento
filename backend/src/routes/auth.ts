import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Registrar e criar time
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, teamName } = req.body

  if (!email || !password || !name || !teamName) {
    res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    return
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  })

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? 'Erro ao criar usuário' })
    return
  }

  const teamSlug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const team = await prisma.team.create({
    data: {
      name: teamName,
      slug: `${teamSlug}-${Date.now()}`,
      members: {
        create: {
          userId: authData.user.id,
          role: 'OWNER'
        }
      }
    }
  })

  await prisma.user.upsert({
    where: { id: authData.user.id },
    create: { id: authData.user.id, email, name },
    update: { name }
  })

  res.status(201).json({ message: 'Conta criada com sucesso', teamId: team.id })
})

// Setup de time após registro via Supabase Auth
router.post('/setup-team', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, teamName, email } = req.body

  if (!name || !teamName) {
    res.status(400).json({ error: 'Nome e nome da empresa são obrigatórios' })
    return
  }

  const userId = req.user!.id

  // Garante que o usuário existe no banco
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: email ?? req.user!.email, name },
    update: { name }
  })

  // Verifica se já tem time
  const existing = await prisma.teamMember.findFirst({ where: { userId } })
  if (existing) {
    res.json({ message: 'Time já configurado' })
    return
  }

  const teamSlug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  await prisma.team.create({
    data: {
      name: teamName,
      slug: `${teamSlug}-${Date.now()}`,
      members: {
        create: { userId, role: 'OWNER' }
      }
    }
  })

  res.status(201).json({ message: 'Equipe criada com sucesso' })
})

// Perfil do usuário autenticado
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      teamMembers: {
        include: { team: true }
      }
    }
  })

  res.json({ data: user })
})

// Atualizar perfil
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, avatarUrl } = req.body

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, avatarUrl }
  })

  res.json({ data: user })
})

export default router
