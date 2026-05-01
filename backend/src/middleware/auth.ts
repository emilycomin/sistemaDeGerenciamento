import { Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../types'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' })
    return
  }

  const token = authHeader.split(' ')[1]

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Token inválido ou expirado' })
    return
  }

  let teamMember = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    include: { team: true }
  })

  // Auto-provisiona usuário e time se não existir
  if (!teamMember) {
    const name = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Usuário'
    const teamName = user.user_metadata?.teamName ?? `Empresa de ${name}`
    const teamSlug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email!, name },
      update: {}
    })

    const team = await prisma.team.create({
      data: {
        name: teamName,
        slug: `${teamSlug}-${Date.now()}`,
        members: {
          create: { userId: user.id, role: 'OWNER' }
        }
      }
    })

    teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
      include: { team: true }
    })

    if (!teamMember) {
      res.status(500).json({ error: 'Erro ao configurar conta' })
      return
    }
  }

  req.user = {
    id: user.id,
    email: user.email!,
    teamId: teamMember.teamId,
    role: teamMember.role
  }

  next()
}
