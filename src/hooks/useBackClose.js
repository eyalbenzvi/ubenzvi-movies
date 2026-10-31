import { useCallback, useEffect, useRef } from 'react'

/**
 * Lets the phone's Back button / gesture close an overlay (sheet, dialog) instead of leaving the page.
 * Pushes a history entry with the SAME url & router state when mounted; Back pops it → onClose().
 * Returns `close()`, which should be used for every in-app close (it pops the entry first).
 */
export function useBackClose(onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const pushed = useRef(false)

  useEffect(() => {
    window.history.pushState(window.history.state, '')
    pushed.current = true
    const onPop = () => {
      if (!pushed.current) return
      pushed.current = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return useCallback(() => {
    if (pushed.current) window.history.back() // popstate → onClose
    else onCloseRef.current()
  }, [])
}
