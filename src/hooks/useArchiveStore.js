import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '../lib/storage.js'

export const DEFAULT_TAGS = ['ילדות', 'משפחה', 'בר מצווה', 'טיול', 'מצחיק', 'צבא', 'מופעים וטקסים', 'קהילה']
const EXPORT_VERSION = 1

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
  const [tagsByMovie, setTagsByMovie] = useLocalStorage('tags', {})
  const [tagLibrary, setTagLibrary] = useLocalStorage('tagLibrary', DEFAULT_TAGS)
  const [notes, setNotes] = useLocalStorage('notes', {})
  const [docText, setDocText] = useLocalStorage('docText', {})
  const [favorites, setFavorites] = useLocalStorage('favorites', [])

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

  const setNote = useCallback((movieId, text) => {
    setNotes((prev) => {
      const copy = { ...prev }
      if (text?.trim()) copy[movieId] = text
      else delete copy[movieId]
      return copy
    })
  }, [setNotes])

  const setDocContent = useCallback((docId, text) => {
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
    if (!data || typeof data !== 'object' || (data.app && data.app !== 'uri-movie-catalog')) {
      throw new Error('קובץ הגיבוי אינו תקין')
    }
    const inTags = isPlainObject(data.tagsByMovie) ? sanitizeTagMap(data.tagsByMovie) : {}
    const inLib = Array.isArray(data.tagLibrary) ? data.tagLibrary.map(cleanTag).filter(Boolean) : []
    const inNotes = isPlainObject(data.notes) ? stringMap(data.notes) : {}
    const inDoc = isPlainObject(data.docText) ? stringMap(data.docText) : {}
    const inFav = Array.isArray(data.favorites) ? data.favorites.filter((x) => typeof x === 'string') : []
    const libFromTags = Object.values(inTags).flat()

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
    return { movies: Object.keys(inTags).length, tags: new Set([...inLib, ...libFromTags]).size }
  }, [setTagsByMovie, setTagLibrary, setNotes, setDocText, setFavorites])

  return {
    tagsByMovie, allTags, notes, docText, favorites,
    addTag, removeTag, createTag, renameTag, deleteTag,
    setNote, setDocContent, toggleFavorite,
    exportData, importData,
  }
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}
function stringMap(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v === 'string'))
}
function sanitizeTagMap(obj) {
  const out = {}
  for (const [id, list] of Object.entries(obj)) {
    if (!Array.isArray(list)) continue
    const tags = [...new Set(list.map(cleanTag).filter(Boolean))]
    if (tags.length) out[id] = tags
  }
  return out
}
