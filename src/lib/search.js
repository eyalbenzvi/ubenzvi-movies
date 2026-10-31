/**
 * Hebrew-aware full-text search.
 *
 * - Strips niqqud & cantillation, geresh/gershayim and quote characters
 *   (so מעה"ב == מעהב, צה״ל == צהל).
 * - Folds final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ) and Latin case.
 * - Supports "quoted phrases"; all terms must match (AND) somewhere in the record.
 * - Tolerates a single Hebrew prefix letter (ו/ה/ב/ל/מ/ש/כ) on the query term.
 */

const REMOVE = /[֑-ׇ"'`״׳‏‎]/
const FINALS = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
const PUNCT = /[\s.,;:!?()[\]{}\-_/\\|+*=<>~#&%^@·–—\u05BE]/
const PREFIXES = 'והבלמשכ'

/** Normalize a single char; returns '' (dropped), ' ' (separator) or the folded char. */
function foldChar(ch) {
  if (PUNCT.test(ch)) return ' ' // checked first: maqaf (U+05BE) sits inside the niqqud range
  if (REMOVE.test(ch)) return ''
  return FINALS[ch] || ch.toLowerCase()
}

export function normalize(text) {
  let out = ''
  for (const ch of String(text ?? '')) out += foldChar(ch)
  return out.replace(/\s+/g, ' ').trim()
}

/** Normalize (identically to `normalize`) while keeping a map from normalized index → original index. */
function normalizeWithMap(text) {
  let out = ''
  const map = []
  const str = String(text ?? '')
  for (let i = 0; i < str.length; i++) {
    const f = foldChar(str[i])
    if (!f) continue
    if (f === ' ' && (out === '' || out.endsWith(' '))) continue // collapse whitespace like normalize()
    out += f
    map.push(i)
  }
  return { out, map }
}

/** Split a raw query into normalized terms, honouring "quoted phrases". */
export function parseQuery(query) {
  const terms = []
  const re = /"([^"]+)"|(\S+)/g
  let m
  while ((m = re.exec(String(query ?? '')))) {
    const t = normalize(m[1] ?? m[2])
    if (t) terms.push(t)
  }
  return [...new Set(terms)]
}

/** Candidate forms of a term (the term itself + without a leading prefix letter). */
function variants(term) {
  const v = [term]
  if (term.length >= 4 && PREFIXES.includes(term[0])) v.push(term.slice(1))
  return v
}

/** Short terms (≤2 chars) only match at the start of a word, to avoid noise like "בר" in "בריכה". */
function indexOfTerm(hay, v, from) {
  if (v.length > 2) return hay.indexOf(v, from)
  let idx = hay.indexOf(v, from)
  while (idx > 0 && hay[idx - 1] !== ' ') idx = hay.indexOf(v, idx + 1)
  return idx
}

function termIn(haystack, term) {
  return variants(term).some((v) => indexOfTerm(haystack, v, 0) !== -1)
}

/** Character ranges (in the ORIGINAL text) that match any of the terms. */
export function findRanges(text, terms) {
  if (!text || !terms?.length) return []
  const { out, map } = normalizeWithMap(text)
  const ranges = []
  for (const term of terms) {
    for (const v of variants(term)) {
      let from = 0
      let idx
      while (v && (idx = indexOfTerm(out, v, from)) !== -1) {
        ranges.push([map[idx], map[idx + v.length - 1] + 1])
        from = idx + v.length
      }
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged
}

/** A short excerpt of `text` around the first match. */
export function makeSnippet(text, terms, radius = 60) {
  const ranges = findRanges(text, terms)
  if (!ranges.length) return null
  const [start, end] = ranges[0]
  const s = Math.max(0, start - radius)
  const e = Math.min(text.length, end + radius)
  return (s > 0 ? '…' : '') + text.slice(s, e).replace(/\s+/g, ' ').trim() + (e < text.length ? '…' : '')
}

/**
 * Build a searchable index once per data change.
 * @param {Array} movies
 * @param {(m) => {tags: string[], notes: string, docText: string}} getExtra
 */
export function buildIndex(movies, getExtra) {
  return movies.map((m) => {
    const extra = getExtra(m)
    return {
      movie: m,
      title: normalize(`${m.title} ${m.displayTitle}`),
      tags: normalize(extra.tags.join(' | ')),
      notes: normalize(extra.notes),
      doc: normalize(extra.docText),
      raw: extra,
    }
  })
}

const WEIGHTS = { title: 10, tags: 6, notes: 4, doc: 3 }

/**
 * Run a query against the index.
 * Returns Map(movieId → { score, fields: Set<'title'|'tags'|'notes'|'doc'>, snippet })
 * or null when the query is empty (= everything matches).
 */
export function search(index, query) {
  const terms = parseQuery(query)
  if (!terms.length) return null
  const results = new Map()
  for (const entry of index) {
    let score = 0
    const fields = new Set()
    let ok = true
    for (const term of terms) {
      let hit = false
      for (const f of ['title', 'tags', 'notes', 'doc']) {
        if (entry[f] && termIn(entry[f], term)) {
          hit = true
          fields.add(f)
          score += WEIGHTS[f] + (f === 'title' && entry.title.startsWith(term) ? 5 : 0)
        }
      }
      if (!hit) { ok = false; break }
    }
    if (!ok) continue
    let snippet = null
    if (!fields.has('title')) {
      if (fields.has('doc')) snippet = { field: 'doc', text: makeSnippet(entry.raw.docText, terms) }
      else if (fields.has('notes')) snippet = { field: 'notes', text: makeSnippet(entry.raw.notes, terms) }
    } else if (fields.has('doc')) {
      snippet = { field: 'doc', text: makeSnippet(entry.raw.docText, terms) }
    }
    results.set(entry.movie.id, { score, fields, snippet, terms })
  }
  return results
}
