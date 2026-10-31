import { useState } from 'react'
import { Film, Music, VideoOff } from 'lucide-react'

const GRADIENTS = [
  'from-amber-700 via-orange-900 to-stone-950',
  'from-rose-800 via-red-950 to-stone-950',
  'from-yellow-700 via-amber-900 to-stone-950',
  'from-orange-700 via-rose-950 to-stone-950',
  'from-stone-600 via-stone-800 to-stone-950',
  'from-teal-800 via-emerald-950 to-stone-950',
]

/**
 * Drive thumbnail with a graceful fallback: Drive only serves thumbnails for files that are
 * publicly viewable, so when the image fails we show a warm "VHS label" placeholder instead.
 */
export default function Thumbnail({ movie, className = '' }) {
  const [failed, setFailed] = useState(false)
  const gradient = GRADIENTS[movie.index % GRADIENTS.length]
  const Icon = !movie.movieUrl ? VideoOff : movie.type === 'audio' ? Music : Film

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      {/* fallback art (always rendered underneath) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
        <Icon className="size-8 text-amber-200/70" strokeWidth={1.5} aria-hidden />
        {movie.year && (
          <span className="font-display text-2xl font-bold tracking-wider text-amber-100/80">{movie.year}</span>
        )}
      </div>
      {/* VHS stripes */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-[repeating-linear-gradient(90deg,#f59e0b_0_14px,#be123c_14px_28px,#0f766e_28px_42px)] opacity-60" />
      {movie.thumbnailUrl && !failed && (
        <img
          src={movie.thumbnailUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={(e) => { if (e.currentTarget.naturalWidth < 20) setFailed(true) }}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
    </div>
  )
}
