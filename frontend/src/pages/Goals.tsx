import { useState } from 'react'
import {
  Box, Button, Card, CardContent, Typography, LinearProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Grid
} from '@mui/material'
import { Add, Flag, EmojiObjects, Visibility, FavoriteBorder, Edit } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import DateField from '../components/Common/DateField'

type GoalType = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'
type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'

interface Goal {
  id: string
  title: string
  description?: string
  type: GoalType
  status: GoalStatus
  progress: number
  deadline?: string
}

interface MissionVision {
  name: string
  mission?: string
  vision?: string
  values?: string
}

const typeConfig: Record<GoalType, { label: string; color: string; bg: string }> = {
  SHORT_TERM: { label: 'Curto Prazo', color: '#10B981', bg: '#ECFDF5' },
  MEDIUM_TERM: { label: 'Médio Prazo', color: '#F59E0B', bg: '#FFFBEB' },
  LONG_TERM: { label: 'Longo Prazo', color: '#0066CC', bg: '#E8F0FF' },
}

const statusConfig: Record<GoalStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Não iniciada', color: '#6B7280' },
  IN_PROGRESS: { label: 'Em andamento', color: '#0066CC' },
  COMPLETED: { label: 'Concluída', color: '#10B981' },
  PAUSED: { label: 'Pausada', color: '#F59E0B' },
}

export default function Goals() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mvDialogOpen, setMvDialogOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState({ title: '', description: '', type: 'SHORT_TERM' as GoalType, status: 'IN_PROGRESS' as GoalStatus, deadline: '', progress: 0 })
  const [mvForm, setMvForm] = useState({ mission: '', vision: '', values: '' })
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<{ data: Goal[] }>('/api/goals'),
    staleTime: 30000,
  })

  const { data: mvData } = useQuery({
    queryKey: ['mission-vision'],
    queryFn: () => api.get<{ data: MissionVision }>('/api/goals/mission-vision'),
    staleTime: 60000,
  })

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/api/goals', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); handleClose() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Goal) => api.put(`/api/goals/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] })
  })

  const updateMvMutation = useMutation({
    mutationFn: (body: typeof mvForm) => api.put('/api/goals/mission-vision', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mission-vision'] }); setMvDialogOpen(false) }
  })

  const handleOpen = (goal?: Goal) => {
    if (goal) { setEditGoal(goal); setForm({ title: goal.title, description: goal.description ?? '', type: goal.type, status: goal.status, deadline: goal.deadline ?? '', progress: goal.progress }) }
    else { setEditGoal(null); setForm({ title: '', description: '', type: 'SHORT_TERM', status: 'IN_PROGRESS', deadline: '', progress: 0 }) }
    setDialogOpen(true)
  }

  const handleClose = () => { setDialogOpen(false); setEditGoal(null) }

  const handleOpenMv = () => {
    const mv = mvData?.data
    setMvForm({ mission: mv?.mission ?? '', vision: mv?.vision ?? '', values: mv?.values ?? '' })
    setMvDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.title) return
    if (editGoal) updateMutation.mutate({ ...form, id: editGoal.id })
    else createMutation.mutate(form)
  }

  const goals = data?.data ?? []
  const mv = mvData?.data

  const getByType = (type: GoalType) => goals.filter(g => g.type === type)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Metas & Planejamento</Typography>
          <Typography variant="body2" color="text.secondary">Missão, visão, valores e metas da empresa</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<EmojiObjects />} onClick={handleOpenMv}>Missão & Visão</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Nova Meta</Button>
        </Box>
      </Box>

      {/* Mission, Vision, Values */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: <EmojiObjects sx={{ color: '#F59E0B' }} />, title: 'Missão', text: mv?.mission, bg: '#FFFBEB', border: '#FDE68A' },
          { icon: <Visibility sx={{ color: '#0066CC' }} />, title: 'Visão', text: mv?.vision, bg: '#E8F0FF', border: '#BFDBFE' },
          { icon: <FavoriteBorder sx={{ color: '#10B981' }} />, title: 'Valores', text: mv?.values, bg: '#ECFDF5', border: '#A7F3D0' },
        ].map((item) => (
          <Grid item xs={12} md={4} key={item.title}>
            <Card sx={{ bgcolor: item.bg, border: `1px solid ${item.border}`, cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={handleOpenMv}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {item.icon}
                  <Typography variant="subtitle2" fontWeight={700}>{item.title}</Typography>
                  <Edit sx={{ fontSize: 14, ml: 'auto', color: 'text.secondary' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
                  {item.text || `Clique para definir a ${item.title.toLowerCase()} da empresa...`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Goals by type */}
      <Grid container spacing={2.5}>
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <Grid item xs={12} md={4} key={type}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Flag sx={{ color: cfg.color, fontSize: 18 }} />
                <Typography variant="subtitle1" fontWeight={600}>{cfg.label}</Typography>
                <Chip label={getByType(type as GoalType).length} size="small" sx={{ ml: 'auto', height: 20, bgcolor: cfg.bg, color: cfg.color, fontSize: 11 }} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {getByType(type as GoalType).map((goal) => (
                  <Card
                    key={goal.id}
                    sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-1px)', boxShadow: 3 } }}
                    onClick={() => handleOpen(goal)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, mr: 1 }}>{goal.title}</Typography>
                        <Chip
                          label={statusConfig[goal.status].label}
                          size="small"
                          sx={{ height: 18, fontSize: 10, color: statusConfig[goal.status].color, bgcolor: `${statusConfig[goal.status].color}15`, '& .MuiChip-label': { px: 0.75 } }}
                        />
                      </Box>
                      {goal.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {goal.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={goal.progress}
                          sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: '#F3F4F6', '& .MuiLinearProgress-bar': { bgcolor: cfg.color, borderRadius: 3 } }}
                        />
                        <Typography variant="caption" fontWeight={700} sx={{ color: cfg.color, minWidth: 28 }}>
                          {goal.progress}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => { setForm(f => ({ ...f, type: type as GoalType })); setDialogOpen(true) }}
                  sx={{ color: 'text.secondary', justifyContent: 'flex-start', fontSize: '0.8rem', '&:hover': { color: cfg.color, bgcolor: cfg.bg } }}
                >
                  Adicionar meta
                </Button>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Goal Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Título*" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} fullWidth size="small" />
          <TextField label="Descrição" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} fullWidth size="small" multiline rows={2} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value as GoalType }))}>
                {Object.entries(typeConfig).map(([v, c]) => <MenuItem key={v} value={v}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as GoalStatus }))}>
                {Object.entries(statusConfig).map(([v, c]) => <MenuItem key={v} value={v}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <DateField label="Prazo" value={form.deadline} onChange={(v) => setForm(p => ({ ...p, deadline: v }))} />
            <TextField label="Progresso (%)" type="number" value={form.progress} onChange={(e) => setForm(p => ({ ...p, progress: Math.min(100, Math.max(0, Number(e.target.value))) }))} size="small" fullWidth inputProps={{ min: 0, max: 100 }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.title || createMutation.isPending}>
            {editGoal ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mission/Vision Dialog */}
      <Dialog open={mvDialogOpen} onClose={() => setMvDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Missão, Visão e Valores</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Missão" placeholder="Por que sua empresa existe?" value={mvForm.mission} onChange={(e) => setMvForm(p => ({ ...p, mission: e.target.value }))} fullWidth size="small" multiline rows={3} />
          <TextField label="Visão" placeholder="Onde sua empresa quer chegar?" value={mvForm.vision} onChange={(e) => setMvForm(p => ({ ...p, vision: e.target.value }))} fullWidth size="small" multiline rows={3} />
          <TextField label="Valores" placeholder="O que guia as decisões da empresa?" value={mvForm.values} onChange={(e) => setMvForm(p => ({ ...p, values: e.target.value }))} fullWidth size="small" multiline rows={3} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMvDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={() => updateMvMutation.mutate(mvForm)} variant="contained" disabled={updateMvMutation.isPending}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
