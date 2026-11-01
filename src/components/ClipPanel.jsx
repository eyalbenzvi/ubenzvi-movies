import { useEffect, useRef, useState } from 'react'
import { Download, Info, Loader2, RotateCcw, Scissors, Share2, X } from 'lucide-react'
import TimeInput from './TimeInput.jsx'
import GoogleButton from './GoogleButton.jsx'
import { MAX_CLIP_SECONDS, clipFileName, clipSupported, recordClip } from '../lib/clip.js'
import { formatTime, parseTimeInput } from '../lib/time.js'

const toDigits = (sec) => formatTime(sec).replace(/\D/g, '').replace(/^0+(?=\d)/, '')

function NowButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:bg-surface-2 hover:text-ink">
      <RotateCcw className="size-4" aria-hidden />
    </button>
  )
}

/** "גזירת קטע" — record a segment of the video (our own player only) and save/share it. */
export default function ClipPanel({ movie, videoRef, canRecord, auth, onClose }) {
  const now = () => Math.floor(videoRef.current?.currentTime || 0)
  const [startD, setStartD] = useState(() => toDigits(now()))
  const [endD, setEndD] = useState(() => toDigits(now() + 60))
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState('setup') // setup | recording | done
  const [progress, setProgress] = useState({ p: 0, t: 0 })
  const [result, setResult] = useState(null) // { url, file }
  const abortRef = useRef(null)

  useEffect(() => () => { abortRef.current?.abort(); if (result?.url) URL.revokeObjectURL(result.url) }, [result])

  // Leaving the page (other app / locked screen) stops playback, so stop the recording with a clear message
  const leftPage = useRef(false)
  useEffect(() => {
    if (phase !== 'recording') return
    const onVis = () => { if (document.hidden) { leftPage.current = true; abortRef.current?.abort() } }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  const close = () => { abortRef.current?.abort(); onClose() }

  if (!canRecord) {
    return (
      <div className="space-y-2 border-b border-line bg-surface px-3 py-3 text-sm" data-moment-composer>
        <div className="flex items-start gap-2">
          <Scissors className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <p className="min-w-0 flex-1 text-muted">
            {!clipSupported()
              ? 'הדפדפן הזה לא תומך בגזירת קטעים. נסו בכרום או בספארי מעודכנים.'
              : 'גזירת קטע עובדת עם הנגן של האתר, שזמין אחרי התחברות עם Google.'}
          </p>
          <button type="button" onClick={close} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label="סגור"><X className="size-4" aria-hidden /></button>
        </div>
        {clipSupported() && auth.enabled && auth.status !== 'signed-in' && <GoogleButton onClick={auth.signIn} />}
      </div>
    )
  }

  const start = parseTimeInput(startD)
  const end = parseTimeInput(endD)
  const length = !start.error && !end.error ? end.sec - start.sec : null
  const duration = videoRef.current?.duration

  const begin = () => {
    const v = videoRef.current
    if (start.error) return setError(`התחלה: ${start.error}`)
    if (end.error) return setError(`סיום: ${end.error}`)
    if (length <= 0) return setError('זמן הסיום צריך להיות אחרי זמן ההתחלה')
    if (length > MAX_CLIP_SECONDS) return setError('הקטע ארוך מדי — עד 15 דקות')
    if (Number.isFinite(duration) && start.sec >= duration) return setError(`הסרטון ארוך ${formatTime(duration)} בלבד`)
    if (!v) return setError('הנגן עוד לא מוכן')
    const stopAt = Number.isFinite(duration) ? Math.min(end.sec, duration) : end.sec
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError(null)
    setPhase('recording')
    setProgress({ p: 0, t: start.sec })
    recordClip(v, { start: start.sec, end: stopAt, signal: ctrl.signal, onProgress: (p, t) => setProgress({ p, t }) })
      .then(({ blob, ext }) => {
        const name = clipFileName(movie.displayTitle, start.sec, stopAt, ext, formatTime)
        const file = new File([blob], name, { type: blob.type })
        setResult({ url: URL.createObjectURL(blob), file })
        setPhase('done')
      })
      .catch((e) => {
        setPhase('setup')
        if (leftPage.current) setError('ההקלטה נעצרה כי יצאתם מהדף. נסו שוב והשאירו את המסך פתוח עד הסוף.')
        else if (e?.name !== 'AbortError') setError(e?.message || 'הגזירה נכשלה')
        leftPage.current = false
      })
  }

  const save = () => {
    const a = document.createElement('a')
    a.href = result.url
    a.download = result.file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  const canShare = result && navigator.canShare?.({ files: [result.file] })
  const share = () => navigator.share({ files: [result.file], title: movie.displayTitle }).catch(() => {})

  return (
    <div className="space-y-3 border-b border-line bg-surface px-3 py-3" data-moment-composer
      onKeyDown={(e) => { if (e.key === 'Escape' && phase !== 'recording') { e.preventDefault(); e.stopPropagation(); close() } }}>
      <div className="flex items-center gap-2">
        <Scissors className="size-4 text-amber-500" aria-hidden />
        <h3 className="flex-1 font-semibold">גזירת קטע</h3>
        <button type="button" onClick={close} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label="סגור"><X className="size-4" aria-hidden /></button>
      </div>

      {phase === 'setup' && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <TimeInput label="מ-" digits={startD} onDigits={(d) => { setStartD(d); setError(null) }} invalid={!!error && error.startsWith('התחלה')} />
            <NowButton onClick={() => setStartD(toDigits(now()))} label="התחלה = הזמן הנוכחי בנגן" />
            <TimeInput label="עד" digits={endD} onDigits={(d) => { setEndD(d); setError(null) }} invalid={!!error && error.startsWith('סיום')} />
            <NowButton onClick={() => setEndD(toDigits(now()))} label="סיום = הזמן הנוכחי בנגן" />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-rose-500">{error}</p>
          ) : length > 0 ? (
            <p className="text-sm">אורך הקטע: <span dir="ltr" className="font-semibold tabular-nums">{formatTime(length)}</span></p>
          ) : null}

          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-relaxed">
            <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-accent-ink"><Info className="size-4" aria-hidden /> חשוב לדעת לפני שמתחילים</p>
            <ul className="list-disc space-y-1 ps-5 text-ink">
              <li>
                <b>ההכנה לוקחת בדיוק את אורך הקטע.</b> האתר לא יכול לחתוך את הקובץ המקורי (הוא גדול מדי לטלפון), ולכן הוא מנגן את הקטע מההתחלה ועד הסוף ומקליט אותו תוך כדי.
                {length > 0 && length <= MAX_CLIP_SECONDS && <> הקטע שבחרתם ייקח כ-<span dir="ltr" className="font-semibold tabular-nums">{formatTime(length)}</span> (דקות:שניות) להכנה.</>}
              </li>
              <li><b>השאירו את הדף פתוח והמסך דולק</b> עד הסוף: אל תעברו לאפליקציה אחרת, אל תנעלו את הטלפון ואל תסגרו את החלון — אחרת ההקלטה תיפסק.</li>
              <li>הסרטון יתנגן בזמן ההכנה, כולל הקול.</li>
              <li>האיכות קרובה למקור אבל לא זהה (התמונה מקודדת מחדש).</li>
              <li>אורך מרבי לקטע: 15 דקות.</li>
            </ul>
          </div>
          <button type="button" onClick={begin} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-stone-950 ring-1 ring-black/10 hover:bg-amber-400 dark:ring-0">
            <Scissors className="size-4" aria-hidden /> יצירת הקטע
          </button>
        </>
      )}

      {phase === 'recording' && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin text-amber-500" aria-hidden />
            <span className="flex-1">מכין את הקטע… נותרו כ-<span dir="ltr" className="font-semibold tabular-nums">{formatTime(Math.max(0, (length || 0) * (1 - progress.p)))}</span></span>
            <span className="tabular-nums text-muted">{Math.round(progress.p * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-amber-500 transition-[width] duration-500" style={{ width: `${progress.p * 100}%` }} />
          </div>
          <p className="text-sm font-medium text-accent-ink">השאירו את הדף פתוח והמסך דולק עד הסוף — מעבר לאפליקציה אחרת או נעילת המסך יעצרו את ההקלטה.</p>
          <button type="button" onClick={() => abortRef.current?.abort()} className="h-10 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">ביטול</button>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-3">
          <video src={result.url} controls playsInline className="aspect-video w-full rounded-xl bg-black" />
          <p className="truncate text-sm text-muted"><bdi>{result.file.name}</bdi> · <span dir="ltr">{(result.file.size / 1048576).toFixed(1)} MB</span></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 ring-1 ring-black/10 hover:bg-amber-400 dark:ring-0">
              <Download className="size-4" aria-hidden /> שמירה במכשיר
            </button>
            {canShare && (
              <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-semibold hover:bg-line">
                <Share2 className="size-4" aria-hidden /> שיתוף / שמירה לתמונות
              </button>
            )}
            <button type="button" onClick={() => { URL.revokeObjectURL(result.url); setResult(null); setPhase('setup') }} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2">
              קטע חדש
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
