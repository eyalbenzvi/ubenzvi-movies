/**
 * Search index for the "מה בקלטת" (tape contents) documents.
 *
 * Sources, in priority order:
 *   1. User-entered text (pasted in the app, localStorage) — merged in App.jsx.
 *   2. `docContents.json` — the real document text, fetched by `npm run fetch-docs`.
 *   3. An automatic extract from catalog metadata (only if a doc could not be fetched).
 */
import fetched from './docContents.json'
import { movies } from './movies.js'
import { parseSegments } from '../lib/docParse.js'

function buildAutoExtract(docId) {
  const related = movies.filter((m) => m.docId === docId)
  const first = related[0]
  const tape = first.title.match(/קלטת משפחתית\s+(\d+א?)/)?.[1]
  const years = [...new Set(related.flatMap((m) => [m.year, m.yearEnd]).filter(Boolean))]
  const lines = [tape ? `קלטת משפחתית מספר ${tape}.` : `הקלטת "${first.series}".`]
  if (years.length) lines.push(`שנים: ${years.join(', ')}.`)
  return lines.join('\n')
}

/** docId → { text, source: 'fetched' | 'auto', segments } */
export const docIndex = {}

for (const m of movies) {
  if (!m.docId || docIndex[m.docId]) continue
  const real = fetched[m.docId]?.text?.trim()
  docIndex[m.docId] = real
    ? { text: real, source: 'fetched', fetchedAt: fetched[m.docId].fetchedAt, segments: parseSegments(real) }
    : { text: buildAutoExtract(m.docId), source: 'auto', segments: [] }
}
