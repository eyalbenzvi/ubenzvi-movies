/**
 * Search index for the "מה בקלטת" (tape contents) documents.
 *
 * Three layers, in priority order:
 *   1. User-entered text (pasted inside the app, stored in localStorage) — see useArchiveStore.
 *   2. `docContents.json` — real document text pre-fetched at build time by
 *      `npm run fetch-docs` (works once the Google Docs are shared "anyone with the link").
 *   3. An automatic keyword extract generated below from the catalog metadata, so every
 *      one of the 41 linked items is searchable out of the box.
 */
import fetched from './docContents.json'
import { movies } from './movies.js'

const ORDINAL_WORDS = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי']

function buildAutoExtract(docId) {
  const related = movies.filter((m) => m.docId === docId)
  const first = related[0]
  const tape = first.title.match(/קלטת משפחתית\s+(\d+א?)/)?.[1]
  const years = [...new Set(related.flatMap((m) => [m.year, m.yearEnd]).filter(Boolean))]
  const parts = related.map((m) => m.part).filter(Boolean)

  const lines = []
  lines.push(tape ? `תוכן קלטת משפחתית מספר ${tape}.` : `תוכן הקלטת "${first.series}".`)
  if (related.length > 1) lines.push(`המסמך מתאר ${related.length} קבצים: ${related.map((m) => m.displayTitle).join(', ')}.`)
  if (parts.length === 1) lines.push(`חלק ${ORDINAL_WORDS[parts[0]] || parts[0]} של הקלטת.`)
  if (years.length) lines.push(`שנים: ${years.join(', ')}.`)

  return lines.join('\n')
}

/** docId → { text, source: 'fetched' | 'auto' } */
export const docIndex = {}

for (const m of movies) {
  if (!m.docId || docIndex[m.docId]) continue
  const real = fetched[m.docId]?.text?.trim()
  docIndex[m.docId] = real
    ? { text: real, source: 'fetched', fetchedAt: fetched[m.docId].fetchedAt }
    : { text: buildAutoExtract(m.docId), source: 'auto' }
}
