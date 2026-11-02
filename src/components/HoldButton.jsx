import { useEffect, useRef, useState } from 'react'

/**
 * Hold-to-confirm for destructive actions (emil-design-eng): pressing fills the button slowly and
 * linearly (deliberate), releasing early snaps back fast (200ms ease-out). Pointer and keyboard
 * (hold Enter/Space). The fill is a clip-path reveal of a duplicate label, so contrast holds.
 */
export default function HoldButton({ onConfirm, children, holdMs = 1200, className = '', ariaLabel }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)

  const start = () => {
    if (timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => { timer.current = null; setHolding(false); onConfirm() }, holdMs)
  }
  const cancel = () => {
    clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); start() }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start() } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') cancel() }}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative select-none overflow-hidden rounded-2xl border border-rose-600/60 font-semibold text-rose-700 [-webkit-touch-callout:none] dark:text-rose-400 ${className}`}
    >
      <span className="relative">{children}</span>
      {/* RTL: the fill grows from the right (start) edge */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-rose-600 text-white"
        style={{
          clipPath: holding ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)',
          transition: holding ? `clip-path ${holdMs}ms linear` : 'clip-path 200ms var(--ease-out)',
        }}
      >
        {children}
      </span>
    </button>
  )
}
