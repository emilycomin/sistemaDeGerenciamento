import { useState, useEffect } from 'react'
import {
  Box, Button, Card, CardContent, Typography, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, Alert,
  Drawer, Divider, Tabs, Tab, TableSortLabel, Tooltip, Pagination,
  Stack, Skeleton,
} from '@mui/material'
import {
  Add, Search, Edit, Delete, Person, LocalOffer, Visibility,
  Email as EmailIcon, Phone as PhoneIcon, Business, Close,
  WarningAmber, CalendarToday, Notes as NotesIcon, WorkOutline,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import DateField from '../components/Common/DateField'

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactStatus = 'LEAD' | 'PROSPECT' | 'CLIENT' | 'INACTIVE'
type SortField = 'name' | 'company' | 'lastContact' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string
  status: ContactStatus
  notes?: string
  tags?: string[]
  lastContact?: string
  createdAt?: string
}

interface CRMStats {
  total: number
  LEAD: number
  PROSPECT: number
  CLIENT: number
  INACTIVE: number
  conversionRate: number
}

// ─── Config ──────────────────────────────────────────────────────────────────

const statusConfig: Record<ContactStatus, { label: string; color: string; bgcolor: string }> = {
  LEAD:     { label: 'Entrar em contato', color: '#F59E0B', bgcolor: '#FFFBEB' },
  PROSPECT: { label: 'Em negociação',     color: '#0066CC', bgcolor: '#E8F0FF' },
  CLIENT:   { label: 'Cliente',           color: '#10B981', bgcolor: '#ECFDF5' },
  INACTIVE: { label: 'Inativo',           color: '#6B7280', bgcolor: '#F9FAFB' },
}

const TAGS_DISPONIVEIS: { label: string; color: string; bg: string }[] = [
  { label: 'Cliente Ativo',            color: '#166534', bg: '#DCFCE7' },
  { label: 'Converteu',                color: '#065F46', bg: '#D1FAE5' },
  { label: 'Proposta Enviada',         color: '#92400E', bg: '#FDE68A' },
  { label: 'WHATSAPP',                 color: '#78350F', bg: '#FCD34D' },
  { label: 'Não converteu',           color: '#991B1B', bg: '#FEE2E2' },
  { label: 'Aguardando Resposta',      color: '#5B21B6', bg: '#EDE9FE' },
  { label: 'Cliente antiga',           color: '#1E40AF', bg: '#DBEAFE' },
  { label: 'Conhecido',                color: '#1E40AF', bg: '#DBEAFE' },
  { label: 'Indicação',                color: '#1E40AF', bg: '#DBEAFE' },
  { label: 'Instagram',                color: '#1E40AF', bg: '#DBEAFE' },
  { label: 'Auditoria Relâmpago',      color: '#0E7490', bg: '#CFFAFE' },
  { label: 'Diagnóstico Estratégico',  color: '#0E7490', bg: '#CFFAFE' },
  { label: 'Ecossistema de Conteúdo',  color: '#0E7490', bg: '#CFFAFE' },
  { label: 'Guia de Conteúdo',         color: '#0E7490', bg: '#CFFAFE' },
  { label: 'Sprint de Conteúdo',       color: '#0E7490', bg: '#CFFAFE' },
  { label: 'Follow UP',                color: '#1E40AF', bg: '#DBEAFE' },
]

const getTagStyle = (label: string) =>
  TAGS_DISPONIVEIS.find(t => t.label === label) ?? { color: '#374151', bg: '#F3F4F6' }

const emptyContact: Omit<Contact, 'id'> = {
  name: '', email: '', phone: '', company: '', position: '',
  status: 'LEAD', notes: '', tags: [], lastContact: '',
}

const LIMIT = 15

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatPill({
  label, count, color, active, onClick,
}: { label: string; count: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        px: 2.5, py: 1.5, borderRadius: 2, cursor: 'pointer', minWidth: 110,
        border: '1.5px solid', transition: 'all 0.15s ease',
        borderColor: active ? color : '#E9ECEF',
        bgcolor: active ? `${color}12` : '#fff',
        '&:hover': { borderColor: color, bgcolor: `${color}08` },
      }}
    >
      <Typography variant="h6" fontWeight={700} sx={{ color: active ? color : 'text.primary', lineHeight: 1 }}>
        {count}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, textAlign: 'center', fontSize: '0.7rem' }}>
        {label}
      </Typography>
    </Box>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CRM() {
  // Filters & pagination
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'ALL'>('ALL')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<Omit<Contact, 'id'>>(emptyContact)
  const [dialogError, setDialogError] = useState('')

  // Detail drawer
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)

  const queryClient = useQueryClient()

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['crm', debouncedSearch, statusFilter, sortField, sortDir, page],
    queryFn: () => {
      const p = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        sortBy: sortField, sortOrder: sortDir,
      })
      if (debouncedSearch) p.set('search', debouncedSearch)
      if (statusFilter !== 'ALL') p.set('status', statusFilter)
      return api.get<{ data: Contact[]; pagination: { total: number; pages: number } }>(`/api/crm?${p}`)
    },
    staleTime: 30000,
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => api.get<{ data: CRMStats }>('/api/crm/stats'),
    staleTime: 0,
  })

  const contacts = data?.data ?? []
  const totalPages = data?.pagination?.pages ?? 1
  const stats = statsData?.data

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['crm'] })
    queryClient.invalidateQueries({ queryKey: ['crm-stats'] })
    queryClient.invalidateQueries({ queryKey: ['crm-stats'] })
  }

  const createMutation = useMutation({
    mutationFn: (body: Omit<Contact, 'id'>) => api.post('/api/crm', body),
    onSuccess: () => { invalidate(); handleClose() },
    onError: (err: Error) => setDialogError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Contact) => api.put(`/api/crm/${id}`, body),
    onSuccess: () => { invalidate(); handleClose() },
    onError: (err: Error) => setDialogError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/crm/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditContact(null); setForm(emptyContact); setDialogError(''); setDialogOpen(true)
  }

  const handleOpenEdit = (c: Contact) => {
    setEditContact(c)
    setForm({ ...c, tags: c.tags ?? [], lastContact: c.lastContact?.slice(0, 10) ?? '' })
    setDialogError('')
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false); setEditContact(null); setForm(emptyContact); setDialogError('')
  }

  const handleSave = () => {
    if (!form.name) return
    if (editContact) updateMutation.mutate({ ...form, id: editContact.id })
    else createMutation.mutate(form)
  }

  const toggleTag = (tag: string) => {
    setForm(p => ({
      ...p,
      tags: p.tags?.includes(tag) ? p.tags.filter(t => t !== tag) : [...(p.tags ?? []), tag],
    }))
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const handleStatusPill = (s: ContactStatus | 'ALL') => {
    setStatusFilter(s === statusFilter ? 'ALL' : s)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>CRM</Typography>
          <Typography variant="body2" color="text.secondary">Gerencie seus contatos e relacionamentos</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>Novo Contato</Button>
      </Box>

      {/* Stats pills */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rounded" width={110} height={60} />)
        ) : (
          <>
            <StatPill label="Total" count={stats?.total ?? 0} color="#0066CC"
              active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
            <StatPill label="Entrar em contato" count={stats?.LEAD ?? 0} color="#F59E0B"
              active={statusFilter === 'LEAD'} onClick={() => handleStatusPill('LEAD')} />
            <StatPill label="Em negociação" count={stats?.PROSPECT ?? 0} color="#0066CC"
              active={statusFilter === 'PROSPECT'} onClick={() => handleStatusPill('PROSPECT')} />
            <StatPill label="Clientes" count={stats?.CLIENT ?? 0} color="#10B981"
              active={statusFilter === 'CLIENT'} onClick={() => handleStatusPill('CLIENT')} />
            <StatPill label="Inativos" count={stats?.INACTIVE ?? 0} color="#6B7280"
              active={statusFilter === 'INACTIVE'} onClick={() => handleStatusPill('INACTIVE')} />
          </>
        )}
      </Box>

      {/* Table card */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Search bar */}
          <Box sx={{ p: 2, borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar por nome, e-mail, empresa, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: 360 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            {statusFilter !== 'ALL' && (
              <Chip
                label={statusConfig[statusFilter].label}
                size="small"
                onDelete={() => setStatusFilter('ALL')}
                sx={{ bgcolor: statusConfig[statusFilter].bgcolor, color: statusConfig[statusFilter].color, fontWeight: 600 }}
              />
            )}
          </Box>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#F8FAFF', fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' } }}>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'name'} direction={sortDir}
                      onClick={() => handleSort('name')}
                    >Contato</TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'company'} direction={sortDir}
                      onClick={() => handleSort('company')}
                    >Empresa</TableSortLabel>
                  </TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Etiquetas</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'lastContact'} direction={sortDir}
                      onClick={() => handleSort('lastContact')}
                    >Último contato</TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Person sx={{ fontSize: 48, color: '#DEE2E6', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">
                        {debouncedSearch || statusFilter !== 'ALL'
                          ? 'Nenhum contato encontrado com esses filtros'
                          : 'Nenhum contato cadastrado'}
                      </Typography>
                      {!debouncedSearch && statusFilter === 'ALL' && (
                        <Button size="small" onClick={handleOpenCreate} sx={{ mt: 1 }}>
                          Adicionar primeiro contato
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : contacts.map((c) => (
                  <TableRow
                    key={c.id} hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFF' } }}
                    onClick={() => setDrawerContact(c)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
                        onClick={() => setDrawerContact(c)}
                      >
                        <Avatar sx={{ width: 34, height: 34, bgcolor: '#E8F0FF', color: '#0066CC', fontSize: 13, fontWeight: 700 }}>
                          {initials(c.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.email || '—'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Typography variant="body2">{c.company || '—'}</Typography>
                      {c.position && <Typography variant="caption" color="text.secondary">{c.position}</Typography>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Typography variant="body2">{c.phone || '—'}</Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Chip
                        label={statusConfig[c.status].label} size="small"
                        sx={{ bgcolor: statusConfig[c.status].bgcolor, color: statusConfig[c.status].color, fontWeight: 600, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(c.tags ?? []).slice(0, 2).map(tag => {
                          const s = getTagStyle(tag)
                          return (
                            <Chip key={tag} label={tag} size="small"
                              sx={{ bgcolor: s.bg, color: s.color, fontSize: '0.7rem', height: 20, '& .MuiChip-label': { px: 0.75 } }}
                            />
                          )
                        })}
                        {(c.tags ?? []).length > 2 && (
                          <Tooltip title={(c.tags ?? []).slice(2).join(', ')}>
                            <Chip
                              label={`+${(c.tags ?? []).length - 2}`} size="small"
                              sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Typography variant="body2" color="text.secondary">{fmtDate(c.lastContact)}</Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Ver detalhes">
                        <IconButton size="small" onClick={() => setDrawerContact(c)}
                          sx={{ color: 'text.secondary', '&:hover': { color: '#0066CC' } }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(c)}
                          sx={{ color: 'text.secondary', '&:hover': { color: '#0066CC' } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => setDeleteTarget(c)}
                          sx={{ color: 'text.secondary', '&:hover': { color: '#EF4444' } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #E9ECEF' }}>
              <Pagination
                count={totalPages} page={page}
                onChange={(_, v) => setPage(v)}
                color="primary" shape="rounded" size="small"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ──────────────────────────── Detail Drawer ──────────────────────────── */}
      <Drawer
        anchor="right" open={!!drawerContact}
        onClose={() => setDrawerContact(null)}
        PaperProps={{ sx: { width: 400, p: 0 } }}
      >
        {drawerContact && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer header */}
            <Box sx={{ p: 3, bgcolor: '#F8FAFF', borderBottom: '1px solid #E9ECEF' }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <IconButton size="small" onClick={() => setDrawerContact(null)}>
                  <Close fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: '#E8F0FF', color: '#0066CC', fontSize: 20, fontWeight: 700 }}>
                  {initials(drawerContact.name)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{drawerContact.name}</Typography>
                  {drawerContact.position && (
                    <Typography variant="body2" color="text.secondary">{drawerContact.position}</Typography>
                  )}
                  <Chip
                    label={statusConfig[drawerContact.status].label} size="small" sx={{ mt: 0.75,
                      bgcolor: statusConfig[drawerContact.status].bgcolor,
                      color: statusConfig[drawerContact.status].color, fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Drawer body */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Contact info */}
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Informações de contato
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1.5, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2">{drawerContact.email || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2">{drawerContact.phone || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Business sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2">{drawerContact.company || '—'}</Typography>
                </Box>
                {drawerContact.position && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <WorkOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">{drawerContact.position}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    Último contato: {fmtDate(drawerContact.lastContact)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              {/* Tags */}
              {(drawerContact.tags ?? []).length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                    <LocalOffer sx={{ fontSize: 15, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Etiquetas
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
                    {(drawerContact.tags ?? []).map(tag => {
                      const s = getTagStyle(tag)
                      return (
                        <Chip key={tag} label={tag} size="small"
                          sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      )
                    })}
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                </>
              )}

              {/* Notes */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <NotesIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Notas
                </Typography>
              </Box>
              {drawerContact.notes ? (
                <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                  {drawerContact.notes}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.disabled">Sem notas registradas.</Typography>
              )}
            </Box>

            {/* Drawer footer */}
            <Box sx={{ p: 2.5, borderTop: '1px solid #E9ECEF', display: 'flex', gap: 1 }}>
              <Button
                fullWidth variant="outlined" startIcon={<Edit />}
                onClick={() => { setDrawerContact(null); handleOpenEdit(drawerContact) }}
              >
                Editar
              </Button>
              <Button
                fullWidth variant="outlined" color="error" startIcon={<Delete />}
                onClick={() => { setDrawerContact(null); setDeleteTarget(drawerContact) }}
              >
                Excluir
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ──────────────────────────── Create / Edit Dialog ───────────────────── */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editContact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {dialogError && <Alert severity="error" sx={{ borderRadius: 2 }}>{dialogError}</Alert>}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Nome*" value={form.name} fullWidth size="small"
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
            />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status}
                onChange={(e) => setForm(p => ({ ...p, status: e.target.value as ContactStatus }))}>
                {Object.entries(statusConfig).map(([v, c]) => (
                  <MenuItem key={v} value={v}>{c.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="E-mail" type="email" value={form.email} fullWidth size="small"
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
            <TextField label="Telefone" value={form.phone} fullWidth size="small"
              onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Empresa" value={form.company} fullWidth size="small"
              onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} />
            <TextField label="Cargo" value={form.position} fullWidth size="small"
              onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))} />
          </Box>

          <Box sx={{ width: '50%' }}>
            <DateField
              label="Data de contato"
              value={form.lastContact ? form.lastContact.slice(0, 10) : ''}
              onChange={(v) => setForm(p => ({ ...p, lastContact: v }))}
            />
          </Box>

          {/* Etiquetas */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <LocalOffer sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Etiquetas</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {TAGS_DISPONIVEIS.map(tag => {
                const selected = (form.tags ?? []).includes(tag.label)
                return (
                  <Chip
                    key={tag.label} label={tag.label} size="small"
                    onClick={() => toggleTag(tag.label)}
                    sx={{
                      cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.15s ease',
                      bgcolor: selected ? tag.bg : '#F3F4F6',
                      color: selected ? tag.color : '#6B7280',
                      fontWeight: selected ? 700 : 400,
                      border: selected ? `1.5px solid ${tag.color}40` : '1.5px solid transparent',
                      '&:hover': { bgcolor: tag.bg, color: tag.color },
                    }}
                  />
                )
              })}
            </Box>
          </Box>

          <TextField
            label="Notas" value={form.notes} fullWidth size="small" multiline rows={3}
            onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button
            onClick={handleSave} variant="contained"
            disabled={!form.name || createMutation.isPending || updateMutation.isPending}
          >
            {editContact ? 'Salvar alterações' : 'Criar contato'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ──────────────────────────── Delete Confirmation ───────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
          <WarningAmber sx={{ color: '#EF4444' }} />
          Excluir contato
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Cancelar</Button>
          <Button
            variant="contained" color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
