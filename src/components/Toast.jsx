import { useEffect, useState } from 'react'

const EXIT_MS = 180

/**
 * Small transient message at the bottom of the screen.
 * Enters and leaves through the same edge (spatial consistency); the exit is faster than the entry.
 * Interruptible transitions (@starting-style), not keyframes, so a new message retargets smoothly.
 */
export default function Toast({ message, onDone, duration = 4000 }) {
  const [shown, setShown] = useState(message)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (message) { setShown(message); setLeaving(false) }
  }, [message])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setLeaving(true), duration)
    return () => clearTimeout(t)
  }, [message, duration])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => { setShown(null); setLeaving(false); onDone() }, EXIT_MS)
    return () => clearTimeout(t)
  }, [leaving, onDone])

  if (!shown) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div
        role="status"
        className={`pointer-events-auto rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10 transition-[opacity,translate] ease-[var(--ease-out)] starting:translate-y-2 starting:opacity-0 motion-reduce:translate-y-0 dark:bg-stone-100 dark:text-stone-900 ${
          leaving ? 'translate-y-2 opacity-0 duration-[180ms]' : 'duration-200'
        }`}
      >
        {shown}
      </div>
    </div>
  )
}
