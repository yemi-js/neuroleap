'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut, 
  getUser, 
  resetPassword,
  updatePassword,
  createUserRecord
} from '../utils/supabase'

const AuthContext = createContext({
  user: null,
  loading: true,
  initialized: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  forgotPassword: async () => {},
  changePassword: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    let mounted = true
    
    const setupAuth = async () => {
      try {
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
          } else {
            setUser(null)
          }
          setInitialized(true)
          setLoading(false)
        }

        // Setup auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (mounted) {
              if (session?.user) {
                setUser(session.user)
              } else {
                setUser(null)
                // Only redirect to home if we're not already there
                if (window.location.pathname !== '/') {
                  router.push('/')
                }
              }
              setLoading(false)
            }
          }
        )
        
        return () => {
          mounted = false
          subscription?.unsubscribe()
        }
      } catch (error) {
        console.error('Error setting up auth:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
          setInitialized(true)
        }
      }
    }
    
    setupAuth()
    
    return () => {
      mounted = false
    }
  }, [router])

  const login = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await signIn(email, password)
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error signing in:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const register = async (email, password, userData = {}) => {
    try {
      setLoading(true)
      const { data, error } = await signUp(email, password, userData)
      if (error) throw error
      
      // Create user profile in the database
      if (data?.user) {
        await createUserRecord(data.user.id, {
          email,
          full_name: userData.full_name || '',
          subscription_status: 'FREE',
          created_at: new Date().toISOString()
        })
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error signing up:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      const { error } = await signOut()
      if (error) throw error
      setUser(null)
      router.push('/')
      return { success: true }
    } catch (error) {
      console.error('Error signing out:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const forgotPassword = async (email) => {
    try {
      setLoading(true)
      const { error } = await resetPassword(email)
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error resetting password:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (password) => {
    try {
      setLoading(true)
      const { error } = await updatePassword(password)
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error updating password:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading: loading || !initialized,
    initialized,
    login,
    register,
    logout,
    forgotPassword,
    changePassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 