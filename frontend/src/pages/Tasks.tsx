import { useState, useEffect } from 'react'
import {
  Box, Button, Card, CardContent, Typography, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Grid, Avatar, Divider,
  Tooltip, Alert, Snackbar,
} from '@mui/material'
import { Add, Delete, CalendarMonth, Google, LinkOff } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import DateField from '../components/Common/DateField'
import TaskCalendar, { type GoogleEvent } from '../components/Tasks/TaskCalendar'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { useSearchParams } from 'react-router-dom'

dayjs.locale('pt-br')

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  scheduledStart?: string | null
  assignee?: { id: string; name: string; avatarUrl?: string }
}

const statusColumns: { key: TaskStatus; label: string; color: string; bg: string }[] = [
  { key: 'TODO', label: 'A fazer', color: '#6B7280', bg: '#F9FAFB' },
  { key: 'IN_PROGRESS', label: 'Em andamento', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'REVIEW', label: 'Revisão', color: '#0066CC', bg: '#E8F0FF' },
  { key: 'DONE', label: 'Concluído', color: '#10B981', bg: '#ECFDF5' },
]

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: '#6B7280' },
  MEDIUM: { label: 'Média', color: '#F59E0B' },
  HIGH: { label: 'Alta', color: '#EF4444' },
  URGENT: { label: 'Urgente', color: '#7C3AED' },
}

const emptyForm = {
  title: '',
  description: '',
  status: 'TODO' as TaskStatus,
  priority: 'MEDIUM' as Priority,
  dueDate: '',
  scheduledDate: '',
  scheduledTime: '',
}

export default function Tasks() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [weekOffset, setWeekOffset] = useState(0)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Detecta retorno do OAuth do Google
  useEffect(() => {
    const google = searchParams.get('google')
    if (google === 'connected') {
      setSnackbar({ open: true, message: 'Google Calendar conectado com sucesso!', severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['google-status'] })
      queryClient.invalidateQueries({ queryKey: ['google-events'] })
      setSearchParams({})
    } else if (google === 'error') {
      setSnackbar({ open: true, message: 'Erro ao conectar Google Calendar. Tente novamente.', severity: 'error' })
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, queryClient])

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<{ data: Task[] }>('/api/tasks?limit=100'),
    staleTime: 30000,
  })

  // Google Calendar
  const { data: googleStatus } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => api.get<{ connected: boolean }>('/api/google/status'),
    staleTime: 60000,
  })
  const googleConnected = !!googleStatus?.connected

  const weekStart = dayjs().startOf('week').add(weekOffset, 'week')
  const weekEnd = weekStart.add(7, 'day')

  const { data: googleEventsData } = useQuery({
    queryKey: ['google-events', weekStart.toISOString()],
    queryFn: () => api.get<{ data: GoogleEvent[] }>(
      `/api/google/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
    ),
    enabled: googleConnected,
    staleTime: 120000,
  })
  const googleEvents = googleEventsData?.data ?? []

  const connectGoogleMutation = useMutation({
    mutationFn: () => api.get<{ url: string }>('/api/google/auth-url'),
    onSuccess: (res) => { window.location.href = res.url },
  })

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => api.delete('/api/google/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-status'] })
      queryClient.invalidateQueries({ queryKey: ['google-events'] })
      setSnackbar({ open: true, message: 'Google Calendar desconectado.', severity: 'success' })
    },
  })

  const tasks = data?.data ?? []

  const buildScheduledStart = (date: string, time: string): string | null => {
    if (!date) return null
    const t = time || '09:00'
    return dayjs(`${date}T${t}`).toISOString()
  }

  const createMutation = useMutation({
    mutationFn: (body: typeof emptyForm) =>
      api.post('/api/tasks', {
        ...body,
        scheduledStart: buildScheduledStart(body.scheduledDate, body.scheduledTime),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); handleClose() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Task & { id: string; scheduledDate?: string; scheduledTime?: string }) =>
      api.put(`/api/tasks/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  })

  const handleOpen = (task?: Task) => {
    if (task) {
      setEditTask(task)
      const sDate = task.scheduledStart ? dayjs(task.scheduledStart).format('YYYY-MM-DD') : ''
      const sTime = task.scheduledStart ? dayjs(task.scheduledStart).format('HH:mm') : ''
      setForm({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? dayjs(task.dueDate).format('YYYY-MM-DD') : '',
        scheduledDate: sDate,
        scheduledTime: sTime,
      })
    } else {
      setEditTask(null)
      setForm(emptyForm)
    }
    setDialogOpen(true)
  }

  const handleClose = () => { setDialogOpen(false); setEditTask(null); setForm(emptyForm) }

  const handleSave = () => {
    if (!form.title) return
    const scheduledStart = buildScheduledStart(form.scheduledDate, form.scheduledTime)
    if (editTask) {
      updateMutation.mutate({
        ...editTask,
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        scheduledStart,
      })
    } else {
      createMutation.mutate(form)
    }
    handleClose()
  }

  const handleScheduleFromCalendar = (taskId: string, scheduledStart: string | null) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    updateMutation.mutate({ ...task, scheduledStart })
  }

  const getByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)

  const handleKanbanDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleColDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverCol(status)
  }

  const handleColDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === status) { setDragOverCol(null); return }
    updateMutation.mutate({ ...task, status })
    setDragOverCol(null)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tarefas</Typography>
          <Typography variant="body2" color="text.secondary">Kanban e calendário da equipe</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {googleConnected ? (
            <Tooltip title="Desconectar Google Calendar">
              <Button
                variant="outlined"
                size="small"
                startIcon={<LinkOff sx={{ fontSize: 16 }} />}
                onClick={() => disconnectGoogleMutation.mutate()}
                sx={{ borderColor: '#34A853', color: '#34A853', '&:hover': { borderColor: '#2E7D32', bgcolor: '#E8F5E9' } }}
              >
                Google Calendar
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Visualize seus eventos do Google Calendar no calendário de tarefas">
              <Button
                variant="outlined"
                size="small"
                startIcon={<Google sx={{ fontSize: 16 }} />}
                onClick={() => connectGoogleMutation.mutate()}
                disabled={connectGoogleMutation.isPending}
                sx={{ borderColor: '#4285F4', color: '#4285F4', '&:hover': { borderColor: '#1a73e8', bgcolor: '#E8F0FE' } }}
              >
                Conectar Google Calendar
              </Button>
            </Tooltip>
          )}
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Nova Tarefa</Button>
        </Box>
      </Box>

      {/* Kanban Board */}
      <Grid container spacing={2}>
        {statusColumns.map((col) => (
          <Grid item xs={12} sm={6} md={3} key={col.key}>
            <Box
              sx={{
                bgcolor: dragOverCol === col.key ? col.bg : '#F8FAFF',
                borderRadius: 3,
                p: 1.5,
                border: `1px solid ${dragOverCol === col.key ? col.color : '#E9ECEF'}`,
                minHeight: 400,
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
              onDragOver={(e) => handleColDragOver(e, col.key)}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
              onDrop={(e) => handleColDrop(e, col.key)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.color }} />
                <Typography variant="body2" fontWeight={600}>{col.label}</Typography>
                <Chip
                  label={isLoading ? '…' : getByStatus(col.key).length}
                  size="small"
                  sx={{ height: 18, fontSize: 11, bgcolor: col.bg, color: col.color, ml: 'auto', '& .MuiChip-label': { px: 0.75 } }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {getByStatus(col.key).map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleKanbanDragStart(e, task.id)}
                    sx={{
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: 3 },
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                    onClick={() => handleOpen(task)}
                  >
                    <CardContent sx={{ p: '12px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, mr: 1, lineHeight: 1.4 }}>
                          {task.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id) }}
                          sx={{ color: 'text.secondary', p: 0.25, '&:hover': { color: '#EF4444' } }}
                        >
                          <Delete sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>

                      {task.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}>
                          {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Chip
                          label={priorityConfig[task.priority].label}
                          size="small"
                          sx={{ height: 18, fontSize: 10, color: priorityConfig[task.priority].color, bgcolor: `${priorityConfig[task.priority].color}15`, '& .MuiChip-label': { px: 0.75 } }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {task.scheduledStart && (
                            <CalendarMonth sx={{ fontSize: 12, color: '#0066CC' }} />
                          )}
                          {task.assignee && (
                            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: '#E8F0FF', color: '#0066CC' }}>
                              {task.assignee.name[0]}
                            </Avatar>
                          )}
                        </Box>
                      </Box>

                      {task.scheduledStart && (
                        <Typography variant="caption" sx={{ color: '#0066CC', fontSize: 10, display: 'block', mt: 0.5 }}>
                          {dayjs(task.scheduledStart).format('ddd, D MMM [às] HH:mm')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => { setForm(f => ({ ...f, status: col.key })); setDialogOpen(true) }}
                  sx={{ color: 'text.secondary', justifyContent: 'flex-start', fontSize: '0.8rem', '&:hover': { color: '#0066CC', bgcolor: col.bg } }}
                >
                  Adicionar
                </Button>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Calendário */}
      <Divider sx={{ my: 4 }} />
      <TaskCalendar
        tasks={tasks}
        googleEvents={googleEvents}
        googleConnected={googleConnected}
        onSchedule={handleScheduleFromCalendar}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
      />

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Título*"
            value={form.title}
            onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
            fullWidth size="small"
          />
          <TextField
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            fullWidth size="small" multiline rows={2}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as TaskStatus }))}>
                {statusColumns.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Prioridade</InputLabel>
              <Select label="Prioridade" value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value as Priority }))}>
                {Object.entries(priorityConfig).map(([v, c]) => <MenuItem key={v} value={v}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <DateField
            label="Prazo de entrega"
            value={form.dueDate}
            onChange={(v) => setForm(p => ({ ...p, dueDate: v }))}
          />

          {/* Agendamento no calendário */}
          <Box sx={{ borderTop: '1px solid #E9ECEF', pt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CalendarMonth sx={{ fontSize: 16, color: '#0066CC' }} />
              <Typography variant="body2" fontWeight={600} color="primary">
                Agendar no calendário
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Data"
                type="date"
                size="small"
                fullWidth
                value={form.scheduledDate}
                onChange={(e) => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Horário"
                type="time"
                size="small"
                fullWidth
                value={form.scheduledTime}
                onChange={(e) => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                disabled={!form.scheduledDate}
              />
            </Box>
            {form.scheduledDate && (
              <Button
                size="small"
                sx={{ mt: 0.5, color: 'text.secondary', fontSize: 11 }}
                onClick={() => setForm(p => ({ ...p, scheduledDate: '', scheduledTime: '' }))}
              >
                Remover agendamento
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!form.title || createMutation.isPending || updateMutation.isPending}
          >
            {editTask ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
