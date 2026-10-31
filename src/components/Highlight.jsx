import { Fragment, useMemo } from 'react'
import { findRanges } from '../lib/search.js'

/** Renders `text` with every occurrence of the search terms wrapped in <mark>. */
export default function Highlight({ text, terms }) {
  const parts = useMemo(() => {
    const ranges = findRanges(text, terms)
    if (!ranges.length) return [text]
    const out = []
    let pos = 0
    ranges.forEach(([s, e], i) => {
      if (s > pos) out.push(text.slice(pos, s))
      out.push(<mark key={i} className="hl">{text.slice(s, e)}</mark>)
      pos = e
    })
    if (pos < text.length) out.push(text.slice(pos))
    return out
  }, [text, terms])
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)
}
