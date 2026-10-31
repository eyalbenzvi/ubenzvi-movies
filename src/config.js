/**
 * Google sign-in (OAuth client ID of type "Web application").
 * Create it in Google Cloud Console → APIs & Services → Credentials (see README → "Google sign-in").
 * A client ID is public by design; it is safe to commit. Leave empty to disable sign-in.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '701233284129-klt5vq2v5kb4kgkohjdv8tsko9592n0s.apps.googleusercontent.com'

/** Read-only access to Drive files the user can open — needed to stream videos under their identity. */
export const GOOGLE_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.readonly'
