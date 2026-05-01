import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, Tab, Tabs, InputAdornment, IconButton, CircularProgress
} from '@mui/material'
import { Visibility, VisibilityOff, TrendingUp } from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [tab, setTab] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({ email: '', password: '', name: '', teamName: '' })

  const { signIn, signUp } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await signIn(loginData.email, loginData.password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (registerData.password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }
    setIsLoading(true)
    try {
      await signUp(registerData.email, registerData.password, registerData.name, registerData.teamName)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2144 50%, #0A1628 100%)',
        p: 2,
      }}
    >
      {/* Background decorative circles */}
      <Box sx={{ position: 'fixed', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(0,102,204,0.08)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '-15%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(0,102,204,0.06)', pointerEvents: 'none' }} />

      <Card sx={{ width: '100%', maxWidth: 420, bgcolor: 'white', border: 'none' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2.5,
                background: 'linear-gradient(135deg, #0066CC, #3385D6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,102,204,0.3)',
              }}
            >
              <TrendingUp sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">GestãoPro</Typography>
              <Typography variant="caption" color="text.secondary">Sistema de Gerenciamento</Typography>
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError('') }} sx={{ mb: 3 }}>
            <Tab label="Entrar" sx={{ fontWeight: 600 }} />
            <Tab label="Criar conta" sx={{ fontWeight: 600 }} />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {tab === 0 ? (
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="E-mail"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData(p => ({ ...p, email: e.target.value }))}
                required
                fullWidth
                size="small"
              />
              <TextField
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={(e) => setLoginData(p => ({ ...p, password: e.target.value }))}
                required
                fullWidth
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{ mt: 1, py: 1.25 }}
              >
                {isLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Entrar'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Seu nome" value={registerData.name} onChange={(e) => setRegisterData(p => ({ ...p, name: e.target.value }))} required fullWidth size="small" />
              <TextField label="Nome da empresa" value={registerData.teamName} onChange={(e) => setRegisterData(p => ({ ...p, teamName: e.target.value }))} required fullWidth size="small" />
              <TextField label="E-mail" type="email" value={registerData.email} onChange={(e) => setRegisterData(p => ({ ...p, email: e.target.value }))} required fullWidth size="small" />
              <TextField
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={registerData.password}
                onChange={(e) => setRegisterData(p => ({ ...p, password: e.target.value }))}
                required fullWidth size="small"
                helperText="Mínimo 6 caracteres"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading} sx={{ mt: 1, py: 1.25 }}>
                {isLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Criar conta grátis'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
