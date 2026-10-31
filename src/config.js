/**
 * Google sign-in (OAuth client ID of type "Web application").
 * Create it in Google Cloud Console → APIs & Services → Credentials (see README → "Google sign-in").
 * A client ID is public by design; it is safe to commit. Leave empty to disable sign-in.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/** Read-only access to Drive files the user can open — needed to stream videos under their identity. */
export const GOOGLE_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.readonly'
