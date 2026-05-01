import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme } from '@mantine/core'
import { theme } from './styles/theme'

const mantineTheme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: [
      '#E8F0FF', '#C5D8FF', '#A0BFFF', '#7AA5FF', '#5589FF',
      '#2D6BE4', '#0066CC', '#0052A3', '#003F7A', '#002D57',
    ],
  },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  radius: { sm: '6px', md: '8px', lg: '10px' },
  components: {
    DatePickerInput: {
      styles: {
        input: {
          fontSize: '0.875rem',
          height: '40px',
          borderColor: '#C4C4C4',
          '&:focus': { borderColor: '#0066CC' },
        },
        label: {
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#6B7280',
          marginBottom: '4px',
        },
        calendarHeader: { color: '#0066CC' },
      },
    },
  },
})
import MainLayout from './components/Layout/MainLayout'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Finance from './pages/Finance'
import Tasks from './pages/Tasks'
import Goals from './pages/Goals'
import Services from './pages/Services'
import Placeholder from './pages/Placeholder'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={mantineTheme}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/services" element={<Services />} />
                <Route path="/calendar" element={<Placeholder />} />
                <Route path="/metrics" element={<Placeholder />} />
                <Route path="/settings" element={<Placeholder />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}
