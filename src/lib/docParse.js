/**
 * Parsing of "מה בקלטת" documents. Typical content:
 *   מה בקלטת:
 *   1. פסח 04/1996
 *   2. יום הולדת אלון 03/1997
 */

const HEADER = /^\s*מה\s+בקלטת\s*[:?؟.]?\s*$/

function toYear(y) {
  const n = Number(y)
  if (y.length === 4) return n >= 1940 && n <= 2039 ? n : null
  if (y.length === 2) return n >= 40 ? 1900 + n : 2000 + n
  return null
}

/** All years mentioned in a line: 1997, 04/1996, 5/97, 23.4.94, 2007-2008. */
export function yearsIn(text) {
  const years = []
  const s = String(text ?? '')
  // dates: d/m/yy(yy), m/yy(yy), with / . or -
  for (const m of s.matchAll(/(?<!\d)(?:\d{1,2}[/.])?\d{1,2}[/.](\d{4}|\d{2})(?!\d)/g)) {
    const y = toYear(m[1])
    if (y) years.push(y)
  }
  // bare 4-digit years
  for (const m of s.matchAll(/(?<!\d)(19[4-9]\d|20[0-3]\d)(?!\d)/g)) years.push(Number(m[1]))
  return [...new Set(years)]
}

/** Split document text into segments: [{ n, text, years }] */
export function parseSegments(text) {
  const lines = String(text ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !HEADER.test(l))
  const segments = []
  for (const line of lines) {
    const m = line.match(/^(\d{1,3})\s*[.)\-:]\s*(.+)$/)
    if (m) segments.push({ n: Number(m[1]), text: m[2].trim(), years: yearsIn(m[2]) })
    else if (segments.length && !/^\d/.test(line)) segments[segments.length - 1].text += ` ${line}`
    else segments.push({ n: segments.length + 1, text: line, years: yearsIn(line) })
  }
  return segments
}
