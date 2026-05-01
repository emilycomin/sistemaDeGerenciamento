import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { user, session, isLoading, setSession, setLoading, clear } = useAuthStore()
  const navigate = useNavigate()

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

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setSession(data.session)
    navigate('/dashboard')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clear()
    navigate('/login')
  }

  const signUp = async (email: string, password: string, name: string, teamName: string) => {
    // Cria usuário diretamente no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, teamName } }
    })

    if (error) throw error
    if (!data.session) {
      throw new Error('Verifique seu e-mail para confirmar o cadastro.')
    }

    // Com sessão ativa, cria o time no backend
    const token = data.session.access_token
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/auth/setup-team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, teamName, userId: data.user!.id, email })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Erro ao configurar equipe')
    }

    setSession(data.session)
    navigate('/dashboard')
  }

  return { user, session, isLoading, signIn, signOut, signUp, isAuthenticated: !!session }
}
