import { useEffect, useState } from 'react'
import { BookmarkPlus, Check, Clock, Pencil, Play, Trash2, X } from 'lucide-react'
import Highlight from './Highlight.jsx'
import TimeInput from './TimeInput.jsx'
import { normalize } from '../lib/search.js'
import { formatTime, parseTimeInput, timeSpoken } from '../lib/time.js'

const VISIBLE = 6
const toDigits = (sec) => formatTime(sec).replace(/\D/g, '')

function EditRow({ moment, onSave, onDelete, onCancel }) {
  const [digits, setDigits] = useState(toDigits(moment.t))
  const [label, setLabel] = useState(moment.tag)
  const [error, setError] = useState(null)
  const save = () => {
    const p = parseTimeInput(digits)
    if (p.error) return setError(p.error)
    if (!label.trim()) return setError('מה קורה ברגע הזה?')
    onSave({ tag: label.trim(), t: p.sec })
  }
  return (
    <li className="space-y-2 bg-surface-2/60 p-2.5" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }}>
      <div className="flex items-end gap-2">
        <TimeInput digits={digits} onDigits={(d) => { setDigits(d); setError(null) }} invalid={!!error} autoFocus onEnter={save} />
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted">תיאור</span>
          <input value={label} maxLength={40} onChange={(e) => { setLabel(e.target.value); setError(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
            className="h-12 w-full min-w-0 rounded-2xl border border-line-strong bg-surface px-3 text-base outline-none focus:border-focus focus:ring-2 focus:ring-focus/25" />
        </label>
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400"><Check className="size-4" aria-hidden /> שמור</button>
        <button type="button" onClick={onCancel} className="inline-flex h-10 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-muted hover:bg-surface-2"><X className="size-4" aria-hidden /> ביטול</button>
        <button type="button" onClick={onDelete} className="ms-auto inline-flex h-10 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"><Trash2 className="size-4" aria-hidden /> מחק</button>
      </div>
    </li>
  )
}

/** "רגעים בסרטון" — the movie's timestamped tags, like chapters. */
export default function MomentList({ moments, searchTerms, onJump, onUpdate, onDelete, onRestore, onMark }) {
  const [editing, setEditing] = useState(null) // "tag@t"
  const [showAll, setShowAll] = useState(false)
  const [deleted, setDeleted] = useState(null) // { moment, index }

  useEffect(() => {
    if (!deleted) return
    const t = setTimeout(() => setDeleted(null), 6000)
    return () => clearTimeout(t)
  }, [deleted])

  const key = (m) => `${m.tag}@${m.t}`
  const matches = (m) => searchTerms?.length && searchTerms.some((t) => normalize(m.tag).includes(t))
  const list = showAll ? moments : moments.slice(0, VISIBLE)

  return (
    <section aria-labelledby="moments-title" className="space-y-2">
      <h3 id="moments-title" className="flex items-center gap-2 font-semibold">
        <Clock className="size-4 text-amber-500" aria-hidden /> רגעים בסרטון
        {moments.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500/20 px-1 text-xs tabular-nums">{moments.length}</span>}
      </h3>

      {moments.length === 0 && !deleted ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
          עוד לא סומנו רגעים. ראיתם משהו שכדאי לזכור? עצרו את הסרטון ולחצו ״סמן רגע״.
          <button type="button" onClick={onMark} className="ms-1 inline-flex items-center gap-1 font-semibold text-accent-ink hover:underline">
            <BookmarkPlus className="size-4" aria-hidden /> סמן רגע
          </button>
        </div>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {list.map((m) =>
            editing === key(m) ? (
              <EditRow
                key={key(m)}
                moment={m}
                onCancel={() => setEditing(null)}
                onSave={(to) => { onUpdate(m, to); setEditing(null) }}
                onDelete={() => { onDelete(m); setEditing(null); setDeleted({ moment: m }) }}
              />
            ) : (
              <li key={key(m)} className={`flex items-center gap-1 pe-1 ps-2 ${matches(m) ? 'bg-amber-500/10' : ''}`}>
                <button type="button" onClick={() => onJump(m.t)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-start" aria-label={`קפיצה ל-${timeSpoken(m.t)} — ${m.tag}`}>
                  <span dir="ltr" className="inline-flex h-8 min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-full bg-amber-500/15 px-2 text-sm font-semibold tabular-nums text-accent-ink">
                    <Play className="size-3 fill-current" aria-hidden />{formatTime(m.t)}
                  </span>
                  <span className="min-w-0 truncate text-base"><Highlight text={m.tag} terms={searchTerms} /></span>
                </button>
                <button type="button" onClick={() => setEditing(key(m))} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label={`עריכת הרגע ${m.tag}`}>
                  <Pencil className="size-4" aria-hidden />
                </button>
              </li>
            ),
          )}
          {deleted && (
            <li className="flex min-h-12 items-center gap-2 px-3 text-sm text-muted" role="status">
              הרגע נמחק
              <button type="button" onClick={() => { onRestore(deleted.moment); setDeleted(null) }} className="font-semibold text-accent-ink hover:underline">ביטול</button>
            </li>
          )}
        </ol>
      )}

      {moments.length > VISIBLE && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="h-10 text-sm font-semibold text-accent-ink hover:underline">
          {showAll ? 'הצג פחות' : `הצג עוד ${moments.length - VISIBLE} רגעים`}
        </button>
      )}
    </section>
  )
}
