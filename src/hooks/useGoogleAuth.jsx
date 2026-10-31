import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../config.js'

/**
 * "Sign in with Google" for the app (Google Identity Services, token model).
 *
 * Why: on iPhone (every browser is WebKit) Google's login cookies are blocked inside the embedded
 * Drive player, so it treats signed-in users as anonymous and hits the anonymous viewing limit.
 * Signed in here, videos stream through our own player via the Drive API under the user's identity
 * (see public/sw.js).
 *
 * The access token (1 hour) is kept in memory and in sessionStorage only — never localStorage.
 */
const AuthContext = createContext(null)
const SESSION_KEY = 'umc:google-session'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

let gisPromise = null
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = GIS_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => { gisPromise = null; reject(new Error('gis-load-failed')) }
      document.head.appendChild(s)
    })
  }
  return gisPromise
}

function readSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return s && s.token && s.expiresAt > Date.now() + 60_000 ? s : null
  } catch {
    return null
  }
}

export function GoogleAuthProvider({ children }) {
  const enabled = !!GOOGLE_CLIENT_ID && typeof window !== 'undefined'
  const [session, setSession] = useState(() => (enabled ? readSession() : null)) // { token, expiresAt, user }
  const [status, setStatus] = useState(() => (!enabled ? 'disabled' : readSession() ? 'signed-in' : 'signed-out'))
  const [error, setError] = useState(null)
  const [streamReady, setStreamReady] = useState(() => typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller)
  const tokenClient = useRef(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  // Register the streaming service worker and load GIS early (signIn must open its popup synchronously)
  useEffect(() => {
    if (!enabled) return
    loadGis().then(() => {
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: async (resp) => {
          if (resp.error) { setError(resp.error_description || resp.error); return }
          const token = resp.access_token
          const expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000
          let user = sessionRef.current?.user || null
          try {
            const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
            if (r.ok) user = await r.json()
          } catch { /* name/avatar are optional */ }
          const s = { token, expiresAt, user: user && { name: user.name, email: user.email, picture: user.picture } }
          try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* private mode */ }
          setSession(s)
          setStatus('signed-in')
          setError(null)
        },
        error_callback: (err) => { if (err?.type !== 'popup_closed') setError(err?.message || 'שגיאת התחברות') },
      })
    }).catch(() => setError('לא ניתן לטעון את ההתחברות של Google'))

    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('./sw.js').catch(() => {})
    const onController = () => setStreamReady(!!navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', onController)
    navigator.serviceWorker.ready.then(onController)
    const onMessage = (e) => {
      if (e.data?.type === 'need-token') {
        const s = sessionRef.current
        e.ports[0]?.postMessage(s && s.expiresAt > Date.now() ? { token: s.token, expiresAt: s.expiresAt } : null)
      } else if (e.data?.type === 'token-expired') {
        setStatus((st) => (st === 'signed-in' ? 'expired' : st))
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onController)
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }, [enabled])

  // Hand the token to the service worker whenever it changes
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'token', token: session?.token || null, expiresAt: session?.expiresAt || 0 })
    })
  }, [session, enabled, streamReady])

  // Mark the session expired shortly before the token does
  useEffect(() => {
    if (!session) return
    const ms = session.expiresAt - Date.now() - 60_000
    const t = setTimeout(() => setStatus('expired'), Math.max(0, ms))
    return () => clearTimeout(t)
  }, [session])

  const signIn = useCallback(() => {
    if (!tokenClient.current) { setError('ההתחברות עדיין נטענת, נסו שוב בעוד רגע'); return }
    tokenClient.current.requestAccessToken({ prompt: '', login_hint: sessionRef.current?.user?.email })
  }, [])

  const signOut = useCallback(() => {
    const t = sessionRef.current?.token
    if (t) window.google?.accounts?.oauth2?.revoke?.(t, () => {})
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setSession(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo(() => ({
    enabled,
    status, // disabled | signed-out | signed-in | expired
    user: session?.user || null,
    error,
    signIn,
    signOut,
    /** true when videos can be streamed through our own player */
    canStream: status === 'signed-in' && streamReady,
  }), [enabled, status, session, error, signIn, signOut, streamReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useGoogleAuth() {
  return useContext(AuthContext) || { enabled: false, status: 'disabled', canStream: false, signIn() {}, signOut() {} }
}
