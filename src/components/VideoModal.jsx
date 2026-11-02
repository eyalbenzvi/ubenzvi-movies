import { useCallback, useEffect, useRef, useState } from 'react'
import { BookmarkPlus, Check, ChevronLeft, Download, Maximize2, Scissors, ChevronRight, ExternalLink, FileText, Heart, Layers, Pencil, StickyNote, Tags, VideoOff, X } from 'lucide-react'
import EmbedFrame from './EmbedFrame.jsx'
import Highlight from './Highlight.jsx'
import Sheet from './Sheet.jsx'
import TagEditor from './TagEditor.jsx'
import MomentComposer from './MomentComposer.jsx'
import MomentList from './MomentList.jsx'
import GoogleButton from './GoogleButton.jsx'
import ClipPanel from './ClipPanel.jsx'
import Thumbnail from './Thumbnail.jsx'
import { yearLabel } from './MovieCard.jsx'
import { parseSegments } from '../lib/docParse.js'
import { formatTime, withStartTime } from '../lib/time.js'
import { useGoogleAuth } from '../hooks/useGoogleAuth.jsx'

const DATE_RE = /(\(?\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\)?|\(?\d{1,2}[/.]\d{2,4}\)?|(?<!\d)(?:19|20)\d{2}(?:-(?:19|20)\d{2})?(?!\d))/

function SegmentList({ segments, terms }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {segments.map((s, i) => {
        const date = s.text.match(DATE_RE)?.[0]
        const label = date ? s.text.replace(date, '').replace(/\s+[-–]\s*$|^\s*[-–]\s+/g, '').replace(/\s{2,}/g, ' ').trim() : s.text
        return (
          <li key={i} className="flex items-baseline gap-3 px-3 py-2.5 text-base leading-6 sm:px-4">
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{s.n}</span>
            <span className="min-w-0 flex-1"><Highlight text={label || s.text} terms={terms} /></span>
            {date && <span dir="ltr" className="shrink-0 text-sm tabular-nums text-muted"><Highlight text={date.replace(/[()]/g, '')} terms={terms} /></span>}
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
      <p className="text-sm text-muted">
        {indexEntry?.source === 'fetched' ? 'החיפוש כבר כולל את תוכן המסמך. אפשר להוסיף כאן פרטים משלכם (מי מופיע, מה קורה) — גם הם ייכללו בחיפוש.' : 'הדביקו כאן את תוכן המסמך כדי שהחיפוש ימצא כל מילה בו.'}
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder="טקסט נוסף לחיפוש…"
        className="w-full resize-y rounded-2xl border border-line-strong bg-surface p-3 text-base leading-relaxed outline-none focus:border-focus focus:ring-2 focus:ring-focus/25 sm:text-sm"
      />
      <div className="flex justify-end">
        <button type="button" disabled={!dirty} onClick={() => onSave(docId, draft)} className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:bg-amber-500/35 disabled:text-stone-950/60">
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
          <button type="button" onClick={() => setShowOriginal((v) => !v)} className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-line-strong px-3 text-sm font-semibold hover:border-amber-500 hover:text-accent-ink">
            <FileText className="size-4" aria-hidden /> {showOriginal ? 'הסתר את המסמך המקורי' : 'הצג את המסמך המקורי'}
          </button>
        )}
        <a href={movie.detailsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-muted hover:bg-surface-2">
          <ExternalLink className="size-4" aria-hidden /> פתח ב-Google Docs
        </a>
      </div>
      {showOriginal && movie.detailsEmbedUrl && (
        <EmbedFrame src={movie.detailsEmbedUrl} title={`מה בקלטת – ${movie.displayTitle}`} kind="doc" externalUrl={movie.detailsUrl} />
      )}
      <details className="disclosure group rounded-2xl border border-line">
        <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-muted">
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
            className={`flex w-full items-center gap-3 rounded-2xl p-2 text-start transition ${m.id === current.id ? 'bg-amber-500/15 ring-1 ring-amber-500/60' : 'hover:bg-surface-2 '}`}
          >
            <Thumbnail movie={m} className="aspect-video w-28 shrink-0 rounded-lg" iconClass="size-5" />
            <span className="min-w-0">
              <span className="block font-semibold">{m.part ? `חלק ${m.part}` : m.displayTitle}</span>
              <span className="line-clamp-1 text-sm text-muted">{m.displayTitle}</span>
            </span>
            {m.id === current.id && <span className="ms-auto shrink-0 text-xs font-semibold text-accent-ink">מוצג עכשיו</span>}
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
        className="w-full resize-y rounded-2xl border border-line-strong bg-surface p-3 text-base leading-relaxed outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/25 sm:text-sm"
      />
    </section>
  )
}

export default function VideoModal({
  movie, onClose, onPrev, onNext, position, parts, onSelect, searchTerms,
  tags, moments, allTags, onAddTag, onRemoveTag, onTagClick, startAt, onUpdateMoment, onRemoveMoment,
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
  const [jump, setJump] = useState(() => ({ t: startAt || 0, n: 0 })) // start time for the player (seconds)
  const firstRun = useRef(true)
  const scrollRef = useRef(null)
  const [barNote, setBarNote] = useState(null) // { kind: 'jump' | 'saved', label?, t }
  const [composerOpen, setComposerOpen] = useState(false)
  const [clipOpen, setClipOpen] = useState(false)
  const auth = useGoogleAuth()
  const [nativeFailed, setNativeFailed] = useState(false)
  const videoRef = useRef(null)
  // Signed in with Google → our own player (streams under the user's identity, time is readable)
  const useNative = auth.canStream && !!movie.streamUrl && !nativeFailed

  const jumpTo = useCallback((t) => {
    const v = videoRef.current
    if (useNative && v) {
      v.currentTime = t
      v.play?.().catch(() => {})
      setBarNote({ kind: 'jump-native', t })
    } else {
      setJump((j) => ({ t, n: j.n + 1 }))
      setBarNote({ kind: 'jump', t })
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [useNative])

  const getNow = useNative ? () => (videoRef.current ? Math.floor(videoRef.current.currentTime) : null) : undefined

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      if (startAt) setBarNote({ kind: 'jump', t: startAt })
      return
    }
    setJump((j) => ({ t: startAt || 0, n: j.n + 1 }))
    setBarNote(startAt ? { kind: 'jump', t: startAt } : null)
    setComposerOpen(false)
    setClipOpen(false)
    setNativeFailed(false)
    setTab((t) => (tabs.some((x) => x.id === t) ? t : tabs[0].id))
    scrollRef.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id, startAt])

  // "✓ נשמר" disappears after a few seconds
  useEffect(() => {
    if (barNote?.kind !== 'saved') return
    const t = setTimeout(() => setBarNote(null), 3500)
    return () => clearTimeout(t)
  }, [barNote])

  const saveMoment = useCallback((label, sec) => {
    onAddTag(movie.id, label, sec)
    setComposerOpen(false)
    setBarNote({ kind: 'saved', label, t: sec })
  }, [onAddTag, movie.id])

  const statusText = barNote?.kind === 'saved'
    ? `✓ נשמר: ${barNote.label} · ${formatTime(barNote.t)}`
    : barNote?.kind === 'jump' ? `▶ ${formatTime(barNote.t)} · לחצו ניגון`
    : barNote?.kind === 'jump-native' ? `▶ מנגן מ-${formatTime(barNote.t)}`
    : barNote?.kind === 'fallback' ? 'לא ניתן לנגן דרך החשבון — עברנו לנגן של Google' : ''

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
      <div className="relative flex h-14 shrink-0 items-center gap-1 px-2 sm:px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button type="button" onClick={onPrev} disabled={!onPrev} className="flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-surface-2 disabled:opacity-30" aria-label="הסרט הקודם">
          <ChevronRight className="size-6" aria-hidden />
        </button>
        <span className="min-w-0 truncate px-1 text-sm tabular-nums text-muted">{position}</span>
        <button type="button" onClick={onNext} disabled={!onNext} className="flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-surface-2 disabled:opacity-30" aria-label="הסרט הבא">
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="סגור">
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain">
        {/* Player (sticks to the top while scrolling the details on phones) */}
        <div className="sticky top-0 z-20 bg-surface sm:static sm:px-6">
          <div className="sm:mx-auto sm:max-w-[calc(56dvh*16/9)]">
          {movie.embedUrl ? (
            <EmbedFrame
              key={useNative ? `${movie.id}-native` : `${movie.id}-${jump.n}`}
              src={withStartTime(movie.embedUrl, jump.t)}
              nativeSrc={useNative ? movie.streamUrl : null}
              startAt={jump.t}
              onVideo={(el) => { videoRef.current = el }}
              onNativeError={() => { setNativeFailed(true); setBarNote({ kind: 'fallback' }) }}
              title={movie.displayTitle}
              kind="video"
              movie={movie}
              externalUrl={movie.movieUrl}
              onExpandedChange={onExpandedChange}
              onMark={() => { videoRef.current?.pause?.(); setComposerOpen(true) }}
              status={statusText}
              overlay={composerOpen && (
                <MomentComposer dark movie={movie} moments={moments} tags={tags} allTags={allTags} onSave={saveMoment} onClose={() => setComposerOpen(false)} getNow={getNow} />
              )}
              renderBar={({ expand, expanded: isFull }) => (
                <>
                  <div className="flex h-14 items-center gap-2 border-b border-line px-3 sm:px-0">
                    <button type="button" onClick={() => { if (!composerOpen) videoRef.current?.pause?.(); setClipOpen(false); setComposerOpen((v) => !v) }} aria-expanded={composerOpen}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-4 text-sm font-semibold text-stone-950 ring-1 ring-black/10 hover:bg-amber-400 dark:ring-0">
                      <BookmarkPlus className="size-4" aria-hidden /> סמן רגע
                    </button>
                    <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-sm font-medium text-accent-ink">
                      {statusText && <bdi>{statusText}</bdi>}
                    </p>
                    <button type="button" onClick={expand} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold hover:bg-line">
                      <Maximize2 className="size-4" aria-hidden /> מסך מלא
                    </button>
                  </div>
                  {auth.enabled && !useNative && (auth.status === 'signed-out' || auth.status === 'expired') && (
                    <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-3 py-2 text-sm sm:px-0 sm:bg-transparent">
                      <span className="min-w-0 flex-1 text-muted">
                        {auth.status === 'expired' ? 'החיבור לגוגל פג.' : 'הנגן מבקש להתחבר לגוגל?'}
                      </span>
                      <GoogleButton onClick={auth.signIn} label={auth.status === 'expired' ? 'התחברות מחדש' : 'התחברות עם Google'} />
                    </div>
                  )}
                  {clipOpen && !isFull && (
                    <ClipPanel movie={movie} videoRef={videoRef} canRecord={useNative} auth={auth} onClose={() => setClipOpen(false)} />
                  )}
                  {composerOpen && !isFull && (
                    <MomentComposer movie={movie} moments={moments} tags={tags} allTags={allTags} onSave={saveMoment} onClose={() => setComposerOpen(false)} autoFocus getNow={getNow} />
                  )}
                </>
              )}
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-surface-2 text-center text-muted sm:rounded-2xl">
              <VideoOff className="size-8 text-amber-500" aria-hidden />
              <p className="font-medium">לסרט הזה עדיין אין קישור לצפייה.</p>
            </div>
          )}
          </div>
        </div>

        <div className="space-y-4 px-4 pb-8 pt-4 sm:mx-auto sm:max-w-[calc(56dvh*16/9+3rem)] sm:px-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <div>
            <h2 id="movie-modal-title" className="font-display text-2xl font-semibold leading-[1.2] sm:text-[28px]">{movie.displayTitle}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {year && <span className="tabular-nums">{year}</span>}
              {movie.part && <span>חלק {movie.part}{parts.length > 1 ? ` מתוך ${parts.length}` : ''}</span>}
              {movie.type === 'audio' && <span>הקלטת שמע</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button type="button" onClick={() => onToggleFavorite(movie.id)} aria-pressed={isFavorite} className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${isFavorite ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-surface-2 text-ink hover:bg-line'}`}>
              <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden /> {isFavorite ? 'במועדפים' : 'הוספה למועדפים'}
            </button>
            {movie.streamUrl && (
              <button type="button" onClick={() => { setComposerOpen(false); setClipOpen((v) => !v); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-expanded={clipOpen}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink hover:bg-line">
                <Scissors className="size-4" aria-hidden /> גזירת קטע
              </button>
            )}
            {movie.streamUrl && (useNative ? (
              // A plain navigation (not the download attribute) so the service worker handles it;
              // its "Content-Disposition: attachment" makes the browser save the file and stay on the page
              <a href={`${movie.streamUrl}${movie.streamUrl.includes('?') ? '&' : '?'}download=1`}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink hover:bg-line"
                title="הורדת הסרט המלא למכשיר">
                <Download className="size-4" aria-hidden /> הורדה
              </a>
            ) : (
              <a href={movie.driveDownloadUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink hover:bg-line"
                title="הורדה דרך Google Drive">
                <Download className="size-4" aria-hidden /> הורדה
              </a>
            ))}
            {movie.movieUrl && (
              <a href={movie.movieUrl} target="_blank" rel="noopener noreferrer" className="ms-auto inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="פתח ב-Google Drive" title="פתח ב-Google Drive">
                <ExternalLink className="size-5" aria-hidden />
              </a>
            )}
          </div>

          {movie.embedUrl && (
            <MomentList
              moments={moments}
              searchTerms={searchTerms}
              onJump={jumpTo}
              onUpdate={(from, to) => onUpdateMoment(movie.id, from, to)}
              onDelete={(m) => onRemoveMoment(movie.id, m.tag, m.t)}
              onRestore={(m) => onAddTag(movie.id, m.tag, m.t)}
              onMark={() => { setComposerOpen(true); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
          )}

          {/* Tabs */}
          <div role="tablist" aria-label="פרטי הסרט" onKeyDown={onTabKey} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
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
                className={`relative inline-flex h-12 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition ${tab === id ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                <Icon className="size-4" aria-hidden /> {label}
                {badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500/20 px-1 text-xs tabular-nums">{badge}</span>}
                <span className={`absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-amber-500 transition-transform duration-200 ease-[var(--ease-out)] ${tab === id ? 'scale-x-100' : 'scale-x-0'}`} />
              </button>
            ))}
          </div>

          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-w-0">
            {tab === 'details' && movie.detailsUrl && (
              <DetailsPanel key={movie.docId} movie={movie} docIndexEntry={docIndexEntry} userDocText={userDocText} onSaveDocText={onSaveDocText} terms={searchTerms} />
            )}
            {tab === 'parts' && <PartsPanel parts={parts} current={movie} onSelect={onSelect} />}
            {tab === 'tags' && (
              <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
                <section className="min-w-0">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><Tags className="size-4 text-amber-500" aria-hidden /> תגיות</h3>
                  <TagEditor movie={movie} tags={tags} moments={moments} allTags={allTags} onAdd={onAddTag} onRemove={onRemoveTag} onTagClick={onTagClick} />
                  <p className="mt-3 text-xs text-muted">לחיצה על תגית מציגה את כל הסרטים שמתויגים בה.</p>
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
