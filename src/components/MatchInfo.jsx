import { Clock, FileText, StickyNote } from 'lucide-react'
import { formatTime } from '../lib/time.js'
import Highlight from './Highlight.jsx'

/** Where a search hit came from (inside "מה בקלטת" or the notes) with a highlighted excerpt. */
export default function MatchInfo({ match, compact = false, onOpenAt }) {
  if (match?.moments?.length && onOpenAt) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs">
        <div className="mb-1 flex items-center gap-1 font-semibold text-accent-ink"><Clock className="size-3" aria-hidden /> נמצא ברגע בסרטון</div>
        <div className="flex flex-wrap gap-1.5">
          {match.moments.slice(0, 2).map((m) => (
            <button key={`${m.tag}@${m.t}`} type="button" onClick={() => onOpenAt(m.t)}
              className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-amber-500/20 px-2.5 text-xs font-semibold text-ink hover:bg-amber-500/35">
              <span className="truncate"><bdi>{m.tag}</bdi></span> · <span dir="ltr" className="tabular-nums">{formatTime(m.t)}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (!match?.snippet?.text) return null
  const { field, text } = match.snippet
  const Icon = field === 'doc' ? FileText : StickyNote
  const label = field === 'doc' ? 'נמצא ב״מה בקלטת״' : 'נמצא בהערות'
  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50/90 ${compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'}`}>
      <div className="mb-0.5 flex items-center gap-1 font-semibold text-accent-ink">
        <Icon className="size-3" aria-hidden /> {label}
      </div>
      <p className="line-clamp-2 leading-5"><Highlight text={text} terms={match.terms} /></p>
    </div>
  )
}
