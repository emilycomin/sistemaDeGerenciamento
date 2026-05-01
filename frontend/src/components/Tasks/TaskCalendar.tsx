import { useState, useRef } from 'react'
import { Box, Typography, IconButton, Paper, Tooltip, Chip } from '@mui/material'
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface CalendarTask {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  scheduledStart?: string | null
}

export interface GoogleEvent {
  id?: string | null
  title: string
  start?: string | null
  end?: string | null
  allDay?: boolean
  htmlLink?: string | null
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7h – 21h
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const priorityColors: Record<Priority, string> = {
  LOW: '#6B7280',
  MEDIUM: '#0066CC',
  HIGH: '#EF4444',
  URGENT: '#7C3AED',
}

const statusBg: Record<TaskStatus, string> = {
  TODO: '#6B728020',
  IN_PROGRESS: '#F59E0B20',
  REVIEW: '#0066CC20',
  DONE: '#10B98120',
}

interface Props {
  tasks: CalendarTask[]
  googleEvents?: GoogleEvent[]
  googleConnected?: boolean
  onSchedule: (taskId: string, scheduledStart: string | null) => void
  weekOffset: number
  onWeekChange: (offset: number) => void
}

export default function TaskCalendar({
  tasks,
  googleEvents = [],
  googleConnected = false,
  onSchedule,
  weekOffset,
  onWeekChange,
}: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const dragTaskId = useRef<string | null>(null)

  const weekStart = dayjs().startOf('week').add(weekOffset, 'week')
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))
  const today = dayjs()

  const getTasksForSlot = (day: dayjs.Dayjs, hour: number) =>
    tasks.filter(t => {
      if (!t.scheduledStart) return false
      const d = dayjs(t.scheduledStart)
      return d.isSame(day, 'day') && d.hour() === hour
    })

  const getGoogleEventsForSlot = (day: dayjs.Dayjs, hour: number) =>
    googleEvents.filter(e => {
      if (!e.start || e.allDay) return false
      const d = dayjs(e.start)
      return d.isSame(day, 'day') && d.hour() === hour
    })

  const getGoogleAllDayForDay = (day: dayjs.Dayjs) =>
    googleEvents.filter(e => {
      if (!e.allDay || !e.start) return false
      return dayjs(e.start).isSame(day, 'day')
    })

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    setDragOverSlot(slotId)
  }

  const handleDrop = (e: React.DragEvent, day: dayjs.Dayjs, hour: number) => {
    e.preventDefault()
    const taskId = dragTaskId.current || e.dataTransfer.getData('taskId')
    if (!taskId) return
    const scheduledStart = day.hour(hour).minute(0).second(0).millisecond(0).toISOString()
    onSchedule(taskId, scheduledStart)
    setDragOverSlot(null)
    dragTaskId.current = null
  }

  const handleCalendarTaskDragStart = (e: React.DragEvent, taskId: string) => {
    dragTaskId.current = taskId
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0066CC', mr: 0.5 }} />
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
          Calendário de Tarefas
        </Typography>

        {googleConnected && (
          <Chip
            size="small"
            label="Google Calendar"
            sx={{
              bgcolor: '#E8F5E9',
              color: '#2E7D32',
              fontWeight: 600,
              fontSize: 11,
              height: 22,
              '& .MuiChip-label': { px: 1 },
            }}
            icon={
              <Box component="span" sx={{ fontSize: 12, ml: 0.5 }}>📅</Box>
            }
          />
        )}

        <Tooltip title="Semana anterior">
          <IconButton size="small" onClick={() => onWeekChange(weekOffset - 1)}>
            <ChevronLeft fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" fontWeight={500} sx={{ minWidth: 170, textAlign: 'center' }}>
          {weekStart.format('D MMM')} – {weekStart.add(6, 'day').format('D MMM YYYY')}
        </Typography>
        <Tooltip title="Próxima semana">
          <IconButton size="small" onClick={() => onWeekChange(weekOffset + 1)}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hoje">
          <IconButton size="small" onClick={() => onWeekChange(0)}>
            <Today fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #E9ECEF' }}>
        {/* Cabeçalho com dias */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '2px solid #E9ECEF', bgcolor: '#F8FAFF' }}>
          <Box sx={{ p: 1 }} />
          {days.map((day, i) => {
            const isToday = day.isSame(today, 'day')
            const allDay = getGoogleAllDayForDay(day)
            return (
              <Box key={i} sx={{ borderLeft: '1px solid #E9ECEF', bgcolor: isToday ? '#E8F0FF' : 'transparent' }}>
                <Box sx={{ py: 1, textAlign: 'center' }}>
                  <Typography variant="caption" display="block" sx={{ color: isToday ? '#0066CC' : 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>
                    {DAY_LABELS[day.day()]}
                  </Typography>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: isToday ? '#0066CC' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mt: 0.25 }}>
                    <Typography variant="body2" fontWeight={isToday ? 700 : 400} sx={{ color: isToday ? 'white' : 'text.primary', fontSize: 13 }}>
                      {day.date()}
                    </Typography>
                  </Box>
                </Box>
                {/* Eventos dia inteiro do Google */}
                {allDay.map((ev, idx) => (
                  <Tooltip key={idx} title={ev.title}>
                    <Box
                      component={ev.htmlLink ? 'a' : 'div'}
                      href={ev.htmlLink ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        mx: 0.5, mb: 0.5, px: 0.75, py: '1px',
                        bgcolor: '#E8F5E9',
                        borderLeft: '3px solid #34A853',
                        borderRadius: '0 3px 3px 0',
                        fontSize: 10, fontWeight: 600, color: '#2E7D32',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        cursor: ev.htmlLink ? 'pointer' : 'default',
                        textDecoration: 'none', display: 'block',
                      }}
                    >
                      {ev.title}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            )
          })}
        </Box>

        {/* Grade de horários */}
        <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
          {HOURS.map((hour) => (
            <Box key={hour} sx={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid #F3F4F6', minHeight: 56 }}>
              <Box sx={{ px: 1, pt: 0.5, color: 'text.secondary', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', userSelect: 'none' }}>
                {String(hour).padStart(2, '0')}:00
              </Box>

              {days.map((day, dayIdx) => {
                const slotId = `${day.format('YYYY-MM-DD')}-${hour}`
                const slotTasks = getTasksForSlot(day, hour)
                const slotGoogleEvents = getGoogleEventsForSlot(day, hour)
                const isOver = dragOverSlot === slotId

                return (
                  <Box
                    key={dayIdx}
                    sx={{
                      borderLeft: '1px solid #F3F4F6',
                      p: 0.5,
                      bgcolor: isOver ? '#E8F0FF' : day.isSame(today, 'day') ? '#FAFCFF' : 'transparent',
                      transition: 'background-color 0.1s',
                      minHeight: 56,
                      position: 'relative',
                    }}
                    onDragOver={(e) => handleDragOver(e, slotId)}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSlot(null) }}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  >
                    {isOver && slotTasks.length === 0 && slotGoogleEvents.length === 0 && (
                      <Box sx={{ position: 'absolute', inset: 2, border: '2px dashed #0066CC', borderRadius: 1, opacity: 0.5, pointerEvents: 'none' }} />
                    )}

                    {/* Eventos do Google Calendar */}
                    {slotGoogleEvents.map((ev, idx) => (
                      <Tooltip key={idx} title={`${ev.title} — Google Calendar`} placement="top">
                        <Box
                          component={ev.htmlLink ? 'a' : 'div'}
                          href={ev.htmlLink ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          sx={{
                            bgcolor: '#E8F5E9',
                            borderLeft: '3px solid #34A853',
                            color: '#2E7D32',
                            borderRadius: '0 4px 4px 0',
                            px: '6px', py: '2px',
                            fontSize: 11, fontWeight: 600,
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            mb: 0.5, display: 'block',
                            textDecoration: 'none',
                            cursor: ev.htmlLink ? 'pointer' : 'default',
                            '&:hover': { filter: 'brightness(0.95)' },
                          }}
                        >
                          📅 {ev.title}
                          {ev.start && (
                            <Box component="span" sx={{ ml: 0.5, fontWeight: 400, opacity: 0.8 }}>
                              {dayjs(ev.start).format('HH:mm')}
                            </Box>
                          )}
                        </Box>
                      </Tooltip>
                    ))}

                    {/* Tarefas agendadas */}
                    {slotTasks.map(task => (
                      <Tooltip key={task.id} title={task.title} placement="top">
                        <Box
                          draggable
                          onDragStart={(e) => handleCalendarTaskDragStart(e, task.id)}
                          sx={{
                            bgcolor: statusBg[task.status],
                            borderLeft: `3px solid ${priorityColors[task.priority]}`,
                            color: priorityColors[task.priority],
                            borderRadius: '0 4px 4px 0',
                            px: '6px', py: '2px',
                            fontSize: 11, fontWeight: 600,
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            mb: 0.5, cursor: 'grab',
                            '&:active': { cursor: 'grabbing', opacity: 0.7 },
                            '&:hover': { filter: 'brightness(0.95)' },
                          }}
                        >
                          {task.title}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Arraste uma tarefa do Kanban para agendar. Eventos em verde são do Google Calendar (somente leitura).
      </Typography>
    </Box>
  )
}
