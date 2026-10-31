import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])'
let openCount = 0

/**
 * Accessible overlay shell used by every dialog.
 * - Phone: bottom sheet (optionally full height) with a grab handle; drag anything marked
 *   `data-sheet-drag` (or the handle) down to close.
 * - ≥ sm: centered dialog.
 * - Focus is trapped inside, the app behind is `inert`, body scroll is locked,
 *   Esc closes, and focus returns to the opener on close.
 */
export default function Sheet({ onClose, labelledBy, children, full = false, maxWidth = 'sm:max-w-2xl', className = '' }) {
  const panelRef = useRef(null)
  const [dragY, setDragY] = useState(0)
  const drag = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    const root = document.getElementById('root')
    openCount++
    if (root) root.inert = true
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      openCount--
      if (openCount === 0) {
        if (root) root.inert = false
        document.body.style.overflow = prevOverflow
      }
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // --- swipe down to close (touch / pen only) ---
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' || !e.target.closest('[data-sheet-drag]')) return
    if (e.target.closest('button,a,input,select,textarea')) return
    drag.current = { y: e.clientY, id: e.pointerId }
  }
  const onPointerMove = (e) => {
    if (!drag.current || drag.current.id !== e.pointerId) return
    setDragY(Math.max(0, e.clientY - drag.current.y))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    if (dragY > 110) onClose()
    else setDragY(0)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-stone-950/55 backdrop-blur-sm dark:bg-black/70" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        className={`relative flex w-full animate-sheet-up flex-col overflow-hidden border-line bg-surface shadow-2xl outline-none transition-transform duration-300 sm:animate-pop-in sm:rounded-3xl sm:border ${
          full ? 'h-dvh max-sm:rounded-none sm:h-auto sm:max-h-[94dvh]' : 'max-h-[92dvh] rounded-t-3xl border-t'
        } ${maxWidth} ${className}`}
      >
        {!full && (
          <div data-sheet-drag className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5 sm:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-line-strong/50" />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
