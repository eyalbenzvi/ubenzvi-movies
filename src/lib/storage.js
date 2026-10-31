import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'umc:'

export function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage full / disabled (private mode) — app keeps working in memory */
  }
}

/** useState that persists to localStorage and syncs across browser tabs. */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => readStorage(key, initial))

  useEffect(() => { writeStorage(key, value) }, [key, value])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === PREFIX + key) setValue(readStorage(key, initial))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const set = useCallback((v) => setValue(v), [])
  return [value, set]
}
