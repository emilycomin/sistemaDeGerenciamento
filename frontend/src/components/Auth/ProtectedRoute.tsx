import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function ProtectedRoute() {
  const { session, isLoading, setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#0066CC' }} />
      </Box>
    )
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}
