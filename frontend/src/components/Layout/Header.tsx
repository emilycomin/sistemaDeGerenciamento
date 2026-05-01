import { AppBar, Toolbar, Typography, Box, Avatar, IconButton, Chip } from '@mui/material'
import { Search, Notifications } from '@mui/icons-material'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/crm': 'CRM',
  '/finance': 'Finanças',
  '/services': 'Serviços',
  '/tasks': 'Tarefas',
  '/calendar': 'Calendário',
  '/metrics': 'Métricas & KPIs',
  '/goals': 'Metas',
  '/settings': 'Configurações',
}

export default function Header() {
  const location = useLocation()
  const { user } = useAuthStore()
  const title = pageTitles[location.pathname] ?? 'GestãoPro'
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid #E9ECEF',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ gap: 2, px: 3, minHeight: '64px !important' }}>
        {/* Title */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {today}
          </Typography>
        </Box>

        {/* Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#F8FAFF',
            border: '1px solid #E9ECEF',
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            gap: 1,
            width: 240,
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': { borderColor: '#0066CC', bgcolor: '#F0F5FF' },
          }}
        >
          <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Buscar...</Typography>
          <Chip
            label="⌘K"
            size="small"
            sx={{ height: 20, fontSize: 10, bgcolor: '#E9ECEF', color: 'text.secondary', '& .MuiChip-label': { px: 0.75 } }}
          />
        </Box>

        {/* Notifications */}
        <IconButton size="small" sx={{ bgcolor: '#F8FAFF', border: '1px solid #E9ECEF', '&:hover': { bgcolor: '#F0F5FF', borderColor: '#0066CC' } }}>
          <Notifications sx={{ fontSize: 18, color: 'text.secondary' }} />
        </IconButton>

        {/* User Avatar */}
        <Avatar
          sx={{
            width: 34, height: 34,
            bgcolor: '#0066CC',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            border: '2px solid #E8F0FF',
            '&:hover': { border: '2px solid #0066CC' },
            transition: 'all 0.15s',
          }}
        >
          {user?.email?.[0].toUpperCase()}
        </Avatar>
      </Toolbar>
    </AppBar>
  )
}
