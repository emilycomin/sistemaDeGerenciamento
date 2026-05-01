import { useState, useMemo } from 'react'
import {
  Box, Button, Card, CardContent, Typography, Grid, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, Tab,
  Tooltip, Skeleton, LinearProgress, ToggleButtonGroup, ToggleButton,
  Menu, Switch, FormControlLabel, Alert,
} from '@mui/material'
import {
  Add, TrendingUp, TrendingDown, AccountBalance,
  Delete, Edit, WarningAmber, Flag, Settings,
  FileDownload, Print, CalendarToday, Repeat,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import DateField from '../components/Common/DateField'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionType = 'INCOME' | 'EXPENSE'
type PaymentStatus   = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'

interface ServiceOption { id: string; name: string; price: number; category: string | null }
type Period          = '1M' | '3M' | '6M' | '1Y' | 'custom'

interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
  status: PaymentStatus
  notes?: string
  recurring?: boolean
}

interface Summary {
  income: number
  expenses: number
  balance: number
  revenueGoal: number | null
  expenseLimit: number | null
}

interface MonthData { month: string; receita: number; despesa: number }

// ─── Config ──────────────────────────────────────────────────────────────────

const statusConfig: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendente',  color: '#F59E0B', bg: '#FFFBEB' },
  PAID:      { label: 'Pago',      color: '#10B981', bg: '#ECFDF5' },
  OVERDUE:   { label: 'Vencido',   color: '#EF4444', bg: '#FEF2F2' },
  CANCELLED: { label: 'Cancelado', color: '#6B7280', bg: '#F9FAFB' },
}

const INCOME_CATEGORIES  = ['Gerenciamento de Perfil', 'Pack de Conteúdo', 'Sprint de Conteúdo', 'Diagnóstico Estratégico', 'Auditoria', 'Design Avulso', 'Freela', 'Outros']
const EXPENSE_CATEGORIES = ['Ferramentas & Softwares', 'Marketing', 'Operacional', 'Impostos', 'Pessoal', 'Outros']

const makeEmpty = (type: TransactionType = 'INCOME') => ({
  type,
  amount: '',
  description: '',
  category: type === 'INCOME' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
  date: new Date().toISOString().split('T')[0],
  status: 'PAID' as PaymentStatus,
  notes: '',
  serviceId: '',
  recurring: false,
  recurrenceEnd: '',
})

/** Conta quantas ocorrências mensais existem entre duas datas ISO */
function countMonths(from: string, to: string): number {
  if (!from || !to) return 0
  const start = new Date(from)
  const end   = new Date(to)
  if (end < start) return 0
  let n = 0
  let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (cur <= end && n <= 60) { n++; cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()) }
  return n
}

/** Formata mês abreviado em pt-BR (ex: "Abr/25") */
function fmtMonth(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}

/** Lista os primeiros N e últimos nomes de meses do range */
function previewMonths(from: string, to: string): string {
  if (!from || !to) return ''
  const start = new Date(from)
  const end   = new Date(to)
  const months: string[] = []
  let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (cur <= end && months.length <= 60) {
    months.push(fmtMonth(new Date(cur)))
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate())
  }
  if (months.length <= 4) return months.join(', ')
  return `${months.slice(0, 2).join(', ')} ... ${months.slice(-2).join(', ')}`
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const isoDate = (d: Date) => d.toISOString().split('T')[0]

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodDates(period: Period, customFrom: string, customTo: string) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()

  if (period === 'custom') {
    return {
      dateFrom: customFrom,
      dateTo:   customTo,
      months:   6,
      label:    `${customFrom} → ${customTo}`,
    }
  }
  if (period === '1M') {
    return {
      dateFrom: isoDate(new Date(year, month, 1)),
      dateTo:   isoDate(new Date(year, month + 1, 0)),
      months:   1,
      label:    'Este mês',
    }
  }
  if (period === '3M') {
    return {
      dateFrom: isoDate(new Date(year, month - 2, 1)),
      dateTo:   isoDate(new Date(year, month + 1, 0)),
      months:   3,
      label:    'Últimos 3 meses',
    }
  }
  if (period === '6M') {
    return {
      dateFrom: isoDate(new Date(year, month - 5, 1)),
      dateTo:   isoDate(new Date(year, month + 1, 0)),
      months:   6,
      label:    'Últimos 6 meses',
    }
  }
  // '1Y'
  return {
    dateFrom: isoDate(new Date(year, 0, 1)),
    dateTo:   isoDate(new Date(year, 11, 31)),
    months:   12,
    label:    'Este ano',
  }
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportCSV(transactions: Transaction[], periodLabel: string) {
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Status', 'Valor (R$)']
  const rows = transactions.map(tx => [
    new Date(tx.date).toLocaleDateString('pt-BR'),
    tx.type === 'INCOME' ? 'Receita' : 'Despesa',
    `"${tx.description.replace(/"/g, '""')}"`,
    `"${tx.category}"`,
    statusConfig[tx.status].label,
    tx.amount.toFixed(2).replace('.', ','),
  ])
  const csv = [header, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `financas-${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPrint(transactions: Transaction[], summary: Summary | undefined, periodLabel: string) {
  const totalIncome   = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpense  = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const balance       = totalIncome - totalExpense

  const rows = transactions.map(tx => `
    <tr>
      <td>${new Date(tx.date).toLocaleDateString('pt-BR')}</td>
      <td style="color:${tx.type === 'INCOME' ? '#10B981' : '#EF4444'}">${tx.type === 'INCOME' ? 'Receita' : 'Despesa'}</td>
      <td>${tx.description}</td>
      <td>${tx.category}</td>
      <td>${statusConfig[tx.status].label}</td>
      <td style="text-align:right;font-weight:600;color:${tx.type === 'INCOME' ? '#10B981' : '#EF4444'}">
        ${tx.type === 'INCOME' ? '+' : '−'}${fmt(tx.amount)}
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Financeiro — ${periodLabel}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1A1A1A; padding: 32px; font-size: 13px }
    h1 { font-size: 20px; margin: 0 0 4px }
    .sub { color: #6B7280; margin: 0 0 24px; font-size: 13px }
    .kpis { display: flex; gap: 20px; margin-bottom: 24px }
    .kpi { background: #F8FAFF; border-radius: 8px; padding: 14px 20px; flex: 1 }
    .kpi .label { font-size: 11px; color: #6B7280; margin-bottom: 4px }
    .kpi .val { font-size: 18px; font-weight: 700 }
    table { width: 100%; border-collapse: collapse }
    th { background: #F8FAFF; font-size: 11px; color: #6B7280; text-align: left; padding: 8px 10px; text-transform: uppercase; letter-spacing: .04em }
    td { padding: 8px 10px; border-bottom: 1px solid #F0F0F0 }
    @media print { body { padding: 0 } }
  </style>
</head>
<body>
  <h1>Relatório Financeiro</h1>
  <p class="sub">Período: ${periodLabel} &nbsp;·&nbsp; Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  <div class="kpis">
    <div class="kpi"><div class="label">Receitas</div><div class="val" style="color:#10B981">${fmt(totalIncome)}</div></div>
    <div class="kpi"><div class="label">Despesas</div><div class="val" style="color:#EF4444">${fmt(totalExpense)}</div></div>
    <div class="kpi"><div class="label">Saldo</div><div class="val" style="color:${balance >= 0 ? '#0066CC' : '#EF4444'}">${fmt(balance)}</div></div>
    ${summary?.revenueGoal ? `<div class="kpi"><div class="label">Meta faturamento</div><div class="val" style="color:#0066CC">${fmt(summary.revenueGoal)}</div></div>` : ''}
  </div>
  <table>
    <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Status</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}

// ─── Mini KPI card ────────────────────────────────────────────────────────────

interface MiniKpiProps {
  title: string
  value: string
  icon: React.ReactNode
  color: string
  bg: string
  loading?: boolean
  onClick?: () => void
  actionLabel?: string
  extra?: React.ReactNode
}

function MiniKpi({ title, value, icon, color, bg, loading, onClick, actionLabel, extra }: MiniKpiProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%', cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        ...(onClick && {
          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.09)', '& .kpi-hint': { opacity: 1 } },
        }),
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: extra ? 1 : 0 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{title}</Typography>
            {loading
              ? <Skeleton variant="text" width={90} height={32} />
              : <Typography variant="h6" fontWeight={700} sx={{ color, lineHeight: 1.3 }}>{value}</Typography>
            }
            {actionLabel && (
              <Typography className="kpi-hint" variant="caption"
                sx={{ color, opacity: 0, transition: 'opacity 0.15s', fontWeight: 600, display: 'block', mt: 0.25 }}>
                + {actionLabel}
              </Typography>
            )}
          </Box>
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
            {icon}
          </Box>
        </Box>
        {extra}
      </CardContent>
    </Card>
  )
}

// ─── Radial Progress ─────────────────────────────────────────────────────────

function RadialProgress({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const clamped = Math.min(pct, 100)
  const data = [{ value: clamped, fill: color }]
  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RadialBarChart width={size} height={size} innerRadius={size * 0.38} outerRadius={size * 0.48}
        data={data} startAngle={90} endAngle={-270} barSize={size * 0.12}>
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: '#F3F4F6' }} dataKey="value" angleAxisId={0} cornerRadius={4} />
      </RadialBarChart>
      <Typography variant="caption" fontWeight={700} sx={{ position: 'absolute', color, fontSize: size * 0.17 }}>
        {Math.round(clamped)}%
      </Typography>
    </Box>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Finance() {
  const [tabFilter,    setTabFilter]    = useState<'ALL' | TransactionType>('ALL')
  const [period,       setPeriod]       = useState<Period>('1M')
  const [customFrom,   setCustomFrom]   = useState(isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [customTo,     setCustomTo]     = useState(isoDate(new Date()))
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [editTx,       setEditTx]       = useState<Transaction | null>(null)
  const [form,         setForm]         = useState(makeEmpty())
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [goalsOpen,        setGoalsOpen]        = useState(false)
  const [goalsForm,        setGoalsForm]        = useState({ revenueGoal: '', expenseLimit: '' })
  const [exportAnchor,     setExportAnchor]     = useState<null | HTMLElement>(null)
  const [recurringSuccess, setRecurringSuccess] = useState<number | null>(null)

  const queryClient = useQueryClient()

  const { dateFrom, dateTo, months, label: periodLabel } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo]
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance'] })
    queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    queryClient.invalidateQueries({ queryKey: ['finance-monthly'] })
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['finance', tabFilter, dateFrom, dateTo],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '500', dateFrom, dateTo })
      if (tabFilter !== 'ALL') p.set('type', tabFilter)
      return api.get<{ data: Transaction[] }>(`/api/finance?${p}`)
    },
    staleTime: 0,
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get<{ data: Summary }>('/api/finance/summary'),
    staleTime: 0,
  })

  const { data: monthlyData } = useQuery({
    queryKey: ['finance-monthly', months],
    queryFn: () => api.get<{ data: MonthData[] }>(`/api/finance/monthly?months=${months}`),
    staleTime: 0,
  })

  const { data: servicesData } = useQuery({
    queryKey: ['services-active'],
    queryFn: () => api.get<{ data: ServiceOption[] }>('/api/services?status=ACTIVE'),
    staleTime: 60_000,
  })

  const transactions   = txData?.data ?? []
  const activeServices = servicesData?.data ?? []
  const summary      = summaryData?.data
  const chartData    = monthlyData?.data ?? []
  const hasChart     = chartData.some(d => d.receita > 0 || d.despesa > 0)

  const revGoal  = summary?.revenueGoal ?? null
  const expLimit = summary?.expenseLimit ?? null
  const revPct   = revGoal && revGoal > 0 ? (summary!.income / revGoal) * 100 : null
  const expPct   = expLimit && expLimit > 0 ? (summary!.expenses / expLimit) * 100 : null

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post<{ data: Transaction; count?: number; recurring?: boolean }>('/api/finance', body),
    onSuccess: (res) => {
      invalidate()
      if (res.recurring && res.count && res.count > 1) {
        setRecurringSuccess(res.count)
      }
      handleClose()
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: typeof form & { id: string }) => api.put(`/api/finance/${id}`, body),
    onSuccess: () => { invalidate(); handleClose() },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/finance/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })
  const goalsMutation = useMutation({
    mutationFn: (body: { revenueGoal: string; expenseLimit: string }) =>
      api.put('/api/finance/goals', body),
    onSuccess: () => { invalidate(); setGoalsOpen(false) },
  })

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleOpen = (type: TransactionType = 'INCOME', tx?: Transaction) => {
    if (tx) {
      setEditTx(tx)
      setForm({ type: tx.type, amount: String(tx.amount), description: tx.description, category: tx.category, date: tx.date.split('T')[0], status: tx.status, notes: tx.notes ?? '', serviceId: (tx as Transaction & { serviceId?: string }).serviceId ?? '', recurring: false, recurrenceEnd: '' })
    } else {
      setEditTx(null)
      setForm(makeEmpty(type))
    }
    setDialogOpen(true)
  }

  const handleClose = () => { setDialogOpen(false); setEditTx(null); setForm(makeEmpty()); }

  const handleSave = () => {
    if (!form.description || !form.amount) return
    if (editTx) updateMutation.mutate({ ...form, id: editTx.id })
    else createMutation.mutate(form)
  }

  const openGoals = () => {
    setGoalsForm({
      revenueGoal: summary?.revenueGoal ? String(summary.revenueGoal) : '',
      expenseLimit: summary?.expenseLimit ? String(summary.expenseLimit) : '',
    })
    setGoalsOpen(true)
  }

  const categories = form.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Finanças</Typography>
          <Typography variant="body2" color="text.secondary">Controle de receitas e despesas</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Configurar metas e tetos">
            <Button variant="outlined" startIcon={<Settings />} onClick={openGoals} size="small">
              Metas & Limites
            </Button>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Nova Transação</Button>
        </Box>
      </Box>

      {/* Recurring success banner */}
      {recurringSuccess && (
        <Alert
          icon={<Repeat fontSize="inherit" />}
          severity="success"
          onClose={() => setRecurringSuccess(null)}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <strong>{recurringSuccess} transações recorrentes</strong> criadas com sucesso — uma para cada mês do período.
        </Alert>
      )}

      {/* KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>

        {/* Receita */}
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Clique para registrar nova receita" placement="top">
            <Box sx={{ height: '100%' }}>
              <MiniKpi
                title="Receita do mês" loading={summaryLoading}
                value={fmt(summary?.income ?? 0)}
                icon={<TrendingUp fontSize="small" />} color="#10B981" bg="#ECFDF5"
                onClick={() => handleOpen('INCOME')} actionLabel="Nova Receita"
                extra={revPct !== null ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Meta: {fmt(revGoal!)}</Typography>
                      <Typography variant="caption" fontWeight={700} color={revPct >= 100 ? '#10B981' : '#F59E0B'}>{Math.round(revPct)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(revPct, 100)}
                      sx={{ height: 4, borderRadius: 2, bgcolor: '#E9ECEF', '& .MuiLinearProgress-bar': { bgcolor: revPct >= 100 ? '#10B981' : '#F59E0B', borderRadius: 2 } }} />
                  </Box>
                ) : undefined}
              />
            </Box>
          </Tooltip>
        </Grid>

        {/* Despesas */}
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Clique para registrar nova despesa" placement="top">
            <Box sx={{ height: '100%' }}>
              <MiniKpi
                title="Despesas do mês" loading={summaryLoading}
                value={fmt(summary?.expenses ?? 0)}
                icon={<TrendingDown fontSize="small" />} color="#EF4444" bg="#FEF2F2"
                onClick={() => handleOpen('EXPENSE')} actionLabel="Nova Despesa"
                extra={expPct !== null ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Teto: {fmt(expLimit!)}</Typography>
                      <Typography variant="caption" fontWeight={700} color={expPct >= 100 ? '#EF4444' : expPct >= 80 ? '#F59E0B' : '#10B981'}>{Math.round(expPct)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(expPct, 100)}
                      sx={{ height: 4, borderRadius: 2, bgcolor: '#E9ECEF', '& .MuiLinearProgress-bar': { bgcolor: expPct >= 100 ? '#EF4444' : expPct >= 80 ? '#F59E0B' : '#10B981', borderRadius: 2 } }} />
                  </Box>
                ) : undefined}
              />
            </Box>
          </Tooltip>
        </Grid>

        {/* Saldo */}
        <Grid item xs={12} sm={6} md={3}>
          <MiniKpi
            title="Saldo do mês" loading={summaryLoading}
            value={fmt(summary?.balance ?? 0)}
            icon={<AccountBalance fontSize="small" />}
            color={(summary?.balance ?? 0) >= 0 ? '#0066CC' : '#EF4444'}
            bg={(summary?.balance ?? 0) >= 0 ? '#E8F0FF' : '#FEF2F2'}
          />
        </Grid>

        {/* Meta de faturamento — Radial */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>Meta de Faturamento</Typography>
                  {revGoal ? (
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#0066CC', mt: 0.25 }}>{fmt(revGoal)}</Typography>
                  ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>Não definida</Typography>
                  )}
                  {revGoal && (
                    <Typography variant="caption" color="text.secondary">
                      Falta: {fmt(Math.max(0, revGoal - (summary?.income ?? 0)))}
                    </Typography>
                  )}
                </Box>
                {revPct !== null ? (
                  <RadialProgress pct={revPct} color={revPct >= 100 ? '#10B981' : '#0066CC'} size={72} />
                ) : (
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#E8F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0066CC' }}>
                    <Flag fontSize="small" />
                  </Box>
                )}
              </Box>
              {!revGoal && (
                <Button size="small" sx={{ mt: 1, fontSize: '0.7rem', p: 0, color: '#0066CC' }} onClick={openGoals}>
                  + Definir meta
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Period selector + Chart ─────────────────────────────────────── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>

          {/* Top bar: title left, period toggles + export right */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>Fluxo Financeiro</Typography>
              <Typography variant="caption" color="text.secondary">{periodLabel}</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <ToggleButtonGroup
                value={period} exclusive
                onChange={(_, v) => { if (v) setPeriod(v as Period) }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5, py: 0.5, fontSize: '0.75rem', textTransform: 'none', fontWeight: 500,
                    border: '1px solid #E9ECEF !important', borderRadius: '6px !important', mx: '2px',
                    '&.Mui-selected': { bgcolor: '#0066CC', color: '#fff', '&:hover': { bgcolor: '#0052A3' } },
                  },
                }}
              >
                <ToggleButton value="1M">Este mês</ToggleButton>
                <ToggleButton value="3M">3 meses</ToggleButton>
                <ToggleButton value="6M">6 meses</ToggleButton>
                <ToggleButton value="1Y">Este ano</ToggleButton>
                <ToggleButton value="custom"><CalendarToday sx={{ fontSize: 14, mr: 0.5 }} />Custom</ToggleButton>
              </ToggleButtonGroup>

              {/* Export button */}
              <Button
                size="small" variant="outlined"
                startIcon={<FileDownload />}
                onClick={(e) => setExportAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', fontWeight: 500, fontSize: '0.78rem' }}
              >
                Exportar
              </Button>
              <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
                <MenuItem onClick={() => { exportCSV(transactions, periodLabel); setExportAnchor(null) }}
                  sx={{ fontSize: '0.85rem', gap: 1 }}>
                  <FileDownload fontSize="small" /> CSV (.csv)
                </MenuItem>
                <MenuItem onClick={() => { exportPrint(transactions, summary, periodLabel); setExportAnchor(null) }}
                  sx={{ fontSize: '0.85rem', gap: 1 }}>
                  <Print fontSize="small" /> Imprimir / PDF
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {/* Custom date pickers */}
          {period === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 160 }}>
                <DateField label="Data inicial" value={customFrom} onChange={setCustomFrom} />
              </Box>
              <Box sx={{ minWidth: 160 }}>
                <DateField label="Data final" value={customTo} minDate={customFrom} onChange={setCustomTo} />
              </Box>
            </Box>
          )}

          {/* Legend chips */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Chip size="small" label="Receita" sx={{ bgcolor: '#E8F0FF', color: '#0066CC', fontWeight: 500 }} />
            <Chip size="small" label="Despesa" sx={{ bgcolor: '#FEF2F2', color: '#EF4444', fontWeight: 500 }} />
          </Box>

          {!hasChart ? (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFF', borderRadius: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <AccountBalance sx={{ fontSize: 40, color: '#DEE2E6', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Registre transações para ver o gráfico.</Typography>
              </Box>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: unknown) => fmt(v as number)} contentStyle={{ borderRadius: 8, border: '1px solid #E9ECEF' }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="receita" fill="#0066CC" radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="despesa" fill="#EF4444" fillOpacity={0.7} radius={[4, 4, 0, 0]} name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2, pt: 1, borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={tabFilter} onChange={(_, v) => setTabFilter(v)}
              sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: '0.82rem', textTransform: 'none', fontWeight: 500 } }}>
              <Tab label="Todas" value="ALL" />
              <Tab label="Receitas" value="INCOME" />
              <Tab label="Despesas" value="EXPENSE" />
            </Tabs>
            <Typography variant="caption" color="text.secondary" sx={{ pr: 1 }}>
              {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'} · {periodLabel}
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#F8FAFF', fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' } }}>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <AccountBalance sx={{ fontSize: 48, color: '#DEE2E6', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">Nenhuma transação no período selecionado</Typography>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1.5 }}>
                        <Button size="small" variant="outlined" color="success" startIcon={<Add />} onClick={() => handleOpen('INCOME')}>Nova Receita</Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<Add />} onClick={() => handleOpen('EXPENSE')}>Nova Despesa</Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : transactions.map((tx) => (
                  <TableRow key={tx.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFF' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: tx.type === 'INCOME' ? '#10B981' : '#EF4444' }}>
                          {tx.type === 'INCOME' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{tx.description}</Typography>
                          {tx.notes && <Typography variant="caption" color="text.secondary">{tx.notes}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={tx.category} size="small" sx={{ bgcolor: '#F8FAFF', fontSize: '0.72rem' }} /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{new Date(tx.date).toLocaleDateString('pt-BR')}</Typography></TableCell>
                    <TableCell>
                      <Chip label={statusConfig[tx.status].label} size="small"
                        sx={{ bgcolor: statusConfig[tx.status].bg, color: statusConfig[tx.status].color, fontWeight: 600, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ color: tx.type === 'INCOME' ? '#10B981' : '#EF4444' }}>
                        {tx.type === 'INCOME' ? '+' : '−'}{fmt(tx.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpen(tx.type, tx)} sx={{ color: 'text.secondary', '&:hover': { color: '#0066CC' } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => setDeleteTarget(tx)} sx={{ color: 'text.secondary', '&:hover': { color: '#EF4444' } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editTx ? 'Editar Transação' : form.type === 'INCOME' ? '+ Nova Receita' : '+ Nova Despesa'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Tipo */}
            <FormControl size="small" fullWidth>
              <InputLabel shrink>Tipo</InputLabel>
              <Select label="Tipo" notched value={form.type}
                onChange={(e) => setForm(p => ({
                  ...p,
                  type: e.target.value as TransactionType,
                  category: e.target.value === 'INCOME' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
                  serviceId: '',
                }))}>
                <MenuItem value="INCOME">Receita</MenuItem>
                <MenuItem value="EXPENSE">Despesa</MenuItem>
              </Select>
            </FormControl>

            {/* Serviço — ao lado do Tipo, apenas para receitas */}
            {form.type === 'INCOME' && (
              <FormControl size="small" fullWidth>
                <InputLabel shrink>Serviço</InputLabel>
                <Select
                  label="Serviço"
                  notched
                  value={form.serviceId}
                  onChange={(e) => {
                    const svc = activeServices.find(s => s.id === e.target.value)
                    setForm(p => ({
                      ...p,
                      serviceId: e.target.value,
                      ...(svc && {
                        description: svc.name,
                        amount: String(svc.price),
                        category: svc.category ?? p.category,
                      }),
                    }))
                  }}
                >
                  {activeServices.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 2 }}>
                        <span>{s.name}</span>
                        <Typography variant="caption" color="text.secondary">{fmt(s.price)}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Categoria — ao lado do Tipo, apenas para despesas */}
            {form.type === 'EXPENSE' && (
              <FormControl size="small" fullWidth>
                <InputLabel shrink>Categoria</InputLabel>
                <Select label="Categoria" notched value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                  {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Box>

          <TextField label="Descrição*" value={form.description} fullWidth size="small"
            InputLabelProps={{ shrink: true }}
            placeholder="Ex: Gerenciamento de perfil — Cliente X"
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField label="Valor (R$)*" type="number" value={form.amount} fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              placeholder="0,00"
              inputProps={{ min: 0, step: '0.01' }}
              onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} />
            <DateField label="Data" value={form.date} onChange={(v) => setForm(p => ({ ...p, date: v }))} />
          </Box>
          <FormControl size="small" fullWidth>
            <InputLabel shrink>Status</InputLabel>
            <Select label="Status" notched value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as PaymentStatus }))}>
              {Object.entries(statusConfig).map(([v, c]) => <MenuItem key={v} value={v}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Observações" value={form.notes} fullWidth size="small" multiline rows={2}
            InputLabelProps={{ shrink: true }}
            placeholder="Informações adicionais sobre esta transação..."
            onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />

          {/* ── Recorrência ─────────────────────────────────────────────── */}
          {!editTx && (
            <Box sx={{ border: '1px solid', borderColor: form.recurring ? '#0066CC40' : '#E9ECEF', borderRadius: 2, p: 1.5, bgcolor: form.recurring ? '#F0F6FF' : 'transparent', transition: 'all 0.2s' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.recurring}
                    onChange={(e) => setForm(p => ({ ...p, recurring: e.target.checked, recurrenceEnd: '' }))}
                    size="small"
                    sx={{ '& .MuiSwitch-thumb': { bgcolor: form.recurring ? '#0066CC' : undefined } }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Repeat sx={{ fontSize: 16, color: form.recurring ? '#0066CC' : 'text.secondary' }} />
                    <Typography variant="body2" fontWeight={500} color={form.recurring ? '#0066CC' : 'text.secondary'}>
                      Repetir mensalmente
                    </Typography>
                  </Box>
                }
              />

              {form.recurring && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <DateField
                      label="Repetir até *"
                      value={form.recurrenceEnd}
                      minDate={form.date}
                      onChange={(v) => setForm(p => ({ ...p, recurrenceEnd: v }))}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      A transação será gerada no mesmo dia de cada mês até essa data
                    </Typography>
                  </Box>

                  {form.recurrenceEnd && countMonths(form.date, form.recurrenceEnd) > 0 && (() => {
                    const n = countMonths(form.date, form.recurrenceEnd)
                    const preview = previewMonths(form.date, form.recurrenceEnd)
                    return (
                      <Alert
                        icon={<Repeat fontSize="inherit" />}
                        severity="info"
                        sx={{ py: 0.5, fontSize: '0.78rem', '& .MuiAlert-message': { py: 0.5 } }}
                      >
                        <strong>{n} transação{n > 1 ? 'ões' : ''}</strong> serão criadas automaticamente<br />
                        <Typography variant="caption" color="text.secondary">{preview}</Typography>
                      </Alert>
                    )
                  })()}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained"
            disabled={
              !form.description || !form.amount ||
              (form.recurring && !form.recurrenceEnd) ||
              createMutation.isPending || updateMutation.isPending
            }>
            {editTx
              ? 'Salvar alterações'
              : form.recurring && form.recurrenceEnd
                ? `Criar ${countMonths(form.date, form.recurrenceEnd)} transações`
                : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Metas & Limites Dialog ───────────────────────────────────────── */}
      <Dialog open={goalsOpen} onClose={() => setGoalsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Flag sx={{ color: '#0066CC' }} /> Metas & Limites Mensais
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          <Box>
            <Typography variant="body2" fontWeight={600} color="#10B981" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingUp fontSize="small" /> Meta de Faturamento
            </Typography>
            <TextField
              label="Valor mensal desejado (R$)"
              type="number" fullWidth size="small"
              value={goalsForm.revenueGoal}
              inputProps={{ min: 0, step: '0.01' }}
              onChange={(e) => setGoalsForm(p => ({ ...p, revenueGoal: e.target.value }))}
              helperText="Quanto quer faturar este mês?"
            />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} color="#EF4444" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingDown fontSize="small" /> Teto de Gastos
            </Typography>
            <TextField
              label="Limite máximo de despesas (R$)"
              type="number" fullWidth size="small"
              value={goalsForm.expenseLimit}
              inputProps={{ min: 0, step: '0.01' }}
              onChange={(e) => setGoalsForm(p => ({ ...p, expenseLimit: e.target.value }))}
              helperText="Alerta quando os gastos chegarem perto desse limite"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGoalsOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={() => goalsMutation.mutate(goalsForm)} variant="contained"
            disabled={goalsMutation.isPending}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
          <WarningAmber sx={{ color: '#EF4444' }} /> Excluir transação
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tem certeza que deseja excluir <strong>{deleteTarget?.description}</strong>?
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
