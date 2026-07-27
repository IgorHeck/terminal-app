import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { useProjects } from './ProjectsContext.jsx'

// ============================================================
// GitHubContext — estado global da integração GitHub (Fase 9).
//
// Gerencia:
//   - authState: estado de autenticação (global, por usuário)
//   - notifications: notificações não lidas (global, polled a cada 5 min)
//   - deviceCode: código do Device Flow enquanto aguarda autorização
// ============================================================

const GitHubContext = createContext(null)

const NOTIF_POLL_MS = 5 * 60 * 1000 // 5 minutos

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, authState: action.authState, authLoading: false }
    case 'AUTH_LOADING':
      return { ...state, authLoading: true }
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.notifications }
    case 'SET_DEVICE_CODE':
      return { ...state, deviceCode: action.deviceCode }
    case 'CLEAR_DEVICE_CODE':
      return { ...state, deviceCode: null }
    default:
      return state
  }
}

const INITIAL = {
  authState: null,    // null = ainda carregando
  authLoading: true,
  notifications: [],
  deviceCode: null,   // { user_code, verification_uri } durante Device Flow
}

export function GitHubProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const { activeProjectId } = useProjects()
  const pollRef = useRef(null)

  // Carrega auth state na inicialização
  const loadAuthState = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING' })
    const res = await window.api.github.getAuthState()
    if (res.ok) dispatch({ type: 'SET_AUTH', authState: res.data })
    else dispatch({ type: 'SET_AUTH', authState: { authenticated: false, method: null, user: null } })
  }, [])

  useEffect(() => {
    loadAuthState()
  }, [loadAuthState])

  // Escuta eventos de auth change e device code
  useEffect(() => {
    const offAuth = window.api.github.onAuthChanged((auth) => {
      dispatch({ type: 'SET_AUTH', authState: auth })
    })
    const offDevice = window.api.github.onDeviceCode((payload) => {
      dispatch({ type: 'SET_DEVICE_CODE', deviceCode: payload })
    })
    return () => {
      offAuth()
      offDevice()
    }
  }, [])

  // Polling de notificações (só quando autenticado)
  const loadNotifications = useCallback(async () => {
    if (!state.authState?.authenticated) return
    const res = await window.api.github.notifications()
    if (res.ok) dispatch({ type: 'SET_NOTIFICATIONS', notifications: res.data || [] })
  }, [state.authState?.authenticated])

  useEffect(() => {
    if (!state.authState?.authenticated) return
    loadNotifications()
    pollRef.current = setInterval(loadNotifications, NOTIF_POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state.authState?.authenticated, loadNotifications])

  // Sign-in via gh (detecção automática)
  const signInGh = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING' })
    const res = await window.api.github.signIn('gh')
    if (res.ok) dispatch({ type: 'SET_AUTH', authState: res.data })
    else dispatch({ type: 'SET_AUTH', authState: { authenticated: false, method: null, user: null } })
    return res
  }, [])

  // Sign-in via Device Flow
  const signInDevice = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING' })
    // O evento github:deviceCode vai disparar e atualizar state.deviceCode
    const res = await window.api.github.signIn('device')
    dispatch({ type: 'CLEAR_DEVICE_CODE' })
    if (res.ok) dispatch({ type: 'SET_AUTH', authState: res.data })
    else dispatch({ type: 'SET_AUTH', authState: { authenticated: false, method: null, user: null } })
    return res
  }, [])

  const signOut = useCallback(async () => {
    await window.api.github.signOut()
    dispatch({ type: 'SET_AUTH', authState: { authenticated: false, method: null, user: null } })
    dispatch({ type: 'SET_NOTIFICATIONS', notifications: [] })
  }, [])

  const markRead = useCallback(async (id) => {
    await window.api.github.markRead(id)
    dispatch({
      type: 'SET_NOTIFICATIONS',
      notifications: state.notifications.filter((n) => n.id !== id),
    })
  }, [state.notifications])

  const markAllRead = useCallback(async () => {
    await window.api.github.markAllRead()
    dispatch({ type: 'SET_NOTIFICATIONS', notifications: [] })
  }, [])

  const unreadCount = state.notifications.filter((n) => n.unread).length

  return (
    <GitHubContext.Provider
      value={{
        authState: state.authState,
        authLoading: state.authLoading,
        notifications: state.notifications,
        unreadCount,
        deviceCode: state.deviceCode,
        loadAuthState,
        loadNotifications,
        signInGh,
        signInDevice,
        signOut,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </GitHubContext.Provider>
  )
}

export function useGitHub() {
  return useContext(GitHubContext)
}
