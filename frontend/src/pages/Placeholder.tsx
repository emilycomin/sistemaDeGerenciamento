import { Box, Typography, Card, CardContent } from '@mui/material'
import { Construction } from '@mui/icons-material'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/services': { title: 'Meus Serviços', description: 'Cadastre e gerencie os serviços que sua empresa oferece' },
  '/calendar': { title: 'Google Calendário', description: 'Sincronize e visualize seus eventos do Google Calendar' },
  '/metrics': { title: 'Métricas & KPIs', description: 'Acompanhe os indicadores-chave de desempenho da empresa' },
  '/settings': { title: 'Configurações', description: 'Gerencie as configurações da sua conta e empresa' },
}

export default function Placeholder() {
  const { pathname } = useLocation()
  const info = pageTitles[pathname] ?? { title: 'Em desenvolvimento', description: 'Esta seção estará disponível em breve' }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
        <CardContent sx={{ p: 5 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: 3,
              bgcolor: '#E8F0FF', mx: 'auto', mb: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Construction sx={{ color: '#0066CC', fontSize: 30 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>{info.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{info.description}</Typography>
          <Typography variant="caption" sx={{ color: '#0066CC', bgcolor: '#E8F0FF', px: 1.5, py: 0.5, borderRadius: 10, fontWeight: 600 }}>
            Em desenvolvimento
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
