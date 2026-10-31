/**
 * Catalog data layer.
 *
 * `catalog.json` is the raw export of the spreadsheet (124 rows):
 *   { title, movieUrl, detailsUrl }
 * This module enriches each row with a stable id, derived year/decade,
 * part numbers, media type and embeddable Google Drive / Docs URLs.
 */
import rawCatalog from './catalog.json'
import docContents from './docContents.json'
import { parseSegments } from '../lib/docParse.js'

/** Small, stable string hash (FNV-1a) → base36. Used for ids that survive reordering. */
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Fix a common RTL copy/paste artifact: "(foo (bar" → "foo (bar)". */
function cleanTitle(title) {
  let t = String(title ?? '').replace(/\s+/g, ' ').trim()
  const opens = (t.match(/\(/g) || []).length
  const closes = (t.match(/\)/g) || []).length
  if (t.startsWith('(') && opens > closes) t = t.slice(1).trim() + ')'
  return t
}

const HEBREW_ORDINALS = { ראשון: 1, שני: 2, שלישי: 3, רביעי: 4, חמישי: 5 }

const GOOGLE_HOSTS = /^(drive|docs)\.google\.com$/

/** Extract Google file id and resourcekey from a Drive/Docs URL. Only https Google hosts are accepted. */
export function parseGoogleUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !GOOGLE_HOSTS.test(u.hostname)) return null
    const m = u.pathname.match(/\/d\/([A-Za-z0-9_-]+)/)
    const id = m ? m[1] : u.searchParams.get('id')
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null
    const kind = u.hostname.startsWith('docs.') ? (u.pathname.split('/')[1] || 'document') : 'file'
    if (!/^(file|document|spreadsheets|presentation)$/.test(kind)) return null
    return { id, kind, resourceKey: u.searchParams.get('resourcekey') }
  } catch {
    return null
  }
}

/** The original URL if it is a safe Google link, else null (never put arbitrary URLs in href/src). */
export function safeGoogleUrl(url) {
  return parseGoogleUrl(url) ? url : null
}

function withResourceKey(url, resourceKey) {
  return resourceKey ? `${url}?resourcekey=${encodeURIComponent(resourceKey)}` : url
}

/** Build an embeddable /preview URL for a Drive file or Google Doc. */
export function toEmbedUrl(url) {
  const g = parseGoogleUrl(url)
  if (!g) return null
  if (g.kind === 'file') return withResourceKey(`https://drive.google.com/file/d/${g.id}/preview`, g.resourceKey)
  return withResourceKey(`https://docs.google.com/${g.kind}/d/${g.id}/preview`, g.resourceKey)
}

export function toThumbnailUrl(url) {
  const g = parseGoogleUrl(url)
  if (!g || g.kind !== 'file') return null
  const rk = g.resourceKey ? `&resourcekey=${encodeURIComponent(g.resourceKey)}` : ''
  return `https://drive.google.com/thumbnail?id=${g.id}&sz=w640${rk}`
}

function extractYears(title) {
  const years = (title.match(/(?<!\d)(19[4-9]\d|20[0-3]\d)(?!\d)/g) || []).map(Number)
  return years
}

function extractPart(title) {
  const underscore = title.match(/_(\d+)\s*$/)
  if (underscore) return Number(underscore[1])
  const ord = title.match(/חלק\s+(ראשון|שני|שלישי|רביעי|חמישי)/)
  if (ord) return HEBREW_ORDINALS[ord[1]]
  return null
}

/** Human-friendly title: "foo_2" → "foo · חלק 2". */
function displayTitle(title) {
  return title.replace(/\s*_(\d+)\s*$/, ' · חלק $1').replace(/\s+/g, ' ').trim()
}

/** Series key — used to group multi-part recordings ("קלטת משפחתית 5 חלק שני" → "קלטת משפחתית 5"). */
function seriesKey(title) {
  return title
    .replace(/\s*_\d+\s*$/, '')
    .replace(/חלק\s+(ראשון|שני|שלישי|רביעי|חמישי)?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function categorize(title) {
  if (title.includes('קלטת שמע')) return 'audio'
  return 'video'
}

/** Keyword → suggested tag. Shown as one-click suggestions in the tag editor. */
const TAG_RULES = [
  [/בר[ -]?מצווה|בת[ -]?מצווה|עליה לתורה/, 'בר מצווה'],
  [/קלטת משפחתית|סבא|סבתא|נישואין|יום ?הולדת|בן 90|בת 70|משפחה|משפחתית/, 'משפחה'],
  [/טיול|מסע|איטליה|פולין/, 'טיול'],
  [/מסלול|כומתה|השבעה|צנחנים|פלחה"ן|עופרת יצוקה/, 'צבא'],
  [/חג מחזור|הצגת|מופע|קונצרט|מסיבת סיום/, 'מופעים וטקסים'],
  [/גן |ניצני|כיתת|זוגון|מעה"ב|מעלה הבשור/, 'ילדות'],
  [/בארי|קדמה/, 'קהילה'],
  [/קלטת שמע/, 'הקלטות שמע'],
]

export function suggestTagsFor(title) {
  return TAG_RULES.filter(([re]) => re.test(title)).map(([, tag]) => tag)
}

const usedIds = new Set()

export const movies = rawCatalog.map((row, index) => {
  const title = cleanTitle(row.title)
  let id = hashString(title)
  while (usedIds.has(id)) id = hashString(id + index)
  usedIds.add(id)

  const doc = parseGoogleUrl(row.detailsUrl)
  let years = extractYears(title)
  let yearSource = years.length ? 'title' : null
  // No year in the title → derive it from the dated segments of its "מה בקלטת" document
  if (!years.length && doc && docContents[doc.id]?.text) {
    years = [...new Set(parseSegments(docContents[doc.id].text).flatMap((s) => s.years))]
    if (years.length) yearSource = 'doc'
  }
  const year = years.length ? Math.min(...years) : null

  return {
    id,
    index,
    title,
    displayTitle: displayTitle(title),
    series: seriesKey(title),
    part: extractPart(title),
    type: categorize(title),
    year,
    yearEnd: years.length > 1 ? Math.max(...years) : null,
    yearSource,
    decade: year ? Math.floor(year / 10) * 10 : null,
    movieUrl: safeGoogleUrl(row.movieUrl),
    embedUrl: toEmbedUrl(row.movieUrl),
    thumbnailUrl: toThumbnailUrl(row.movieUrl),
    detailsUrl: safeGoogleUrl(row.detailsUrl),
    detailsEmbedUrl: toEmbedUrl(row.detailsUrl),
    docId: doc?.id ?? null,
    suggestedTags: suggestTagsFor(title),
  }
})

export const moviesById = Object.fromEntries(movies.map((m) => [m.id, m]))

export const decades = [...new Set(movies.map((m) => m.decade).filter(Boolean))].sort((a, b) => a - b)

export const stats = {
  total: movies.length,
  withDetails: movies.filter((m) => m.detailsUrl).length,
  withVideo: movies.filter((m) => m.movieUrl).length,
  uniqueDocs: new Set(movies.map((m) => m.docId).filter(Boolean)).size,
}
