/**
 * Cut a segment of a <video> into a new file, entirely in the browser.
 *
 * The source files are 1–2.5 GB, far too big to load into a phone's memory, so instead of
 * re-muxing the file we PLAY the segment and record it: frames are drawn to a canvas
 * (canvas.captureStream — works on iPhone too, unlike video.captureStream) and the sound is
 * taken through Web Audio. Recording runs in real time and re-encodes the picture.
 * Requires a same-origin video (our own player via the service worker), otherwise the
 * canvas would be "tainted" and could not be recorded.
 */

export const MAX_CLIP_SECONDS = 15 * 60

const CANDIDATES = [
  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
  ['video/mp4;codecs=avc1,mp4a', 'mp4'],
  ['video/mp4', 'mp4'],
  ['video/webm;codecs=vp9,opus', 'webm'],
  ['video/webm;codecs=vp8,opus', 'webm'],
  ['video/webm', 'webm'],
]

export function clipSupported() {
  return typeof window !== 'undefined' && 'MediaRecorder' in window && !!HTMLCanvasElement.prototype.captureStream
}

function pickFormat() {
  for (const [mime, ext] of CANDIDATES) if (MediaRecorder.isTypeSupported?.(mime)) return { mime, ext }
  return { mime: '', ext: 'webm' }
}

// One MediaElementSource per <video> for its whole life (creating a second one throws)
const audioGraph = new WeakMap()
function audioFor(video) {
  let g = audioGraph.get(video)
  if (!g) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const source = ctx.createMediaElementSource(video)
    source.connect(ctx.destination) // keep hearing the video normally
    g = { ctx, source }
    audioGraph.set(video, g)
  }
  return g
}

/**
 * @returns {Promise<{ blob: Blob, ext: string, mime: string }>}
 */
export function recordClip(video, { start, end, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    if (!clipSupported()) return reject(new Error('הדפדפן הזה לא תומך בגזירת קטעים'))
    if (!(end > start)) return reject(new Error('זמן הסיום צריך להיות אחרי זמן ההתחלה'))
    if (end - start > MAX_CLIP_SECONDS) return reject(new Error('הקטע ארוך מדי (עד 15 דקות)'))

    // Audio context must be created/resumed inside the user's tap (iPhone)
    let graph = null
    try { graph = audioFor(video); graph?.ctx.resume?.() } catch { graph = null }

    const w = Math.min(video.videoWidth || 720, 1280)
    const h = Math.round(w * ((video.videoHeight || 576) / (video.videoWidth || 720)))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const g2d = canvas.getContext('2d')
    const stream = canvas.captureStream(30)
    let audioDest = null
    if (graph) {
      audioDest = graph.ctx.createMediaStreamDestination()
      graph.source.connect(audioDest)
      for (const t of audioDest.stream.getAudioTracks()) stream.addTrack(t)
    }

    const { mime, ext } = pickFormat()
    let recorder
    try {
      recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_500_000, audioBitsPerSecond: 128_000 })
    } catch (e) {
      return reject(new Error('לא ניתן להתחיל הקלטה בדפדפן הזה'))
    }
    const chunks = []
    let stopped = false
    let raf = 0

    const cleanup = () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('timeupdate', onTime)
      signal?.removeEventListener('abort', onAbort)
      try { if (audioDest) graph.source.disconnect(audioDest) } catch { /* already */ }
      stream.getTracks().forEach((t) => t.stop())
      video.pause()
    }
    const stop = () => {
      if (stopped) return
      stopped = true
      if (recorder.state !== 'inactive') recorder.stop()
      else { cleanup(); reject(new Error('ההקלטה נעצרה')) }
    }
    const onAbort = () => { aborted = true; stop() }
    let aborted = false

    const draw = () => {
      if (stopped) return
      g2d.drawImage(video, 0, 0, w, h)
      raf = requestAnimationFrame(draw)
    }
    const onTime = () => {
      const p = (video.currentTime - start) / (end - start)
      onProgress?.(Math.max(0, Math.min(1, p)), video.currentTime)
      if (video.currentTime >= end || video.ended) stop()
    }

    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
    recorder.onstop = () => {
      cleanup()
      if (aborted) return reject(new DOMException('cancelled', 'AbortError'))
      const blob = new Blob(chunks, { type: (recorder.mimeType || mime || 'video/webm').split(';')[0] })
      if (!blob.size) return reject(new Error('ההקלטה יצאה ריקה'))
      resolve({ blob, ext, mime: blob.type })
    }
    recorder.onerror = () => { aborted = false; stop() }
    signal?.addEventListener('abort', onAbort)

    // Seek, start playing inside the tap (iPhone), then record once the segment really plays
    video.pause()
    video.currentTime = start
    const playing = video.play()
    Promise.resolve(playing)
      .then(() => new Promise((ok) => (video.seeking ? video.addEventListener('seeked', ok, { once: true }) : ok())))
      .then(() => {
        if (stopped) return
        draw()
        recorder.start(1000)
        video.addEventListener('timeupdate', onTime)
      })
      .catch(() => { stopped = true; cleanup(); reject(new Error('לא ניתן לנגן את הסרטון להקלטה')) })
  })
}

/** "טיול לאיטליה · 12:00–14:30.mp4" (characters that file systems reject are replaced). */
export function clipFileName(title, start, end, ext, fmt) {
  const clean = String(title).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  return `${clean} · ${fmt(start).replace(/:/g, '.')}-${fmt(end).replace(/:/g, '.')}.${ext}`
}
