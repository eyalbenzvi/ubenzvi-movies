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
  event.respondWith(stream(m[1], url.searchParams.get('rk'), event.request, url.searchParams.has('download')))
})

const meta = new Map() // fileId → { size, name, mimeType } (Drive does not expose Content-Range to CORS readers)

async function fileMeta(fileId, headers) {
  if (meta.has(fileId)) return meta.get(fileId)
  const res = await fetch(`${API}${fileId}?fields=size,name,mimeType&supportsAllDrives=true`, { headers })
  if (!res.ok) return null
  const j = await res.json()
  const size = Number(j.size)
  const info = { size: Number.isFinite(size) && size > 0 ? size : null, name: j.name || '', mimeType: j.mimeType || '' }
  meta.set(fileId, info)
  return info
}

/** RFC 5987 header for a (Hebrew) file name. */
function attachment(name) {
  const safe = String(name || 'video.mp4').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim() || 'video.mp4'
  return `attachment; filename="video${(safe.match(/\.[A-Za-z0-9]{2,4}$/) || ['.mp4'])[0]}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}

async function stream(fileId, resourceKey, request, download = false) {
  let t = token && Date.now() < expiresAt - 30_000 ? token : await askPagesForToken()
  if (!t) {
    notifyPages('token-expired')
    return new Response('not signed in', { status: 401 })
  }
  const auth = { Authorization: `Bearer ${t}` }
  if (resourceKey && /^[A-Za-z0-9_-]{1,100}$/.test(resourceKey)) auth['X-Goog-Drive-Resource-Keys'] = `${fileId}/${resourceKey}`

  const info = await fileMeta(fileId, auth)
  const size = info?.size ?? null
  const m = download ? null : /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') || '')
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
  if (download) out.set('Content-Disposition', attachment(info?.name))
  if (size != null) out.set('Content-Length', String(end - start + 1))
  if (m && size != null) {
    out.set('Content-Range', `bytes ${start}-${end}/${size}`)
    return new Response(res.body, { status: 206, headers: out })
  }
  return new Response(res.body, { status: 200, headers: out })
}
