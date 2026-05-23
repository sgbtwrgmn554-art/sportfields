'use client'
import { create } from 'zustand'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface User {
  id: string
  name: string
  email: string
}

interface AuthStore {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null

  init: () => void
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  init() {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('sf_token')
    const user  = localStorage.getItem('sf_user')
    if (token && user) {
      set({ token, user: JSON.parse(user) })
    }
  },

  async login(email, password) {
    set({ loading: true, error: null })
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password })
      localStorage.setItem('sf_token', data.token)
      localStorage.setItem('sf_user', JSON.stringify(data.user))
      set({ user: data.user, token: data.token, loading: false })
      return true
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'שגיאה בכניסה', loading: false })
      return false
    }
  },

  async register(name, email, password) {
    set({ loading: true, error: null })
    try {
      const { data } = await axios.post(`${API}/auth/register`, { name, email, password })
      localStorage.setItem('sf_token', data.token)
      localStorage.setItem('sf_user', JSON.stringify(data.user))
      set({ user: data.user, token: data.token, loading: false })
      return true
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'שגיאה בהרשמה', loading: false })
      return false
    }
  },

  logout() {
    localStorage.removeItem('sf_token')
    localStorage.removeItem('sf_user')
    set({ user: null, token: null })
  },

  clearError() { set({ error: null }) },
}))
