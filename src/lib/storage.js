import { useCallback, useEffect, useRef, useState } from 'react'

const PREFIX = 'umc:'

/** Fired on window when a write fails (quota exceeded / storage disabled). */
export const STORAGE_ERROR_EVENT = 'umc:storage-error'

export function readStorage(key, fallback, validate) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    const value = JSON.parse(raw)
    return !validate || validate(value) ? value : fallback
  } catch {
    return fallback
  }
}

/** Returns false when the value could not be persisted. */
export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: { key } }))
    return false
  }
}

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
export const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')
export const isStringMap = (v) => isPlainObject(v) && Object.values(v).every((x) => typeof x === 'string')
export const isTagMap = (v) => isPlainObject(v) && Object.values(v).every(isStringArray)

/**
 * useState that persists to localStorage and syncs across browser tabs.
 * `validate` guards against malformed / foreign data (falls back to `initial`).
 */
export function useLocalStorage(key, initial, validate) {
  const [value, setValue] = useState(() => readStorage(key, initial, validate))
  const skipWrite = useRef(true)
  const validateRef = useRef(validate)
  const initialRef = useRef(initial)

  useEffect(() => {
    if (skipWrite.current) { skipWrite.current = false; return }
    writeStorage(key, value)
  }, [key, value])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === PREFIX + key) setValue(readStorage(key, initialRef.current, validateRef.current))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const set = useCallback((v) => setValue(v), [])
  return [value, set]
}
