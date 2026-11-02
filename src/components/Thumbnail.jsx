import { useState } from 'react'
import { Film, Music, VideoOff } from 'lucide-react'

// Flat tape-label tones (taste-skill: no gradients); the VHS stripe below is the archive's own mark
const TONES = ['bg-[#3a2e1f]', 'bg-[#3b2326]', 'bg-[#2f3324]', 'bg-[#3a2a1c]', 'bg-[#2b2a28]', 'bg-[#1f3030]']

/**
 * Drive thumbnail with skeleton → fade-in, and a warm "VHS label" fallback when Drive refuses it.
 * Drive thumbnails often carry a baked-in letterbox, so the image is slightly zoomed (cropping it)
 * over a blurred copy of itself.
 */
export default function Thumbnail({ movie, className = '', iconClass = 'size-8', label = false }) {
  const [state, setState] = useState(movie.thumbnailUrl ? 'loading' : 'failed')
  const tone = TONES[movie.index % TONES.length]
  const Icon = !movie.movieUrl ? VideoOff : movie.type === 'audio' ? Music : Film

  return (
    <div className={`relative overflow-hidden bg-stone-900 ${className}`}>
      {state !== 'loaded' && (
        <div className={`absolute inset-0 ${tone}`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
            <Icon className={`${iconClass} text-amber-100/80`} strokeWidth={1.5} aria-hidden />
            {label && <span className="line-clamp-2 font-display text-sm text-amber-50/90">{movie.displayTitle}</span>}
          </div>
          {state === 'loading' && <div className="skeleton absolute inset-0" aria-hidden />}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-[repeating-linear-gradient(90deg,#f2c14e_0_14px,#be123c_14px_28px,#0f766e_28px_42px)] opacity-70" />
        </div>
      )}
      {movie.thumbnailUrl && state !== 'failed' && (
        <>
          <img
            src={movie.thumbnailUrl}
            alt=""
            aria-hidden
            className={`absolute inset-0 size-full scale-125 object-cover blur-xl transition-opacity duration-300 ease-[var(--ease-out)] ${state === 'loaded' ? 'opacity-50' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
          />
          <img
            src={movie.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setState('failed')}
            onLoad={(e) => setState(e.currentTarget.naturalWidth < 20 ? 'failed' : 'loaded')}
            className={`absolute inset-0 size-full scale-[1.12] object-cover transition-[opacity,scale] duration-300 ease-[var(--ease-out)] can-hover:group-hover:scale-[1.15] ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}
    </div>
  )
}
