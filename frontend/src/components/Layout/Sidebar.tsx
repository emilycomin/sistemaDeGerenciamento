import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, IconButton, Avatar, Tooltip
} from '@mui/material'
import {
  Dashboard, People, AccountBalance, Build, CheckCircle,
  CalendarMonth, TrendingUp, Flag, ChevronLeft, ChevronRight,
  Logout, Settings
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'

const DRAWER_WIDTH = 240
const MINI_WIDTH = 64

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { label: 'CRM', icon: <People />, path: '/crm' },
  { label: 'Finanças', icon: <AccountBalance />, path: '/finance' },
  { label: 'Serviços', icon: <Build />, path: '/services' },
  { label: 'Tarefas', icon: <CheckCircle />, path: '/tasks' },
  { label: 'Calendário', icon: <CalendarMonth />, path: '/calendar' },
  { label: 'Métricas', icon: <TrendingUp />, path: '/metrics' },
  { label: 'Metas', icon: <Flag />, path: '/goals' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const width = collapsed ? MINI_WIDTH : DRAWER_WIDTH

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: '#0A1628',
          color: 'white',
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      }}
    >
      {/* Logo / Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 0 : 2,
          py: 2,
          minHeight: 64,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: 2,
                background: 'linear-gradient(135deg, #0066CC, #3385D6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <TrendingUp sx={{ fontSize: 18, color: 'white' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white', letterSpacing: '-0.01em' }}>
              GestãoPro
            </Typography>
          </Box>
        )}
        <IconButton onClick={() => setCollapsed(!collapsed)} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
          {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    px: collapsed ? 1 : 1.5,
                    py: 1,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    bgcolor: isActive ? 'rgba(0, 102, 204, 0.25)' : 'transparent',
                    color: isActive ? '#5BA8E5' : 'rgba(255,255,255,0.65)',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(0, 102, 204, 0.30)' : 'rgba(255,255,255,0.06)',
                      color: 'white',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', mr: collapsed ? 0 : 0 }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>

      {/* Bottom section */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1 }}>
        <Tooltip title={collapsed ? 'Configurações' : ''} placement="right">
          <ListItemButton
            sx={{ borderRadius: 2, px: collapsed ? 1 : 1.5, py: 1, justifyContent: collapsed ? 'center' : 'flex-start', color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.06)' } }}
            onClick={() => navigate('/settings')}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit' }}>
              <Settings fontSize="small" />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Configurações" primaryTypographyProps={{ fontSize: '0.875rem' }} />}
          </ListItemButton>
        </Tooltip>

        <Box
          sx={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            mt: 0.5, px: collapsed ? 0 : 1, py: 0.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          {!collapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: '#0066CC', fontSize: 12 }}>
                {user?.email?.[0].toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ color: 'white', display: 'block', lineHeight: 1.3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
          )}
          <Tooltip title="Sair" placement="right">
            <IconButton onClick={signOut} size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#EF4444' } }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  )
}
