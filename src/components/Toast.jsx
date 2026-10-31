import { useEffect } from 'react'

/** Small transient message at the bottom of the screen. */
export default function Toast({ message, onDone, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [message, onDone, duration])
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div role="status" className="pointer-events-auto animate-pop-in rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10 dark:bg-stone-100 dark:text-stone-900">
        {message}
      </div>
    </div>
  )
}
