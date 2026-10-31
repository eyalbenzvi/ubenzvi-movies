import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Calendar, ChevronLeft, ChevronRight, ExternalLink, FileText, Heart, Loader2,
  Maximize2, Minimize2, Pencil, Play, Save, StickyNote, Tags, X,
} from 'lucide-react'
import TagEditor from './TagEditor.jsx'

const SOURCE_LABEL = {
  user: 'תוכן שהוזן ידנית',
  fetched: 'תוכן שנשלף מהמסמך',
  auto: 'תקציר אוטומטי (מבוסס על פרטי הקלטת)',
}

/**
 * Embedded Drive player / Docs viewer.
 *
 * - `sandbox` without allow-popups / allow-top-navigation: Drive's own "open in Drive" (pop-out)
 *   button and links inside docs can no longer navigate away from the app.
 * - Our own "מסך מלא" button enlarges the frame inside the app (native fullscreen where the
 *   browser supports it, CSS full-viewport overlay otherwise, e.g. iPhone). The phone's Back
 *   button / gesture exits full screen instead of leaving the app.
 */
function EmbedFrame({ src, title, kind }) {
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const wrapRef = useRef(null)
  const pushedRef = useRef(false)
  useEffect(() => setLoaded(false), [src])

  const expand = () => {
    // Extra history entry (same URL & router state) so Back closes full screen.
    window.history.pushState(window.history.state, '')
    pushedRef.current = true
    setExpanded(true)
    const el = wrapRef.current
    const req = el?.requestFullscreen || el?.webkitRequestFullscreen
    if (req) {
      Promise.resolve(req.call(el))
        .then(() => { if (kind === 'video') screen.orientation?.lock?.('landscape').catch(() => {}) })
        .catch(() => { /* not allowed → CSS overlay only */ })
    }
  }

  const collapse = () => {
    if (pushedRef.current) window.history.back() // → popstate → exitExpanded
    else exitExpanded()
  }

  const exitExpanded = () => {
    pushedRef.current = false
    setExpanded(false)
    screen.orientation?.unlock?.()
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement
    if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {})
  }

  useEffect(() => {
    if (!expanded) return
    const onPop = () => exitExpanded()
    const onFsChange = () => {
      // User left native fullscreen (system back / swipe) → also leave the overlay
      if (!(document.fullscreenElement || document.webkitFullscreenElement)) collapse()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); collapse() }
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // Leaving the modal while enlarged: drop native fullscreen
  useEffect(() => () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {})
    }
  }, [])

  const frameBox = expanded
    ? 'fixed inset-0 z-[70] flex flex-col bg-black'
    : `relative overflow-hidden rounded-xl ${kind === 'doc' ? 'h-[60vh] bg-white' : 'aspect-video bg-black'}`

  return (
    <div ref={wrapRef} className={frameBox}>
      {expanded && (
        <div className="flex shrink-0 items-center justify-between gap-2 bg-stone-950 px-3 py-2 text-stone-100" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <span className="truncate text-sm font-medium">{title}</span>
          <button
            type="button"
            onClick={collapse}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400"
          >
            <Minimize2 className="size-4" /> חזרה לאפליקציה
          </button>
        </div>
      )}
      <div className={expanded ? 'relative flex-1' : 'absolute inset-0'}>
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-stone-400">
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <span className="text-sm">טוען…</span>
          </div>
        )}
        <iframe
          key={src}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          className={`absolute inset-0 size-full border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {kind === 'video' && loaded && (
          // Covers Drive's own "open in Drive" pop-out button (top-right of the player)
          <div className="absolute right-0 top-0 z-10 size-16" aria-hidden onClick={(e) => e.preventDefault()} />
        )}
        {!expanded && (
          <button
            type="button"
            onClick={expand}
            className="absolute bottom-2 end-2 inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:bg-black/85"
            aria-label="מסך מלא"
          >
            <Maximize2 className="size-4" /> מסך מלא
          </button>
        )}
      </div>
    </div>
  )
}

function OpenButton({ href, children, primary }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        primary
          ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400'
          : 'border border-stone-300 text-stone-700 hover:border-amber-500 hover:text-amber-700 dark:border-stone-700 dark:text-stone-200 dark:hover:text-amber-300'
      }`}
    >
      <ExternalLink className="size-4" /> {children}
    </a>
  )
}

function DocContentEditor({ movie, indexEntry, userText, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const source = userText ? 'user' : indexEntry?.source
  const text = userText || indexEntry?.text || ''

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/50">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">טקסט לחיפוש עמוק</h4>
          <p className="text-xs text-stone-500 dark:text-stone-400">מקור: {SOURCE_LABEL[source] || '—'}</p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => { setDraft(userText || (indexEntry?.source === 'fetched' ? indexEntry.text : '')); setEditing(true) }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium transition hover:border-amber-500 hover:text-amber-700 dark:border-stone-700 dark:hover:text-amber-300"
          >
            <Pencil className="size-3.5" /> {userText ? 'ערוך' : 'הדבק תוכן מהמסמך'}
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">ביטול</button>
            <button
              type="button"
              onClick={() => { onSave(movie.docId, draft); setEditing(false) }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400"
            >
              <Save className="size-3.5" /> שמור
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          autoFocus
          placeholder={'העתק את תוכן מסמך "מה בקלטת" (Ctrl+A, Ctrl+C) והדבק כאן — מעכשיו החיפוש ימצא כל מילה שבו. השאר ריק כדי לחזור לתקציר האוטומטי.'}
          className="w-full resize-y rounded-lg border border-stone-300 bg-white p-2.5 text-sm leading-relaxed outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-stone-700 dark:bg-stone-900"
        />
      ) : (
        <p className="scrollbar-thin max-h-40 overflow-auto whitespace-pre-line text-sm leading-relaxed text-stone-600 dark:text-stone-300">{text}</p>
      )}
    </div>
  )
}

export default function VideoModal({
  movie, onClose, onPrev, onNext, position,
  tags, allTags, onAddTag, onRemoveTag, onTagClick,
  note, onSaveNote, isFavorite, onToggleFavorite,
  docIndexEntry, userDocText, onSaveDocText,
}) {
  const [tab, setTab] = useState('video')
  const [noteDraft, setNoteDraft] = useState(note || '')
  const dialogRef = useRef(null)

  useEffect(() => { setTab(movie.movieUrl ? 'video' : movie.detailsUrl ? 'details' : 'tags') }, [movie.id, movie.movieUrl, movie.detailsUrl])
  useEffect(() => { setNoteDraft(note || '') }, [movie.id, note])

  // Keyboard: Esc closes, ←/→ navigate (RTL: left = next)
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)
      if (e.key === 'Escape') onClose()
      else if (!typing && e.key === 'ArrowLeft') onNext?.()
      else if (!typing && e.key === 'ArrowRight') onPrev?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onPrev])

  // Lock background scroll & move focus into the dialog
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  const tabs = [
    { id: 'video', label: 'צפייה', icon: Play, show: true },
    { id: 'details', label: 'מה בקלטת', icon: FileText, show: !!movie.detailsUrl },
    { id: 'tags', label: 'תגיות והערות', icon: Tags, show: true, badge: tags.length || null },
  ].filter((t) => t.show)

  const noteDirty = (note || '') !== noteDraft

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-modal-title"
        className="relative flex max-h-[96dvh] w-full max-w-5xl animate-pop-in flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-900 sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2 id="movie-modal-title" className="font-display text-xl font-bold leading-tight sm:text-2xl">{movie.displayTitle}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
              {movie.year && <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" />{movie.year}{movie.yearEnd && movie.yearEnd !== movie.year ? `–${movie.yearEnd}` : ''}</span>}
              {movie.type === 'audio' && <span>הקלטת שמע</span>}
              {position && <span className="tabular-nums">{position}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => onToggleFavorite(movie.id)} className={`rounded-full p-2 transition ${isFavorite ? 'text-rose-500' : 'text-stone-400 hover:text-rose-500'}`} aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'} aria-pressed={isFavorite}>
              <Heart className={`size-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button type="button" onClick={onPrev} disabled={!onPrev} className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" aria-label="הקודם">
              <ChevronRight className="size-5" />
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800" aria-label="הבא">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-white" aria-label="סגור">
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-stone-200 px-3 dark:border-stone-800 sm:px-5" role="tablist">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`relative inline-flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-medium transition ${tab === id ? 'text-amber-700 dark:text-amber-300' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'}`}
            >
              <Icon className="size-4" /> {label}
              {badge && <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] tabular-nums">{badge}</span>}
              <span className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber-500 transition-transform duration-300 ${tab === id ? 'scale-x-100' : 'scale-x-0'}`} />
            </button>
          ))}
        </nav>

        {/* Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === 'video' && (
            <div className="animate-fade-in space-y-4">
              {movie.embedUrl ? (
                <>
                  <EmbedFrame src={movie.embedUrl} title={movie.displayTitle} kind="video" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      להגדלה השתמשו בכפתור "מסך מלא" — כך נשארים באפליקציה. אם הסרטון לא מוצג (הרשאות שיתוף או קובץ שטרם עובד) — פתחו אותו ב-Google Drive.
                    </p>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {movie.detailsUrl && (
                        <button type="button" onClick={() => setTab('details')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-amber-500 hover:text-amber-700 dark:border-stone-700 dark:text-stone-200 dark:hover:text-amber-300">
                          <FileText className="size-4" /> מה בקלטת
                        </button>
                      )}
                      <OpenButton href={movie.movieUrl}>פתח ב-Google Drive</OpenButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stone-300 text-center text-stone-500 dark:border-stone-700">
                  <AlertCircle className="size-8 text-amber-500" />
                  <p className="font-medium">לסרט הזה עדיין אין קישור לצפייה.</p>
                  <p className="text-sm">ניתן להוסיף אותו בקובץ <code dir="ltr">src/data/catalog.json</code>.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'details' && movie.detailsUrl && (
            <div className="animate-fade-in space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-stone-600 dark:text-stone-300">פירוט תוכן הקלטת ("מה בקלטת") — מסמך Google Docs.</p>
                <OpenButton href={movie.detailsUrl}>פתח ב-Google Docs</OpenButton>
              </div>
              <EmbedFrame src={movie.detailsEmbedUrl} title={`מה בקלטת – ${movie.displayTitle}`} kind="doc" />
              <DocContentEditor movie={movie} indexEntry={docIndexEntry} userText={userDocText} onSave={onSaveDocText} />
            </div>
          )}

          {tab === 'tags' && (
            <div className="animate-fade-in grid min-h-[22rem] gap-6 md:grid-cols-2">
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><Tags className="size-4 text-amber-500" /> תגיות</h3>
                <TagEditor movie={movie} tags={tags} allTags={allTags} onAdd={onAddTag} onRemove={onRemoveTag} onTagClick={onTagClick} />
                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">לחיצה על תגית תסנן את הקטלוג לכל הסרטים המתויגים בה.</p>
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><StickyNote className="size-4 text-amber-500" /> הערות אישיות</h3>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => { if (noteDirty) onSaveNote(movie.id, noteDraft) }}
                  rows={6}
                  placeholder="מי מופיע, מה קורה, זיכרונות… (גם ההערות נכללות בחיפוש)"
                  className="w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-sm leading-relaxed outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-stone-700 dark:bg-stone-950/50"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={!noteDirty}
                    onClick={() => onSaveNote(movie.id, noteDraft)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:opacity-40"
                  >
                    <Save className="size-4" /> {noteDirty ? 'שמור הערה' : 'נשמר'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
