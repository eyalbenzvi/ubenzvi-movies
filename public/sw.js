/*
 * Streams Google Drive videos to the app's own <video> player using the signed-in user's identity.
 *
 * <video src="./drive-stream/<fileId>?rk=<resourceKey>"> → this worker → Drive API (alt=media)
 * with "Authorization: Bearer <token>" and the browser's Range header passed through, so seeking
 * works and nothing is downloaded up-front. The token lives only in memory (from the page).
 * Every other request is left alone.
 */
const API = 'https://www.googleapis.com/drive/v3/files/'
let token = null
let expiresAt = 0

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('message', (e) => {
  const d = e.data || {}
  if (d.type === 'token') {
    token = d.token || null
    expiresAt = d.expiresAt || 0
  }
})

/** Ask an open page for a fresh token (the worker may have been restarted and lost it). */
async function askPagesForToken() {
  const pages = await self.clients.matchAll({ type: 'window' })
  for (const client of pages) {
    const reply = await new Promise((resolve) => {
      const ch = new MessageChannel()
      const timer = setTimeout(() => resolve(null), 2500)
      ch.port1.onmessage = (ev) => { clearTimeout(timer); resolve(ev.data) }
      client.postMessage({ type: 'need-token' }, [ch.port2])
    })
    if (reply?.token) { token = reply.token; expiresAt = reply.expiresAt || 0; return token }
  }
  return null
}

async function notifyPages(type) {
  for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ type })
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  const m = url.pathname.match(/\/drive-stream\/([A-Za-z0-9_-]{10,100})$/)
  if (!m || event.request.method !== 'GET') return
  event.respondWith(stream(m[1], url.searchParams.get('rk'), event.request))
})

const sizes = new Map() // fileId → total bytes (Drive does not expose Content-Range to CORS readers)

async function fileSize(fileId, headers) {
  if (sizes.has(fileId)) return sizes.get(fileId)
  const res = await fetch(`${API}${fileId}?fields=size&supportsAllDrives=true`, { headers })
  if (!res.ok) return null
  const size = Number((await res.json()).size)
  if (Number.isFinite(size) && size > 0) sizes.set(fileId, size)
  return sizes.get(fileId) ?? null
}

async function stream(fileId, resourceKey, request) {
  let t = token && Date.now() < expiresAt - 30_000 ? token : await askPagesForToken()
  if (!t) {
    notifyPages('token-expired')
    return new Response('not signed in', { status: 401 })
  }
  const auth = { Authorization: `Bearer ${t}` }
  if (resourceKey && /^[A-Za-z0-9_-]{1,100}$/.test(resourceKey)) auth['X-Goog-Drive-Resource-Keys'] = `${fileId}/${resourceKey}`

  const size = await fileSize(fileId, auth)
  const m = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') || '')
  const headers = { ...auth }
  let start = 0
  let end = size != null ? size - 1 : null
  if (m && size != null) {
    start = Math.min(Number(m[1]), size - 1)
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    headers.Range = `bytes=${start}-${end}`
  }
  const res = await fetch(`${API}${fileId}?alt=media&supportsAllDrives=true`, { headers })
  if (res.status === 401) notifyPages('token-expired')
  if (!res.ok) return new Response(null, { status: res.status })

  // Re-issue as our own (same-origin) response with complete range headers for the <video> element
  const out = new Headers({
    'Content-Type': res.headers.get('content-type') || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  })
  if (size != null) out.set('Content-Length', String(end - start + 1))
  if (m && size != null) {
    out.set('Content-Range', `bytes ${start}-${end}/${size}`)
    return new Response(res.body, { status: 206, headers: out })
  }
  return new Response(res.body, { status: 200, headers: out })
}
