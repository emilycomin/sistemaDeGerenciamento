import { useState } from 'react'
import {
  Box, Button, Card, CardContent, Typography, Grid, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Drawer, Divider,
  Tooltip, Skeleton, Avatar, Stack,
} from '@mui/material'
import {
  Add, Edit, Delete, WarningAmber, ContentCopy, Check,
  WorkspacePremium, Build, CheckCircleOutline, Description,
  Link as LinkIcon, Timer, TrendingUp, AttachMoney, Close,
  FiberManualRecord,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceStatus = 'ACTIVE' | 'IN_DEVELOPMENT' | 'INACTIVE'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  status: ServiceStatus
  deliveryTime: string | null
  workProcess: string | null
  deliverables: string | null
  requiredDocuments: string | null
  referenceLinks: string | null
  salesCount: number
  totalRevenue: number
  createdAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<ServiceStatus, { label: string; color: string; bg: string; dot: string }> = {
  ACTIVE:         { label: 'Ativo',           color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  IN_DEVELOPMENT: { label: 'Em Desenvolvimento', color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  INACTIVE:       { label: 'Inativo',         color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
}

const SERVICE_CATEGORIES = [
  'Gerenciamento de Perfil', 'Pack de Conteúdo', 'Sprint de Conteúdo',
  'Diagnóstico Estratégico', 'Auditoria', 'Design Avulso', 'Consultoria', 'Outros',
]

const makeEmpty = () => ({
  name: '',
  description: '',
  price: '',
  category: SERVICE_CATEGORIES[0],
  status: 'ACTIVE' as ServiceStatus,
  deliveryTime: '',
  workProcess: '',
  deliverables: '',
  requiredDocuments: '',
  referenceLinks: '',
})

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** Divide texto por linha e filtra vazias */
const lines = (text: string | null) =>
  (text ?? '').split('\n').map(l => l.trim()).filter(Boolean)

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  label, count, color, bg, active, onClick,
}: {
  label: string; count: number; color: string; bg: string; active: boolean; onClick: () => void
}) {
  return (
    <Box onClick={onClick} sx={{
      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
      borderRadius: 2, cursor: 'pointer', border: '1.5px solid',
      borderColor: active ? color : 'transparent',
      bgcolor: active ? bg : '#F8FAFF',
      transition: 'all 0.15s',
      '&:hover': { borderColor: color, bgcolor: bg },
    }}>
      <Typography variant="body2" fontWeight={600} color={active ? color : 'text.secondary'}>{label}</Typography>
      <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: active ? color : '#E9ECEF', color: active ? '#fff' : 'text.secondary', '& .MuiChip-label': { px: 0.75 } }} />
    </Box>
  )
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({
  service, onEdit, onDelete, onOpen,
}: {
  service: Service
  onEdit: (s: Service) => void
  onDelete: (s: Service) => void
  onOpen: (s: Service) => void
}) {
  const st = statusConfig[service.status]

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      transition: 'all 0.18s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.09)' },
    }}>
      <CardContent sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Avatar sx={{ bgcolor: '#E8F0FF', color: '#0066CC', width: 40, height: 40, borderRadius: 2, fontSize: '1.1rem' }}>
            {service.name.charAt(0).toUpperCase()}
          </Avatar>
          <Chip
            icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: `${st.dot} !important` }} />}
            label={st.label} size="small"
            sx={{ bgcolor: st.bg, color: st.color, fontWeight: 600, fontSize: '0.72rem', height: 22 }}
          />
        </Box>

        {/* Name & category */}
        <Box sx={{ cursor: 'pointer' }} onClick={() => onOpen(service)}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, '&:hover': { color: '#0066CC' } }}>
            {service.name}
          </Typography>
          {service.category && (
            <Typography variant="caption" color="text.secondary">{service.category}</Typography>
          )}
        </Box>

        {/* Description */}
        {service.description && (
          <Typography variant="body2" color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.8rem' }}>
            {service.description}
          </Typography>
        )}

        {/* Delivery time */}
        {service.deliveryTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Timer sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">{service.deliveryTime}</Typography>
          </Box>
        )}

        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 2, mt: 'auto', pt: 1, borderTop: '1px solid #F0F0F0' }}>
          <Box>
            <Typography variant="caption" color="text.disabled" display="block">Preço</Typography>
            <Typography variant="body2" fontWeight={700} color="#0066CC">{fmt(service.price)}</Typography>
          </Box>
          {service.salesCount > 0 && (
            <Box>
              <Typography variant="caption" color="text.disabled" display="block">Vendas</Typography>
              <Typography variant="body2" fontWeight={700} color="#10B981">{service.salesCount}×</Typography>
            </Box>
          )}
          {service.totalRevenue > 0 && (
            <Box>
              <Typography variant="caption" color="text.disabled" display="block">Faturado</Typography>
              <Typography variant="body2" fontWeight={700} color="#10B981">{fmt(service.totalRevenue)}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      {/* Action footer */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Tooltip title="Ver detalhes">
          <Button size="small" onClick={() => onOpen(service)}
            sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#0066CC', minWidth: 0, px: 1 }}>
            Ver mais
          </Button>
        </Tooltip>
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => onEdit(service)}
            sx={{ color: 'text.secondary', '&:hover': { color: '#0066CC' } }}>
            <Edit sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir">
          <IconButton size="small" onClick={() => onDelete(service)}
            sx={{ color: 'text.secondary', '&:hover': { color: '#EF4444' } }}>
            <Delete sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  )
}

// ─── Detail section helper ────────────────────────────────────────────────────

function DetailSection({
  icon, title, items, numbered = false, isLinks = false,
}: {
  icon: React.ReactNode; title: string; items: string[]; numbered?: boolean; isLinks?: boolean
}) {
  if (!items.length) return null
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ color: '#0066CC' }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      </Box>
      <Stack spacing={0.75} sx={{ pl: 0.5 }}>
        {items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            {numbered ? (
              <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#E8F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.15 }}>
                <Typography variant="caption" fontWeight={700} color="#0066CC">{i + 1}</Typography>
              </Box>
            ) : (
              <CheckCircleOutline sx={{ fontSize: 16, color: '#10B981', flexShrink: 0, mt: 0.2 }} />
            )}
            {isLinks ? (
              <Typography variant="body2" component="a" href={item.startsWith('http') ? item : `https://${item}`}
                target="_blank" rel="noopener"
                sx={{ color: '#0066CC', textDecoration: 'underline', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                {item}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>{item}</Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Services() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServiceStatus>('ALL')
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [editService,  setEditService]  = useState<Service | null>(null)
  const [form,         setForm]         = useState(makeEmpty())
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [drawerService, setDrawerService] = useState<Service | null>(null)
  const [copied,       setCopied]       = useState(false)

  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] })
    queryClient.invalidateQueries({ queryKey: ['services-stats'] })
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', statusFilter],
    queryFn: () => {
      const p = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
      return api.get<{ data: Service[] }>(`/api/services${p}`)
    },
    staleTime: 0,
  })

  const { data: statsData } = useQuery({
    queryKey: ['services-stats'],
    queryFn: () => api.get<{ data: Record<string, number> }>('/api/services/stats'),
    staleTime: 0,
  })

  const services = servicesData?.data ?? []
  const stats    = statsData?.data ?? { total: 0, ACTIVE: 0, IN_DEVELOPMENT: 0, INACTIVE: 0 }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/api/services', body),
    onSuccess: () => { invalidate(); handleClose() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: typeof form & { id: string }) => api.put(`/api/services/${id}`, body),
    onSuccess: () => { invalidate(); handleClose() },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/services/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleOpen = (service?: Service) => {
    if (service) {
      setEditService(service)
      setForm({
        name: service.name, description: service.description ?? '',
        price: String(service.price), category: service.category ?? SERVICE_CATEGORIES[0],
        status: service.status, deliveryTime: service.deliveryTime ?? '',
        workProcess: service.workProcess ?? '', deliverables: service.deliverables ?? '',
        requiredDocuments: service.requiredDocuments ?? '', referenceLinks: service.referenceLinks ?? '',
      })
    } else {
      setEditService(null)
      setForm(makeEmpty())
    }
    setDialogOpen(true)
  }

  const handleClose = () => { setDialogOpen(false); setEditService(null); setForm(makeEmpty()) }

  const handleSave = () => {
    if (!form.name || !form.price) return
    if (editService) updateMutation.mutate({ ...form, id: editService.id })
    else createMutation.mutate(form)
  }

  /** Gera texto de proposta pronto para copiar */
  const generateProposal = (s: Service) => {
    const sep = '\n' + '─'.repeat(40) + '\n'
    let text = `📋 PROPOSTA DE SERVIÇO${sep}`
    text += `🔹 ${s.name.toUpperCase()}\n`
    if (s.category) text += `Categoria: ${s.category}\n`
    if (s.deliveryTime) text += `Prazo: ${s.deliveryTime}\n`
    text += `Investimento: ${fmt(s.price)}\n`
    if (s.description) text += `\nDescrição:\n${s.description}\n`
    const deliv = lines(s.deliverables)
    if (deliv.length) {
      text += `\n✅ O que está incluso:\n`
      deliv.forEach((d, i) => { text += `  ${i + 1}. ${d}\n` })
    }
    const docs = lines(s.requiredDocuments)
    if (docs.length) {
      text += `\n📎 Documentos necessários:\n`
      docs.forEach(d => { text += `  • ${d}\n` })
    }
    text += sep + 'Ficou com dúvidas? Entre em contato! 😊'
    return text
  }

  const handleCopyProposal = async (s: Service) => {
    await navigator.clipboard.writeText(generateProposal(s))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Serviços</Typography>
          <Typography variant="body2" color="text.secondary">Catálogo de serviços oferecidos pela empresa</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Novo Serviço</Button>
      </Box>

      {/* Stat pills */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <StatPill label="Todos" count={stats.total} color="#0066CC" bg="#E8F0FF"
          active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
        <StatPill label="Ativos" count={stats.ACTIVE ?? 0} color="#10B981" bg="#ECFDF5"
          active={statusFilter === 'ACTIVE'} onClick={() => setStatusFilter('ACTIVE')} />
        <StatPill label="Em Desenvolvimento" count={stats.IN_DEVELOPMENT ?? 0} color="#F59E0B" bg="#FFFBEB"
          active={statusFilter === 'IN_DEVELOPMENT'} onClick={() => setStatusFilter('IN_DEVELOPMENT')} />
        <StatPill label="Inativos" count={stats.INACTIVE ?? 0} color="#6B7280" bg="#F9FAFB"
          active={statusFilter === 'INACTIVE'} onClick={() => setStatusFilter('INACTIVE')} />
      </Box>

      {/* Grid */}
      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card><CardContent><Skeleton variant="rounded" height={180} /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      ) : services.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <WorkspacePremium sx={{ fontSize: 56, color: '#DEE2E6', mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>Nenhum serviço cadastrado</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>Adicione os serviços que sua empresa oferece</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Cadastrar primeiro serviço</Button>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {services.map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <ServiceCard
                service={s}
                onEdit={handleOpen}
                onDelete={setDeleteTarget}
                onOpen={setDrawerService}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Detail Drawer ────────────────────────────────────────────────── */}
      <Drawer
        anchor="right" open={!!drawerService} onClose={() => setDrawerService(null)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, p: 3 } }}
      >
        {drawerService && (() => {
          const s = drawerService
          const st = statusConfig[s.status]
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>
              {/* Drawer header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, pr: 1 }}>
                  <Chip
                    icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: `${st.dot} !important` }} />}
                    label={st.label} size="small"
                    sx={{ bgcolor: st.bg, color: st.color, fontWeight: 600, mb: 0.75, fontSize: '0.72rem', height: 22 }}
                  />
                  <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>{s.name}</Typography>
                  {s.category && <Typography variant="caption" color="text.secondary">{s.category}</Typography>}
                </Box>
                <IconButton size="small" onClick={() => setDrawerService(null)}><Close /></IconButton>
              </Box>

              {/* Price + stats */}
              <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: '#F8FAFF', borderRadius: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <AttachMoney sx={{ fontSize: 20, color: '#0066CC' }} />
                  <Typography variant="body2" color="text.secondary" fontSize="0.72rem">Preço</Typography>
                  <Typography fontWeight={700} color="#0066CC">{fmt(s.price)}</Typography>
                </Box>
                {s.deliveryTime && (
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Timer sx={{ fontSize: 20, color: '#F59E0B' }} />
                    <Typography variant="body2" color="text.secondary" fontSize="0.72rem">Prazo</Typography>
                    <Typography fontWeight={700} color="#F59E0B" fontSize="0.85rem">{s.deliveryTime}</Typography>
                  </Box>
                )}
                {s.salesCount > 0 && (
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 20, color: '#10B981' }} />
                    <Typography variant="body2" color="text.secondary" fontSize="0.72rem">Vendas</Typography>
                    <Typography fontWeight={700} color="#10B981">{s.salesCount}× · {fmt(s.totalRevenue)}</Typography>
                  </Box>
                )}
              </Box>

              {/* Description */}
              {s.description && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Descrição</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{s.description}</Typography>
                </Box>
              )}

              <Divider />

              {/* Detailed sections */}
              <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <DetailSection icon={<Build fontSize="small" />} title="Processo de Entrega"
                  items={lines(s.workProcess)} numbered />
                <DetailSection icon={<CheckCircleOutline fontSize="small" />} title="Entregáveis Inclusos"
                  items={lines(s.deliverables)} />
                <DetailSection icon={<Description fontSize="small" />} title="Documentos Necessários"
                  items={lines(s.requiredDocuments)} />
                <DetailSection icon={<LinkIcon fontSize="small" />} title="Links e Referências"
                  items={lines(s.referenceLinks)} isLinks />
              </Box>

              {/* Footer actions */}
              <Divider />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={copied ? 'Copiado!' : 'Gerar proposta em texto e copiar'}>
                  <Button
                    fullWidth variant="outlined"
                    startIcon={copied ? <Check /> : <ContentCopy />}
                    onClick={() => handleCopyProposal(s)}
                    sx={{ textTransform: 'none', color: copied ? '#10B981' : '#0066CC', borderColor: copied ? '#10B981' : undefined }}
                  >
                    {copied ? 'Copiado!' : 'Gerar Proposta'}
                  </Button>
                </Tooltip>
                <Button fullWidth variant="contained" startIcon={<Edit />}
                  onClick={() => { setDrawerService(null); handleOpen(s) }}
                  sx={{ textTransform: 'none' }}>
                  Editar
                </Button>
              </Box>
            </Box>
          )
        })()}
      </Drawer>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} sx={{ pb: 1 }}>
          {editService ? `Editar — ${editService.name}` : '+ Novo Serviço'}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>

            {/* Row 1: name + category */}
            <Grid item xs={12} sm={8}>
              <TextField label="Nome do serviço *" value={form.name} fullWidth size="small"
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select label="Categoria" value={form.category}
                  onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                  {SERVICE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Row 2: price + status + delivery time */}
            <Grid item xs={12} sm={4}>
              <TextField label="Preço (R$) *" type="number" value={form.price} fullWidth size="small"
                inputProps={{ min: 0, step: '0.01' }}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status}
                  onChange={(e) => setForm(p => ({ ...p, status: e.target.value as ServiceStatus }))}>
                  <MenuItem value="ACTIVE">Ativo</MenuItem>
                  <MenuItem value="IN_DEVELOPMENT">Em Desenvolvimento</MenuItem>
                  <MenuItem value="INACTIVE">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Prazo de entrega" value={form.deliveryTime} fullWidth size="small"
                placeholder="ex: 7 dias úteis"
                onChange={(e) => setForm(p => ({ ...p, deliveryTime: e.target.value }))} />
            </Grid>

            {/* Row 3: description */}
            <Grid item xs={12}>
              <TextField label="Descrição" value={form.description} fullWidth size="small" multiline rows={3}
                placeholder="Descreva brevemente o serviço e seus benefícios..."
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <Divider><Typography variant="caption" color="text.disabled">Detalhes de entrega</Typography></Divider>
            </Grid>

            {/* Row 4: work process + deliverables */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Processo de trabalho"
                value={form.workProcess} fullWidth size="small" multiline rows={5}
                placeholder={'1. Briefing inicial\n2. Planejamento de pauta\n3. Produção do conteúdo\n4. Revisão e ajustes\n5. Publicação'}
                helperText="Cada linha = um passo do processo"
                onChange={(e) => setForm(p => ({ ...p, workProcess: e.target.value }))}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Entregáveis inclusos"
                value={form.deliverables} fullWidth size="small" multiline rows={5}
                placeholder={'10 posts mensais\n2 stories por dia\nRelatório mensal\nArte em PNG e PSD'}
                helperText="Cada linha = um entregável"
                onChange={(e) => setForm(p => ({ ...p, deliverables: e.target.value }))}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
            </Grid>

            {/* Row 5: documents + links */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Documentos necessários"
                value={form.requiredDocuments} fullWidth size="small" multiline rows={4}
                placeholder={'Acesso à conta Instagram\nLogin do Meta Business\nFotos do produto\nManual da marca'}
                helperText="Cada linha = um documento ou acesso"
                onChange={(e) => setForm(p => ({ ...p, requiredDocuments: e.target.value }))}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Links de referência"
                value={form.referenceLinks} fullWidth size="small" multiline rows={4}
                placeholder={'https://notion.so/seu-processo\nhttps://drive.google.com/modelo\nhttps://behance.net/portfolio'}
                helperText="Cada linha = um link"
                onChange={(e) => setForm(p => ({ ...p, referenceLinks: e.target.value }))}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained"
            disabled={!form.name || !form.price || createMutation.isPending || updateMutation.isPending}>
            {editService ? 'Salvar alterações' : 'Cadastrar serviço'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
          <WarningAmber sx={{ color: '#EF4444' }} /> Excluir serviço
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
            {(deleteTarget?.salesCount ?? 0) > 0 && (
              <Box component="span" sx={{ color: '#F59E0B', display: 'block', mt: 1 }}>
                ⚠️ Este serviço possui {deleteTarget?.salesCount} transação(ões) vinculada(s).
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Cancelar</Button>
          <Button variant="contained" color="error" disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
