import { Grid, Card, CardContent, Typography, Box, Avatar, Chip, LinearProgress, Skeleton } from '@mui/material'
import { TrendingUp, TrendingDown, People, AccountBalance, Flag, Percent } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface StatCardProps {
  title: string
  value: string
  change?: string
  positive?: boolean
  icon: React.ReactNode
  color: string
  bgColor: string
  loading?: boolean
}

function StatCard({ title, value, change, positive, icon, color, bgColor, loading }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        {loading ? <Skeleton variant="rounded" height={70} /> : (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
              <Typography variant="h5" fontWeight={700} color="text.primary">{value}</Typography>
              {change && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {positive
                    ? <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                    : <TrendingDown sx={{ fontSize: 14, color: '#EF4444' }} />}
                  <Typography variant="caption" color={positive ? '#10B981' : '#EF4444'} fontWeight={600}>{change}</Typography>
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: bgColor, width: 44, height: 44, borderRadius: 2 }}>
              <Box sx={{ color }}>{icon}</Box>
            </Avatar>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const { data: financeSummary, isLoading: financeLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get<{ data: { income: number; expenses: number; balance: number } }>('/api/finance/summary'),
    staleTime: 0,
  })

  const { data: monthlyData } = useQuery({
    queryKey: ['finance-monthly'],
    queryFn: () => api.get<{ data: { month: string; receita: number; despesa: number }[] }>('/api/finance/monthly'),
    staleTime: 0,
  })

  const { data: crmStats } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: () => api.get<{ data: { total: number; CLIENT: number; conversionRate: number } }>('/api/crm/stats'),
    staleTime: 0,
  })

  const { data: goalsData } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<{ data: { id: string; title: string; progress: number; type: string; status: string }[] }>('/api/goals?limit=3&status=IN_PROGRESS'),
    staleTime: 0,
  })

  const summary = financeSummary?.data
  const stats = crmStats?.data
  const chartData = monthlyData?.data ?? []
  const goals = goalsData?.data ?? []
  const hasChartData = chartData.some(d => d.receita > 0 || d.despesa > 0)

  const goalColor = (type: string) =>
    type === 'SHORT_TERM' ? '#10B981' : type === 'MEDIUM_TERM' ? '#F59E0B' : '#0066CC'
  const goalLabel = (type: string) =>
    type === 'SHORT_TERM' ? 'Curto prazo' : type === 'MEDIUM_TERM' ? 'Médio prazo' : 'Longo prazo'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Stats */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard loading={financeLoading} title="Receita do mês" icon={<TrendingUp />}
            value={fmt(summary?.income ?? 0)} color="#10B981" bgColor="#ECFDF5" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard loading={financeLoading} title="Despesas do mês" icon={<AccountBalance />}
            value={fmt(summary?.expenses ?? 0)} color="#EF4444" bgColor="#FEF2F2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total de contatos" icon={<People />}
            value={stats ? String(stats.total) : '--'} color="#0066CC" bgColor="#E8F0FF" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Taxa de conversão" icon={<Percent />}
            value={stats ? `${stats.conversionRate}%` : '--'}
            change={stats ? `${stats.CLIENT} clientes` : undefined}
            positive color="#10B981" bgColor="#ECFDF5" />
        </Grid>
      </Grid>

      {/* Chart + Goals */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Receita vs Despesa</Typography>
                  <Typography variant="caption" color="text.secondary">Últimos 6 meses</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip size="small" label="Receita" sx={{ bgcolor: '#E8F0FF', color: '#0066CC', fontWeight: 500 }} />
                  <Chip size="small" label="Despesa" sx={{ bgcolor: '#FEF2F2', color: '#EF4444', fontWeight: 500 }} />
                </Box>
              </Box>
              {!hasChartData ? (
                <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.disabled">Registre transações para ver o gráfico</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0066CC" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.10} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: unknown) => [fmt(value as number), '']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E9ECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="receita" stroke="#0066CC" strokeWidth={2} fill="url(#colorReceita)" name="Receita" />
                    <Area type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2} fill="url(#colorDespesa)" name="Despesa" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Flag sx={{ color: '#0066CC', fontSize: 18 }} />
                <Typography variant="h6" fontWeight={600}>Metas em andamento</Typography>
              </Box>
              {goals.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled">Nenhuma meta em andamento</Typography>
                </Box>
              ) : goals.map((goal) => (
                <Box key={goal.id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1, mr: 1 }}>{goal.title}</Typography>
                    <Typography variant="caption" fontWeight={700} color={goalColor(goal.type)}>{goal.progress}%</Typography>
                  </Box>
                  <Chip label={goalLabel(goal.type)} size="small"
                    sx={{ height: 18, fontSize: 10, mb: 0.5, bgcolor: `${goalColor(goal.type)}15`, color: goalColor(goal.type), '& .MuiChip-label': { px: 0.75 } }} />
                  <LinearProgress variant="determinate" value={goal.progress}
                    sx={{ height: 5, borderRadius: 3, bgcolor: '#F3F4F6', '& .MuiLinearProgress-bar': { bgcolor: goalColor(goal.type), borderRadius: 3 } }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
