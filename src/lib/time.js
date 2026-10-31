/** Video time helpers: "22:10" ⇄ 1330 seconds. */

const MAX_SECONDS = 24 * 3600

/** Parse "22:10", "1:02:03", "22.10" or "22" (minutes) → seconds, or null. */
export function parseTime(input) {
  const s = String(input ?? '').trim().replace(/[.,]/g, ':')
  if (!s) return null
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/)
  if (!m) return null
  const parts = [m[1], m[2], m[3]].filter((x) => x != null).map(Number)
  let sec
  if (parts.length === 1) sec = parts[0] * 60 // bare number = minutes
  else if (parts.length === 2) sec = parts[0] * 60 + parts[1]
  else sec = parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length > 1 && parts.slice(1).some((p) => p > 59)) return null
  return sec >= 0 && sec <= MAX_SECONDS ? sec : null
}

/** 1330 → "22:10", 3723 → "1:02:03" */
export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

/** "עידן צונח 22:10" → { label: "עידן צונח", t: 1330 }; no trailing time → t: null */
export function splitTrailingTime(text) {
  const str = String(text ?? '').trim()
  const m = str.match(/^(.*?)[\s\-–·,]+(\d{1,2}:\d{2}(?::\d{2})?)$/)
  if (m && m[1].trim()) {
    const t = parseTime(m[2])
    if (t != null) return { label: m[1].trim(), t }
  }
  return { label: str, t: null }
}

/** Add Drive's start-time parameter to an embed URL. */
export function withStartTime(url, sec) {
  if (!url || !sec) return url
  return `${url}${url.includes('?') ? '&' : '?'}t=${Math.floor(sec)}`
}
