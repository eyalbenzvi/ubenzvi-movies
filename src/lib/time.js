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

/** Longest plausible VHS recording (E-240 in LP) — upper bound for a moment. */
export const MAX_MOMENT = 6 * 3600

/** Timer-style display of a digit string, filled from the right: "2210" → "22:10", "10203" → "1:02:03". */
export function digitsToDisplay(d) {
  if (!d) return ''
  if (d.length <= 2) return `0:${d.padStart(2, '0')}`
  const s = d.slice(-2)
  const rest = d.slice(0, -2)
  if (rest.length <= 2) return `${Number(rest)}:${s}`
  return `${Number(rest.slice(0, -2))}:${rest.slice(-2)}:${s}`
}

/**
 * Parse what the user typed in a time field → { sec } or { error } (Hebrew message).
 * Digits only are read from the right like a timer; with ":" "." "," the usual mm:ss is used.
 */
export function parseTimeInput(raw) {
  const str = String(raw ?? '').trim()
  if (!str) return { error: 'הקלידו את הזמן שמופיע בנגן' }
  let parts
  if (/^\d+$/.test(str)) {
    const d = str.slice(-6)
    const s = Number(d.slice(-2))
    const rest = d.slice(0, -2)
    parts = rest.length <= 2 ? [Number(rest || 0), s] : [Number(rest.slice(0, -2)), Number(rest.slice(-2)), s]
  } else {
    const m = str.replace(/[.,]/g, ':').match(/^(\d{1,2})(?::(\d{1,2}))(?::(\d{1,2}))?$/)
    if (!m) return { error: 'כתבו דקות:שניות, למשל 22:10' }
    parts = [m[1], m[2], m[3]].filter((x) => x != null).map(Number)
  }
  if (parts.slice(1).some((p) => p > 59)) return { error: 'השניות צריכות להיות עד 59 (למשל 22:10)' }
  const sec = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (sec > MAX_MOMENT) return { error: 'הזמן ארוך מדי לקלטת — בדקו את המספר' }
  return { sec }
}

/** 1330 → "22 דקות ו-10 שניות" (for screen readers). */
export function timeSpoken(sec) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const parts = []
  if (h) parts.push(h === 1 ? 'שעה' : `${h} שעות`)
  if (m) parts.push(m === 1 ? 'דקה' : `${m} דקות`)
  if (r || !parts.length) parts.push(r === 1 ? 'שנייה' : `${r} שניות`)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} ו-${parts.at(-1)}` : parts[0]
}
