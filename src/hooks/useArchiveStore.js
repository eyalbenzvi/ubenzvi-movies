import { useCallback, useMemo } from 'react'
import { isStringArray, isStringMap, isTagMap, useLocalStorage } from '../lib/storage.js'
import { movies } from '../data/movies.js'

export const DEFAULT_TAGS = ['ילדות', 'משפחה', 'בר מצווה', 'טיול', 'מצחיק', 'צבא', 'מופעים וטקסים', 'קהילה']
const EXPORT_VERSION = 1
const MAX_RECENT = 24
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

// Imported keys must be real ids from the catalog (rejects __proto__, constructor and junk)
const MOVIE_IDS = new Set(movies.map((m) => m.id))
const MOVIE_TITLES = new Map(movies.map((m) => [m.id, m.displayTitle]))
const DOC_IDS = new Set(movies.map((m) => m.docId).filter(Boolean))
const ID_RE = { test: (k) => MOVIE_IDS.has(k) }
const DOC_ID_RE = { test: (k) => DOC_IDS.has(k) }
const isMomentMap = (v) =>
  isPlainObject(v) && Object.values(v).every((list) => Array.isArray(list) && list.every((x) => x && typeof x.tag === 'string' && Number.isFinite(x.t)))
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
  /** Timestamped tags: { [movieId]: [{ tag, t }] } — t in seconds from the start of the video */
  const [moments, setMoments] = useLocalStorage('moments', {}, isMomentMap)

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

  const addTag = useCallback((movieId, rawTag, t = null) => {
    const tag = cleanTag(rawTag)
    if (!tag) return
    ensureInLibrary(tag)
    setTagsByMovie((prev) => {
      const cur = prev[movieId] || []
      if (cur.includes(tag)) return prev
      return { ...prev, [movieId]: [...cur, tag] }
    })
    if (Number.isFinite(t) && t >= 0) {
      const sec = Math.floor(t)
      setMoments((prev) => {
        const cur = prev[movieId] || []
        if (cur.some((m) => m.tag === tag && m.t === sec)) return prev
        return { ...prev, [movieId]: [...cur, { tag, t: sec }].sort((a, b) => a.t - b.t) }
      })
    }
  }, [ensureInLibrary, setTagsByMovie, setMoments])

  /** Remove one time from a tag (the tag itself stays). */
  const removeMoment = useCallback((movieId, tag, t) => {
    setMoments((prev) => {
      const next = (prev[movieId] || []).filter((m) => !(m.tag === tag && m.t === t))
      const copy = { ...prev }
      if (next.length) copy[movieId] = next
      else delete copy[movieId]
      return copy
    })
  }, [setMoments])

  /**
   * Change one moment (time and/or label). If the label changed and no other moment of this
   * movie still uses the old label, the old tag is dropped from the movie too (typo fixes).
   */
  const updateMoment = useCallback((movieId, from, to) => {
    const label = cleanTag(to.tag)
    if (!label || !Number.isFinite(to.t)) return
    const sec = Math.floor(to.t)
    const others = (moments[movieId] || []).filter((m) => !(m.tag === from.tag && m.t === from.t))
    const dropOld = label !== from.tag && !others.some((m) => m.tag === from.tag)
    setMoments((prev) => {
      const rest = (prev[movieId] || []).filter((m) => !(m.tag === from.tag && m.t === from.t))
      const next = rest.some((m) => m.tag === label && m.t === sec) ? rest : [...rest, { tag: label, t: sec }]
      return { ...prev, [movieId]: next.sort((a, b) => a.t - b.t) }
    })
    ensureInLibrary(label)
    setTagsByMovie((prev) => {
      let cur = prev[movieId] || []
      if (dropOld) cur = cur.filter((t) => t !== from.tag)
      if (!cur.includes(label)) cur = [...cur, label]
      return { ...prev, [movieId]: cur }
    })
  }, [moments, setMoments, setTagsByMovie, ensureInLibrary])

  /** Apply fn(list) → list to every movie's moments, dropping empty lists. */
  const mapMoments = useCallback((fn) => {
    setMoments((prev) => {
      const out = {}
      for (const [id, list] of Object.entries(prev)) {
        const next = fn(list)
        if (next.length) out[id] = next
      }
      return out
    })
  }, [setMoments])

  const removeTag = useCallback((movieId, tag) => {
    setMoments((prev) => {
      if (!prev[movieId]) return prev
      const next = prev[movieId].filter((m) => m.tag !== tag)
      const copy = { ...prev }
      if (next.length) copy[movieId] = next
      else delete copy[movieId]
      return copy
    })
    setTagsByMovie((prev) => {
      const next = (prev[movieId] || []).filter((t) => t !== tag)
      const copy = { ...prev }
      if (next.length) copy[movieId] = next
      else delete copy[movieId]
      return copy
    })
  }, [setTagsByMovie, setMoments])

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
    mapMoments((list) => list.map((m) => (m.tag === oldName ? { ...m, tag: newName } : m)))
  }, [setTagLibrary, setTagsByMovie, mapMoments])

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
    mapMoments((list) => list.filter((m) => m.tag !== name))
  }, [setTagLibrary, setTagsByMovie, mapMoments])

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
    // movieTitle is informational (makes the backup readable); import uses only tag + t
    moments: Object.fromEntries(Object.entries(moments).map(([id, list]) => [id, list.map((m) => ({ ...m, movieTitle: MOVIE_TITLES.get(id) || '' }))])),
  }), [tagLibrary, tagsByMovie, notes, docText, favorites, moments])

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
    const inMoments = isPlainObject(data.moments) ? sanitizeMoments(data.moments) : {}
    for (const [id, list] of Object.entries(inMoments)) inTags[id] = [...new Set([...(inTags[id] || []), ...list.map((m) => m.tag)])]
    const libFromTags = Object.values(inTags).flat()
    const counts = {
      movies: Object.keys(inTags).length,
      tags: new Set([...inLib, ...libFromTags]).size,
      notes: Object.keys(inNotes).length,
      favorites: inFav.length,
    }
    if (mode === 'replace' && !counts.tags && !counts.notes && !counts.favorites && !Object.keys(inDoc).length && !Object.keys(inMoments).length) {
      throw new Error('קובץ הגיבוי ריק — לא בוצע שינוי')
    }

    if (mode === 'replace') {
      setTagsByMovie(inTags)
      setTagLibrary([...new Set([...inLib, ...libFromTags])])
      setNotes(inNotes)
      setDocText(inDoc)
      setFavorites(inFav)
      setMoments(inMoments)
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
      setMoments((prev) => {
        const out = { ...prev }
        for (const [id, list] of Object.entries(inMoments)) {
          const merged = [...(out[id] || [])]
          for (const m of list) if (!merged.some((x) => x.tag === m.tag && x.t === m.t)) merged.push(m)
          out[id] = merged.sort((a, b) => a.t - b.t)
        }
        return out
      })
    }
    return counts
  }, [setTagsByMovie, setTagLibrary, setNotes, setDocText, setFavorites, setMoments])

  return {
    tagsByMovie, allTags, notes, docText, favorites, recent, markViewed, moments,
    addTag, removeTag, removeMoment, updateMoment, createTag, renameTag, deleteTag,
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
function sanitizeMoments(obj) {
  const out = {}
  for (const [id, list] of safeEntries(obj, ID_RE)) {
    if (!Array.isArray(list)) continue
    const clean = list
      .slice(0, 500)
      .filter((m) => m && typeof m.tag === 'string' && Number.isFinite(m.t) && m.t >= 0 && m.t <= 86400)
      .map((m) => ({ tag: cleanTag(m.tag), t: Math.floor(m.t) }))
      .filter((m) => m.tag)
    if (clean.length) out[id] = clean.sort((a, b) => a.t - b.t)
  }
  return out
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
