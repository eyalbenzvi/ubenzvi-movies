import { FileText, StickyNote } from 'lucide-react'
import Highlight from './Highlight.jsx'

/** Where a search hit came from (inside "מה בקלטת" or the notes) with a highlighted excerpt. */
export default function MatchInfo({ match, compact = false }) {
  if (!match?.snippet?.text) return null
  const { field, text } = match.snippet
  const Icon = field === 'doc' ? FileText : StickyNote
  const label = field === 'doc' ? 'נמצא ב״מה בקלטת״' : 'נמצא בהערות'
  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50/90 ${compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'}`}>
      <div className="mb-0.5 flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
        <Icon className="size-3" aria-hidden /> {label}
      </div>
      <p className="line-clamp-2 leading-relaxed"><Highlight text={text} terms={match.terms} /></p>
    </div>
  )
}
