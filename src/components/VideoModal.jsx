import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ExternalLink, FileText, Heart, Layers, Pencil, StickyNote, Tags, VideoOff, X } from 'lucide-react'
import EmbedFrame from './EmbedFrame.jsx'
import Highlight from './Highlight.jsx'
import Sheet from './Sheet.jsx'
import TagEditor from './TagEditor.jsx'
import Thumbnail from './Thumbnail.jsx'
import { yearLabel } from './MovieCard.jsx'
import { parseSegments } from '../lib/docParse.js'

const DATE_RE = /(\(?\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\)?|\(?\d{1,2}[/.]\d{2,4}\)?|(?<!\d)(?:19|20)\d{2}(?:-(?:19|20)\d{2})?(?!\d))/

function SegmentList({ segments, terms }) {
  return (
    <ol className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
      {segments.map((s, i) => {
        const date = s.text.match(DATE_RE)?.[0]
        const label = date ? s.text.replace(date, '').replace(/\s+[-–]\s*$|^\s*[-–]\s+/g, '').replace(/\s{2,}/g, ' ').trim() : s.text
        return (
          <li key={i} className="flex items-baseline gap-3 px-3 py-2.5 text-[15px] leading-relaxed sm:px-4">
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{s.n}</span>
            <span className="min-w-0 flex-1"><Highlight text={label || s.text} terms={terms} /></span>
            {date && <span dir="ltr" className="shrink-0 text-sm tabular-nums text-stone-500 dark:text-stone-400"><Highlight text={date.replace(/[()]/g, '')} terms={terms} /></span>}
          </li>
        )
      })}
    </ol>
  )
}

/** Editor for the deep-search text of a "מה בקלטת" doc (saved on close too, so nothing is lost). */
function DocTextEditor({ docId, indexEntry, userText, onSave }) {
  const [draft, setDraft] = useState(userText || '')
  const latest = useRef({ draft, userText })
  latest.current = { draft, userText }
  useEffect(() => () => {
    const { draft: d, userText: u } = latest.current
    if ((u || '') !== d) onSave(docId, d)
  }, [docId, onSave])
  const dirty = (userText || '') !== draft
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {indexEntry?.source === 'fetched' ? 'החיפוש כבר כולל את תוכן המסמך. אפשר להוסיף כאן פרטים משלכם (מי מופיע, מה קורה) — גם הם ייכללו בחיפוש.' : 'הדביקו כאן את תוכן המסמך כדי שהחיפוש ימצא כל מילה בו.'}
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder="טקסט נוסף לחיפוש…"
        className="w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-base leading-relaxed outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:text-sm dark:border-stone-700 dark:bg-stone-950/50"
      />
      <div className="flex justify-end">
        <button type="button" disabled={!dirty} onClick={() => onSave(docId, draft)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:bg-stone-200 disabled:text-stone-500 dark:disabled:bg-stone-800">
          {dirty ? 'שמור' : <><Check className="size-4" aria-hidden /> נשמר</>}
        </button>
      </div>
    </div>
  )
}

function DetailsPanel({ movie, docIndexEntry, userDocText, onSaveDocText, terms }) {
  const fetchedSegments = docIndexEntry?.source === 'fetched' ? docIndexEntry.segments : []
  const userSegments = userDocText ? parseSegments(userDocText) : []
  const segments = fetchedSegments.length ? fetchedSegments : userSegments
  const [showOriginal, setShowOriginal] = useState(!segments.length)
  return (
    <div className="space-y-4">
      {segments.length > 0 && <SegmentList segments={segments} terms={terms} />}
      <div className="flex flex-wrap gap-2">
        {segments.length > 0 && (
          <button type="button" onClick={() => setShowOriginal((v) => !v)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-sm font-semibold hover:border-amber-500 hover:text-amber-800 dark:border-stone-700 dark:hover:text-amber-300">
            <FileText className="size-4" aria-hidden /> {showOriginal ? 'הסתר את המסמך המקורי' : 'הצג את המסמך המקורי'}
          </button>
        )}
        <a href={movie.detailsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
          <ExternalLink className="size-4" aria-hidden /> פתח ב-Google Docs
        </a>
      </div>
      {showOriginal && movie.detailsEmbedUrl && (
        <EmbedFrame src={movie.detailsEmbedUrl} title={`מה בקלטת – ${movie.displayTitle}`} kind="doc" externalUrl={movie.detailsUrl} />
      )}
      <details className="group rounded-xl border border-stone-200 dark:border-stone-800">
        <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-stone-600 dark:text-stone-300">
          <Pencil className="size-4" aria-hidden /> הוספת פרטים לחיפוש
          <ChevronLeft className="ms-auto size-4 transition group-open:-rotate-90" aria-hidden />
        </summary>
        <div className="px-4 pb-4">
          <DocTextEditor docId={movie.docId} indexEntry={docIndexEntry} userText={userDocText} onSave={onSaveDocText} />
        </div>
      </details>
    </div>
  )
}

function PartsPanel({ parts, current, onSelect }) {
  return (
    <ol className="space-y-2">
      {parts.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onSelect(m)}
            aria-current={m.id === current.id ? 'true' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl p-2 text-start transition ${m.id === current.id ? 'bg-amber-500/15 ring-1 ring-amber-500/60' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
          >
            <Thumbnail movie={m} className="aspect-video w-28 shrink-0 rounded-lg" iconClass="size-5" />
            <span className="min-w-0">
              <span className="block font-semibold">{m.part ? `חלק ${m.part}` : m.displayTitle}</span>
              <span className="line-clamp-1 text-sm text-stone-500 dark:text-stone-400">{m.displayTitle}</span>
            </span>
            {m.id === current.id && <span className="ms-auto shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300">מוצג עכשיו</span>}
          </button>
        </li>
      ))}
    </ol>
  )
}

/** Notes with debounced autosave; flushed on close so nothing is lost. */
function NotesEditor({ movieId, note, onSave }) {
  const [draft, setDraft] = useState(note)
  const [status, setStatus] = useState('idle') // idle | pending | saved
  const latest = useRef({ draft, note })
  latest.current = { draft, note }

  useEffect(() => {
    if (draft === note) return
    setStatus('pending')
    const t = setTimeout(() => { onSave(movieId, draft); setStatus('saved') }, 700)
    return () => clearTimeout(t)
  }, [draft, note, movieId, onSave])

  useEffect(() => () => {
    const { draft: d, note: n } = latest.current
    if (d !== n) onSave(movieId, d)
  }, [movieId, onSave])

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold"><StickyNote className="size-4 text-amber-500" aria-hidden /> הערות אישיות</h3>
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400" aria-live="polite">
          {status === 'pending' ? 'שומר…' : status === 'saved' ? '✓ נשמר' : ''}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder="מי מופיע, מה קורה, זיכרונות… (ההערות נשמרות אוטומטית ונכללות בחיפוש)"
        className="w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-base leading-relaxed outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:text-sm dark:border-stone-700 dark:bg-stone-950/50"
      />
    </section>
  )
}

export default function VideoModal({
  movie, onClose, onPrev, onNext, position, parts, onSelect, searchTerms,
  tags, allTags, onAddTag, onRemoveTag, onTagClick,
  note, onSaveNote, isFavorite, onToggleFavorite,
  docIndexEntry, userDocText, onSaveDocText,
}) {
  const tabs = [
    movie.detailsUrl && { id: 'details', label: 'מה בקלטת', icon: FileText },
    parts.length > 1 && { id: 'parts', label: `חלקים (${parts.length})`, icon: Layers },
    { id: 'tags', label: 'תגיות והערות', icon: Tags, badge: tags.length || null },
  ].filter(Boolean)
  const [tab, setTab] = useState(tabs[0].id)
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    setTab((t) => (tabs.some((x) => x.id === t) ? t : tabs[0].id))
    scrollRef.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id])

  // ← / → move between movies (RTL: left = next). Ignored while typing or on the tab list.
  useEffect(() => {
    const onKey = (e) => {
      if (expanded || e.defaultPrevented) return
      const el = document.activeElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName) || el?.closest?.('[role=tablist]')) return
      if (e.key === 'ArrowLeft') onNext?.()
      else if (e.key === 'ArrowRight') onPrev?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext, onPrev, expanded])

  const onTabKey = (e) => {
    const i = tabs.findIndex((t) => t.id === tab)
    let next = null
    if (e.key === 'ArrowLeft') next = tabs[(i + 1) % tabs.length]
    if (e.key === 'ArrowRight') next = tabs[(i - 1 + tabs.length) % tabs.length]
    if (next) {
      e.preventDefault()
      setTab(next.id)
      document.getElementById(`tab-${next.id}`)?.focus()
    }
  }

  const onExpandedChange = useCallback((v) => setExpanded(v), [])
  const year = yearLabel(movie)

  return (
    <Sheet onClose={onClose} labelledBy="movie-modal-title" full maxWidth="sm:max-w-5xl">
      {/* Top bar: drag down to close on phones */}
      <div data-sheet-drag className="relative flex h-12 shrink-0 items-center justify-between gap-2 px-2 sm:h-14 sm:px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <span className="pointer-events-none absolute inset-x-0 top-1.5 mx-auto h-1.5 w-10 rounded-full bg-stone-300 sm:hidden dark:bg-stone-600" aria-hidden />
        <span className="ps-2 text-sm tabular-nums text-stone-500 dark:text-stone-400">{position}</span>
        <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white" aria-label="סגור">
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain">
        {/* Player (sticks to the top while scrolling the details on phones) */}
        <div className="sticky top-0 z-20 bg-white sm:static sm:px-6 dark:bg-stone-900">
          <div className="sm:mx-auto sm:max-w-[calc(56dvh*16/9)]">
          {movie.embedUrl ? (
            <EmbedFrame key={movie.id} src={movie.embedUrl} title={movie.displayTitle} kind="video" movie={movie} externalUrl={movie.movieUrl} onExpandedChange={onExpandedChange} />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-stone-100 text-center text-stone-500 sm:rounded-xl dark:bg-stone-950">
              <VideoOff className="size-8 text-amber-500" aria-hidden />
              <p className="font-medium">לסרט הזה עדיין אין קישור לצפייה.</p>
            </div>
          )}
          </div>
        </div>

        <div className="space-y-4 px-4 pb-8 pt-4 sm:px-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <div>
            <h2 id="movie-modal-title" className="font-display text-xl font-bold leading-tight sm:text-2xl">{movie.displayTitle}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
              {year && <span className="tabular-nums">{year}</span>}
              {movie.part && <span>חלק {movie.part}{parts.length > 1 ? ` מתוך ${parts.length}` : ''}</span>}
              {movie.type === 'audio' && <span>הקלטת שמע</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button type="button" onClick={() => onToggleFavorite(movie.id)} aria-pressed={isFavorite} className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${isFavorite ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700'}`}>
              <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden /> {isFavorite ? 'במועדפים' : 'מועדף'}
            </button>
            <button type="button" onClick={onPrev} disabled={!onPrev} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-stone-100 pe-4 ps-3 text-sm font-semibold transition hover:bg-stone-200 disabled:opacity-40 dark:bg-stone-800 dark:hover:bg-stone-700">
              <ChevronRight className="size-4" aria-hidden /> הקודם
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-stone-100 pe-3 ps-4 text-sm font-semibold transition hover:bg-stone-200 disabled:opacity-40 dark:bg-stone-800 dark:hover:bg-stone-700">
              הבא <ChevronLeft className="size-4" aria-hidden />
            </button>
            {movie.movieUrl && (
              <a href={movie.movieUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                <ExternalLink className="size-4" aria-hidden /> <bdi>Google Drive</bdi>
              </a>
            )}
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="פרטי הסרט" onKeyDown={onTabKey} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0 dark:border-stone-800">
            {tabs.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                className={`relative inline-flex h-12 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition ${tab === id ? 'text-amber-700 dark:text-amber-300' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'}`}
              >
                <Icon className="size-4" aria-hidden /> {label}
                {badge && <span className="rounded-full bg-amber-500/20 px-1.5 text-[11px] tabular-nums">{badge}</span>}
                <span className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber-500 transition-transform duration-300 ${tab === id ? 'scale-x-100' : 'scale-x-0'}`} />
              </button>
            ))}
          </div>

          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-w-0 animate-fade-in">
            {tab === 'details' && movie.detailsUrl && (
              <DetailsPanel key={movie.docId} movie={movie} docIndexEntry={docIndexEntry} userDocText={userDocText} onSaveDocText={onSaveDocText} terms={searchTerms} />
            )}
            {tab === 'parts' && <PartsPanel parts={parts} current={movie} onSelect={onSelect} />}
            {tab === 'tags' && (
              <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
                <section className="min-w-0">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><Tags className="size-4 text-amber-500" aria-hidden /> תגיות</h3>
                  <TagEditor movie={movie} tags={tags} allTags={allTags} onAdd={onAddTag} onRemove={onRemoveTag} onTagClick={onTagClick} />
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">לחיצה על תגית מציגה את כל הסרטים שמתויגים בה.</p>
                </section>
                <NotesEditor key={movie.id} movieId={movie.id} note={note} onSave={onSaveNote} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
