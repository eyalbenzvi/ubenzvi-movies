import { useEffect, useRef, useState } from 'react'
import { AlertCircle, BookmarkPlus, ExternalLink, Loader2, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import Thumbnail from './Thumbnail.jsx'

const LOAD_TIMEOUT_MS = 15000

const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement
const exitFs = () => { if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}) }

/**
 * Embedded Drive player / Docs viewer.
 * - sandbox without allow-popups / allow-top-navigation → Drive's own pop-out and links inside
 *   docs cannot navigate away from the app (Drive's pop-out button is also covered).
 * - "מסך מלא" enlarges inside the app (native fullscreen where available, otherwise a full
 *   viewport overlay, e.g. iPhone). Back / Esc / "חזרה לאפליקציה" return to the modal.
 * - Shows the poster while loading and a friendly fallback if nothing loads.
 */
export default function EmbedFrame({ src, title, kind, movie, externalUrl, onExpandedChange, renderBar, overlay, onMark, status, nativeSrc, startAt = 0, onVideo, onNativeError }) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const wrapRef = useRef(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    setLoaded(false)
    setTimedOut(false)
    const t = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [src, nativeSrc, attempt])

  useEffect(() => { onExpandedChange?.(expanded) }, [expanded, onExpandedChange])

  const exitExpanded = () => {
    pushedRef.current = false
    setExpanded(false)
    screen.orientation?.unlock?.()
    exitFs()
  }

  const expand = () => {
    window.history.pushState(window.history.state, '') // so Back closes full screen
    pushedRef.current = true
    setExpanded(true)
    const el = wrapRef.current
    const req = el?.requestFullscreen || el?.webkitRequestFullscreen
    if (req) {
      Promise.resolve(req.call(el))
        .then(() => { if (kind === 'video') screen.orientation?.lock?.('landscape')?.catch?.(() => {}) })
        .catch(() => { /* not allowed → CSS overlay only */ })
    }
  }

  const collapse = () => {
    if (pushedRef.current) window.history.back() // → popstate → exitExpanded
    else exitExpanded()
  }

  // Leaving full screen if the content changes underneath it
  const firstSrc = useRef(src)
  useEffect(() => {
    if (src !== firstSrc.current && expanded) exitExpanded() // no history.back(): it would undo the navigation
    firstSrc.current = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    if (!expanded) return
    const onPop = () => exitExpanded()
    const onFsChange = () => { if (!fsElement()) collapse() }
    const onKey = (e) => {
      // While enlarged, the modal must not react to keys (Esc closes full screen, arrows do nothing)
      if (e.target?.closest?.('[data-moment-composer]')) return // Esc there closes the panel, not full screen
      if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); collapse() }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation()
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

  useEffect(() => () => exitFs(), [])

  const isDoc = kind === 'doc'
  const frameBox = expanded
    ? `fixed inset-0 z-[70] flex flex-col ${isDoc ? 'bg-surface' : 'bg-black'}`
    : `relative overflow-hidden ${isDoc ? 'h-[calc(100dvh-16rem)] min-h-80 rounded-xl border border-line bg-surface ' : 'aspect-video bg-black sm:rounded-xl'}`

  return (
    <>
    <div ref={wrapRef} className={frameBox}>
      {expanded && (
        <div className="flex shrink-0 items-center gap-2 bg-stone-950 px-3 py-1.5 text-stone-100" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}>
          <span className="min-w-0 flex-1 truncate text-sm font-medium" role="status" aria-live="polite">{status || title}</span>
          {onMark && (
            <button type="button" onClick={onMark} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm font-semibold hover:bg-white/25">
              <BookmarkPlus className="size-4" aria-hidden /> סמן רגע
            </button>
          )}
          <button type="button" onClick={collapse} aria-label="חזרה לאפליקציה" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-stone-950 hover:bg-amber-400">
            <Minimize2 className="size-4" aria-hidden /> חזרה
          </button>
        </div>
      )}
      {expanded && overlay}
      <div className={expanded ? 'relative flex-1' : 'absolute inset-0'}>
        {!loaded && (
          <div className="absolute inset-0">
            {!isDoc && movie && <Thumbnail movie={movie} className="size-full opacity-40" iconClass="size-12" />}
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center ${isDoc ? 'text-stone-500' : 'text-stone-200'}`}>
              {timedOut ? (
                <>
                  <AlertCircle className="size-8 text-amber-500" aria-hidden />
                  <p className="font-semibold">{isDoc ? 'המסמך לא נטען כאן' : 'הסרטון לא נטען כאן'}</p>
                  <p className="max-w-xs text-sm opacity-80">ייתכן שהקובץ לא משותף, או שהדפדפן חוסם תוכן של Google.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => setAttempt((a) => a + 1)} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-sm font-semibold backdrop-blur hover:bg-white/25">
                      <RefreshCw className="size-4" aria-hidden /> נסה שוב
                    </button>
                    {externalUrl && (
                      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400">
                        <ExternalLink className="size-4" aria-hidden /> {isDoc ? 'פתח ב-Google Docs' : 'פתח ב-Google Drive'}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="size-8 animate-spin text-amber-500" aria-hidden />
                  <span className="text-sm">טוען…</span>
                </>
              )}
            </div>
          </div>
        )}
        {nativeSrc ? (
          // Signed in: our own player, streamed via the Drive API under the user's identity (public/sw.js)
          <video
            key={`${nativeSrc}#${attempt}`}
            ref={(el) => onVideo?.(el)}
            src={nativeSrc}
            controls
            playsInline
            preload="metadata"
            title={title}
            onLoadedMetadata={(e) => { if (startAt) e.currentTarget.currentTime = startAt; setLoaded(true) }}
            onError={() => onNativeError?.()}
            className={`absolute inset-0 size-full bg-black transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
        <iframe
            key={`${src}#${attempt}`}
            src={src}
            title={title}
            onLoad={() => setLoaded(true)}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            className={`absolute inset-0 size-full border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {!isDoc && loaded && !nativeSrc && (
          // Covers Drive's own "open in Drive" pop-out button (top-right of the player)
          <div className="absolute right-0 top-0 z-10 size-16" aria-hidden />
        )}
        {!expanded && !renderBar && (
          <button
            type="button"
            onClick={expand}
            className="absolute bottom-2 end-2 z-10 inline-flex h-10 items-center gap-1.5 rounded-lg bg-black/70 px-3 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-black/85"
          >
            <Maximize2 className="size-4" aria-hidden /> מסך מלא
          </button>
        )}
      </div>
    </div>
    {renderBar?.({ expand, expanded })}
    </>
  )
}
