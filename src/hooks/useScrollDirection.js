import { useEffect, useState } from 'react'

/** true while the user scrolls down past `threshold` (used to tuck the header away on phones). */
export function useHideOnScroll(threshold = 140) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > threshold)
          last = y
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return hidden
}
