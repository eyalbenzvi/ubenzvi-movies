import { useCallback, useMemo } from 'react'
import { isStringArray, isStringMap, isTagMap, useLocalStorage } from '../lib/storage.js'
import { movies } from '../data/movies.js'

export const DEFAULT_TAGS = ['ילדות', 'משפחה', 'בר מצווה', 'טיול', 'מצחיק', 'צבא', 'מופעים וטקסים', 'קהילה']
const EXPORT_VERSION = 1
const MAX_RECENT = 24
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

// Imported keys must be real ids from the catalog (rejects __proto__, constructor and junk)
const MOVIE_IDS = new Set(movies.map((m) => m.id))
const DOC_IDS = new Set(movies.map((m) => m.docId).filter(Boolean))
const ID_RE = { test: (k) => MOVIE_IDS.has(k) }
const DOC_ID_RE = { test: (k) => DOC_IDS.has(k) }
const isRecentList = (v) => Array.isArray(v) && v.every((x) => x && typeof x.id === 'string' && typeof x.at === 'number')

const cleanTag = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)

/**
 * All user-generated data, persisted in localStorage:
 *   tagsByMovie : { [movieId]: string[] }
 *   tagLibrary  : string[]                 (known tags, incl. ones not assigned yet)
 *   notes       : { [movieId]: string }
 *   docText     : { [docId]: string }      (user-pasted "מה בקלטת" contents for deep search)
 *   favorites   : string[]                 (movie ids)
 */
export function useArchiveStore() {
  const [tagsByMovie, setTagsByMovie] = useLocalStorage('tags', {}, isTagMap)
  const [tagLibrary, setTagLibrary] = useLocalStorage('tagLibrary', DEFAULT_TAGS, isStringArray)
  const [notes, setNotes] = useLocalStorage('notes', {}, isStringMap)
  const [docText, setDocText] = useLocalStorage('docText', {}, isStringMap)
  const [favorites, setFavorites] = useLocalStorage('favorites', [], isStringArray)
  const [recent, setRecent] = useLocalStorage('recent', [], isRecentList)

  /** Remember a movie as recently watched (most recent first). */
  const markViewed = useCallback((movieId) => {
    setRecent((prev) => {
      if (prev[0]?.id === movieId) return prev
      return [{ id: movieId, at: Date.now() }, ...prev.filter((r) => r.id !== movieId)].slice(0, MAX_RECENT)
    })
  }, [setRecent])

  /** Every tag known to the app with its usage count, sorted by usage then name. */
  const allTags = useMemo(() => {
    const counts = new Map(tagLibrary.map((t) => [t, 0]))
    for (const list of Object.values(tagsByMovie)) for (const t of list) counts.set(t, (counts.get(t) || 0) + 1)
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'he'))
  }, [tagLibrary, tagsByMovie])

  const ensureInLibrary = useCallback(
    (tag) => setTagLibrary((lib) => (lib.includes(tag) ? lib : [...lib, tag])),
    [setTagLibrary],
  )

  const addTag = useCallback((movieId, rawTag) => {
    const tag = cleanTag(rawTag)
    if (!tag) return
    ensureInLibrary(tag)
    setTagsByMovie((prev) => {
      const cur = prev[movieId] || []
      if (cur.includes(tag)) return prev
      return { ...prev, [movieId]: [...cur, tag] }
    })
  }, [ensureInLibrary, setTagsByMovie])

  const removeTag = useCallback((movieId, tag) => {
    setTagsByMovie((prev) => {
      const next = (prev[movieId] || []).filter((t) => t !== tag)
      const copy = { ...prev }
      if (next.length) copy[movieId] = next
      else delete copy[movieId]
      return copy
    })
  }, [setTagsByMovie])

  const createTag = useCallback((rawTag) => {
    const tag = cleanTag(rawTag)
    if (tag) ensureInLibrary(tag)
    return tag
  }, [ensureInLibrary])

  /** Rename a tag everywhere (merges into an existing tag if the new name exists). */
  const renameTag = useCallback((oldName, rawNew) => {
    const newName = cleanTag(rawNew)
    if (!newName || newName === oldName) return
    setTagLibrary((lib) => [...new Set(lib.map((t) => (t === oldName ? newName : t)))])
    setTagsByMovie((prev) => {
      const out = {}
      for (const [id, list] of Object.entries(prev)) out[id] = [...new Set(list.map((t) => (t === oldName ? newName : t)))]
      return out
    })
  }, [setTagLibrary, setTagsByMovie])

  /** Delete a tag from the library and from every movie. */
  const deleteTag = useCallback((name) => {
    setTagLibrary((lib) => lib.filter((t) => t !== name))
    setTagsByMovie((prev) => {
      const out = {}
      for (const [id, list] of Object.entries(prev)) {
        const next = list.filter((t) => t !== name)
        if (next.length) out[id] = next
      }
      return out
    })
  }, [setTagLibrary, setTagsByMovie])

  const setNote = useCallback((movieId, rawText) => {
    const text = String(rawText ?? '').slice(0, 10_000)
    setNotes((prev) => {
      const copy = { ...prev }
      if (text?.trim()) copy[movieId] = text
      else delete copy[movieId]
      return copy
    })
  }, [setNotes])

  const setDocContent = useCallback((docId, rawText) => {
    const text = String(rawText ?? '').slice(0, 200_000)
    setDocText((prev) => {
      const copy = { ...prev }
      if (text?.trim()) copy[docId] = text
      else delete copy[docId]
      return copy
    })
  }, [setDocText])

  const toggleFavorite = useCallback((movieId) => {
    setFavorites((prev) => (prev.includes(movieId) ? prev.filter((x) => x !== movieId) : [...prev, movieId]))
  }, [setFavorites])

  const exportData = useCallback(() => ({
    app: 'uri-movie-catalog',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tagLibrary,
    tagsByMovie,
    notes,
    docText,
    favorites,
  }), [tagLibrary, tagsByMovie, notes, docText, favorites])

  /**
   * Import a backup. mode 'merge' unions tags/favorites and overwrites notes/docText per key;
   * mode 'replace' discards current data first. Throws on invalid files.
   */
  const importData = useCallback((data, mode = 'merge') => {
    if (!isPlainObject(data) || data.app !== 'uri-movie-catalog') {
      throw new Error('זה לא קובץ גיבוי של האתר הזה')
    }
    const inTags = isPlainObject(data.tagsByMovie) ? sanitizeTagMap(data.tagsByMovie) : {}
    const inLib = Array.isArray(data.tagLibrary) ? data.tagLibrary.slice(0, 500).map(cleanTag).filter(Boolean) : []
    const inNotes = isPlainObject(data.notes) ? stringMap(data.notes, ID_RE, 10_000) : {}
    const inDoc = isPlainObject(data.docText) ? stringMap(data.docText, DOC_ID_RE, 200_000) : {}
    const inFav = Array.isArray(data.favorites) ? data.favorites.filter((x) => typeof x === 'string' && ID_RE.test(x)).slice(0, 1000) : []
    const libFromTags = Object.values(inTags).flat()
    const counts = {
      movies: Object.keys(inTags).length,
      tags: new Set([...inLib, ...libFromTags]).size,
      notes: Object.keys(inNotes).length,
      favorites: inFav.length,
    }
    if (mode === 'replace' && !counts.tags && !counts.notes && !counts.favorites && !Object.keys(inDoc).length) {
      throw new Error('קובץ הגיבוי ריק — לא בוצע שינוי')
    }

    if (mode === 'replace') {
      setTagsByMovie(inTags)
      setTagLibrary([...new Set([...inLib, ...libFromTags])])
      setNotes(inNotes)
      setDocText(inDoc)
      setFavorites(inFav)
    } else {
      setTagsByMovie((prev) => {
        const out = { ...prev }
        for (const [id, list] of Object.entries(inTags)) out[id] = [...new Set([...(out[id] || []), ...list])]
        return out
      })
      setTagLibrary((prev) => [...new Set([...prev, ...inLib, ...libFromTags])])
      setNotes((prev) => ({ ...prev, ...inNotes }))
      setDocText((prev) => ({ ...prev, ...inDoc }))
      setFavorites((prev) => [...new Set([...prev, ...inFav])])
    }
    return counts
  }, [setTagsByMovie, setTagLibrary, setNotes, setDocText, setFavorites])

  return {
    tagsByMovie, allTags, notes, docText, favorites, recent, markViewed,
    addTag, removeTag, createTag, renameTag, deleteTag,
    setNote, setDocContent, toggleFavorite,
    exportData, importData,
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
/** Only own keys matching `keyRe` (rejects __proto__, constructor, junk). */
function safeEntries(obj, keyRe) {
  return Object.keys(obj).filter((k) => keyRe.test(k)).map((k) => [k, obj[k]])
}
function stringMap(obj, keyRe, maxLen) {
  return Object.fromEntries(
    safeEntries(obj, keyRe).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v.slice(0, maxLen)]),
  )
}
function sanitizeTagMap(obj) {
  const out = {}
  for (const [id, list] of safeEntries(obj, ID_RE)) {
    if (!Array.isArray(list)) continue
    const tags = [...new Set(list.slice(0, 100).map(cleanTag).filter(Boolean))]
    if (tags.length) out[id] = tags
  }
  return out
}
