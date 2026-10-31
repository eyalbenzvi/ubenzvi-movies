import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'

import Header from './components/Header.jsx'
import FilterBar, { decadeLabel } from './components/FilterBar.jsx'
import MovieCard from './components/MovieCard.jsx'
import MovieListItem from './components/MovieListItem.jsx'
import VideoModal from './components/VideoModal.jsx'
import TagManager from './components/TagManager.jsx'
import Toast from './components/Toast.jsx'
import { Hero, Row } from './components/HomeRows.jsx'
import { movies, moviesById, stats } from './data/movies.js'
import { docIndex } from './data/docIndex.js'
import { buildIndex, parseQuery, search } from './lib/search.js'
import { useArchiveStore } from './hooks/useArchiveStore.js'
import { useTheme } from './hooks/useTheme.js'
import { STORAGE_ERROR_EVENT, useLocalStorage } from './lib/storage.js'

const EMPTY = []
const DOC_HEADER = /^\s*מה\s+בקלטת\s*[:?]?\s*$/gm
const collator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' })
const DEFAULT_FILTERS = { decade: null, year: null, tags: [], onlyDetails: false, onlyFavorites: false, type: 'all' }
const VIEWS = ['rows', 'grid', 'list']
const SORT_IDS = ['relevance', 'newest', 'oldest', 'az', 'za']

/** Natural catalog order: series name, then part number (so חלק שני comes before חלק שלישי). */
const byNatural = (a, b) => collator.compare(a.series, b.series) || (a.part ?? 0) - (b.part ?? 0) || collator.compare(a.title, b.title)
const naturalOrder = [...movies].sort(byNatural)
const naturalRank = new Map(naturalOrder.map((m, i) => [m.id, i]))

/** Multi-part recordings: series → parts in order (only series with 2+ files). */
const partsBySeries = (() => {
  const map = new Map()
  for (const m of naturalOrder) map.set(m.series, [...(map.get(m.series) || []), m])
  for (const [k, v] of map) if (v.length < 2) map.delete(k)
  return map
})()

/** Featured candidates for the hero: playable, with a real "מה בקלטת" segment list. */
const heroCandidates = movies.filter((m) => m.movieUrl && m.docId && docIndex[m.docId]?.segments?.length)
const daySeed = Math.floor(Date.now() / 86_400_000)

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const store = useArchiveStore()
  const { tagsByMovie, notes, docText, favorites, recent } = store

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [view, setView] = useLocalStorage('view', 'rows', (v) => VIEWS.includes(v))
  const [sort, setSort] = useLocalStorage('sort', 'relevance', (v) => SORT_IDS.includes(v))
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [heroIndex, setHeroIndex] = useState(() => (heroCandidates.length ? daySeed % heroCandidates.length : 0))
  const [toast, setToast] = useState(null)
  const clearToast = useCallback(() => setToast(null), [])
  const searchRef = useRef(null)

  const location = useLocation()
  const navigate = useNavigate()
  const routeMatch = matchPath('/movie/:id', location.pathname)
  const openMovie = routeMatch ? moviesById[routeMatch.params.id] : null

  // Unknown deep link → back to the catalog with a message
  useEffect(() => {
    if (routeMatch && !openMovie) {
      navigate('/', { replace: true })
      setToast('הסרט המבוקש לא נמצא בקטלוג')
    }
  }, [routeMatch, openMovie, navigate])

  // Storage full / blocked
  useEffect(() => {
    const onErr = () => setToast('לא ניתן לשמור בדפדפן (האחסון מלא או חסום). כדאי לייצא גיבוי.')
    window.addEventListener(STORAGE_ERROR_EVENT, onErr)
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onErr)
  }, [])

  const setFilter = useCallback((key, value) => {
    if (key === 'view') return setView(value)
    if (key === 'sort') return setSort(value)
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'decade' ? { year: null } : {}) }))
  }, [setView, setSort])

  const resetFilters = useCallback(() => { setFilters(DEFAULT_FILTERS); setQuery('') }, [])

  // "/" focuses the search bar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !openMovie && !tagManagerOpen) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openMovie, tagManagerOpen])

  // ---- Search ------------------------------------------------------------
  const index = useMemo(() => buildIndex(movies, (m) => ({
    tags: tagsByMovie[m.id] || EMPTY,
    notes: notes[m.id] || '',
    docText: m.docId ? [docIndex[m.docId]?.text, docText[m.docId]].filter(Boolean).join('\n').replace(DOC_HEADER, '').trim() : '',
  })), [tagsByMovie, notes, docText])

  const searchResults = useMemo(() => search(index, deferredQuery), [index, deferredQuery])
  const searchTerms = useMemo(() => parseQuery(deferredQuery), [deferredQuery])
  const searchMatched = useMemo(
    () => (searchResults ? movies.filter((m) => searchResults.has(m.id)) : movies),
    [searchResults],
  )

  // ---- Facets ------------------------------------------------------------
  const decadeCounts = useMemo(() => {
    const counts = new Map()
    for (const m of searchMatched) counts.set(m.decade ?? 'none', (counts.get(m.decade ?? 'none') || 0) + 1)
    return [...counts.entries()]
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => (a.decade === 'none' ? 1 : b.decade === 'none' ? -1 : a.decade - b.decade))
  }, [searchMatched])

  const yearsInDecade = useMemo(() => {
    if (filters.decade == null || filters.decade === 'none') return []
    const counts = new Map()
    for (const m of searchMatched) if (m.decade === filters.decade) counts.set(m.year, (counts.get(m.year) || 0) + 1)
    return [...counts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year)
  }, [searchMatched, filters.decade])

  // ---- Filter + sort -----------------------------------------------------
  const favSet = useMemo(() => new Set(favorites), [favorites])
  const visible = useMemo(() => {
    const list = searchMatched.filter((m) => {
      if (filters.decade === 'none' ? m.decade != null : filters.decade != null && m.decade !== filters.decade) return false
      if (filters.year != null && m.year !== filters.year) return false
      if (filters.onlyDetails && !m.detailsUrl) return false
      if (filters.onlyFavorites && !favSet.has(m.id)) return false
      if (filters.type !== 'all' && m.type !== filters.type) return false
      if (filters.tags.length) {
        const mt = tagsByMovie[m.id] || EMPTY
        if (!filters.tags.every((t) => mt.includes(t))) return false
      }
      return true
    })
    const byTitle = (a, b) => collator.compare(a.title, b.title)
    const byYear = (dir) => (a, b) => {
      if (a.year == null && b.year == null) return byNatural(a, b)
      if (a.year == null) return 1
      if (b.year == null) return -1
      return dir * (a.year - b.year) || byNatural(a, b)
    }
    const sorters = {
      az: byTitle,
      za: (a, b) => -byTitle(a, b),
      newest: byYear(-1),
      oldest: byYear(1),
      relevance: (a, b) =>
        (searchResults ? searchResults.get(b.id).score - searchResults.get(a.id).score : 0) || naturalRank.get(a.id) - naturalRank.get(b.id),
    }
    return [...list].sort(sorters[sort] || sorters.relevance)
  }, [searchMatched, searchResults, filters, favSet, tagsByMovie, sort])

  const hasActiveFilters =
    filters.decade != null || filters.year != null || filters.tags.length > 0 || filters.onlyDetails || filters.onlyFavorites || filters.type !== 'all'
  const showHome = view === 'rows' && !deferredQuery.trim() && !hasActiveFilters

  // ---- Modal navigation --------------------------------------------------
  const open = useCallback((m) => navigate(`/movie/${m.id}`, { state: { fromApp: true } }), [navigate])
  const close = useCallback(() => {
    if (location.state?.fromApp) navigate(-1)
    else navigate('/', { replace: true })
  }, [navigate, location.state])
  const goTo = useCallback((m) => navigate(`/movie/${m.id}`, { replace: true, state: location.state }), [navigate, location.state])

  // Freeze the prev/next list for the whole viewing session (so un-tagging / un-favoriting doesn't reshuffle it)
  const navSession = useRef(null)
  if (!openMovie) navSession.current = null
  else if (!navSession.current) {
    const base = visible.some((m) => m.id === openMovie.id) ? visible : naturalOrder
    navSession.current = base.map((m) => m.id)
  }
  const navList = navSession.current || EMPTY
  const navIdx = openMovie ? navList.indexOf(openMovie.id) : -1
  const prevMovie = navIdx > 0 ? moviesById[navList[navIdx - 1]] : null
  const nextMovie = navIdx >= 0 && navIdx < navList.length - 1 ? moviesById[navList[navIdx + 1]] : null
  const goPrev = useMemo(() => (prevMovie ? () => goTo(prevMovie) : null), [prevMovie, goTo])
  const goNext = useMemo(() => (nextMovie ? () => goTo(nextMovie) : null), [nextMovie, goTo])

  const { markViewed } = store
  useEffect(() => {
    if (openMovie) markViewed(openMovie.id)
    document.title = openMovie ? `${openMovie.displayTitle} · הסרטים של אורי` : 'הסרטים של אורי'
  }, [openMovie, markViewed])

  // ---- Tags --------------------------------------------------------------
  const filterBySingleTag = useCallback((t) => {
    setFilters((f) => ({ ...f, tags: [t] }))
    if (openMovie) close()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [openMovie, close])

  const renameTag = useCallback((oldName, newName) => {
    store.renameTag(oldName, newName)
    const clean = String(newName ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
    if (clean) setFilters((f) => ({ ...f, tags: [...new Set(f.tags.map((t) => (t === oldName ? clean : t)))] }))
  }, [store])

  const deleteTag = useCallback((name) => {
    store.deleteTag(name)
    setFilters((f) => ({ ...f, tags: f.tags.filter((t) => t !== name) }))
  }, [store])

  // ---- Home rows ---------------------------------------------------------
  const recentSet = useMemo(() => new Set(recent.slice(0, 12).map((r) => r.id)), [recent])
  const rows = useMemo(() => {
    if (!showHome) return []
    const byYearAsc = (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || byNatural(a, b)
    const list = [
      { key: 'recent', title: 'נצפו לאחרונה', items: recent.map((r) => moviesById[r.id]).filter(Boolean).slice(0, 15) },
      { key: 'fav', title: 'המועדפים שלי', items: naturalOrder.filter((m) => favSet.has(m.id)), seeAll: () => setFilter('onlyFavorites', true) },
      { key: 'family', title: 'קלטות משפחתיות', items: naturalOrder.filter((m) => m.title.startsWith('קלטת משפחתית')), seeAll: () => setQuery('קלטת משפחתית') },
    ]
    for (const { decade } of decadeCounts) {
      if (decade === 'none') continue
      list.push({ key: `d${decade}`, title: decadeLabel(decade), items: movies.filter((m) => m.decade === decade).sort(byYearAsc), seeAll: () => setFilter('decade', decade) })
    }
    list.push(
      { key: 'audio', title: 'הקלטות שמע', items: naturalOrder.filter((m) => m.type === 'audio'), seeAll: () => setFilter('type', 'audio') },
      { key: 'noyear', title: 'ללא שנה', items: naturalOrder.filter((m) => m.decade == null), seeAll: () => setFilter('decade', 'none') },
    )
    return list
  }, [showHome, recent, favSet, decadeCounts, setFilter])

  const itemProps = (m) => ({
    match: searchResults?.get(m.id),
    tags: tagsByMovie[m.id] || EMPTY,
    isFavorite: favSet.has(m.id),
    watched: recentSet.has(m.id),
    onOpen: open,
    onToggleFavorite: store.toggleFavorite,
  })

  const goHome = () => {
    resetFilters()
    setView('rows')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const heroMovie = heroCandidates[heroIndex]
  const shuffleHero = () => {
    if (heroCandidates.length < 2) return
    let i = heroIndex
    while (i === heroIndex) i = Math.floor(Math.random() * heroCandidates.length)
    setHeroIndex(i)
  }

  return (
    <div className="min-h-dvh">
      <Header
        ref={searchRef}
        query={query}
        onQueryChange={setQuery}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenTagManager={() => setTagManagerOpen(true)}
        onHome={goHome}
        total={stats.total}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 pb-6 pt-4 sm:pt-6 lg:px-8">
        {showHome && heroMovie && (
          <Hero movie={heroMovie} segments={docIndex[heroMovie.docId]?.segments} onOpen={open} onShuffle={shuffleHero} />
        )}

        <FilterBar
          filters={{ ...filters, sort, view }}
          setFilter={setFilter}
          decadeCounts={decadeCounts}
          yearsInDecade={yearsInDecade}
          allTags={store.allTags}
          resultCount={visible.length}
          totalCount={movies.length}
          onReset={resetFilters}
        />

        {showHome ? (
          <div className="space-y-8">
            {rows.map((r) => (
              <Row key={r.key} title={r.title} movies={r.items} onSeeAll={r.seeAll} cardProps={itemProps} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex animate-fade-in flex-col items-center gap-3 py-20 text-center">
            <SearchX className="size-12 text-stone-400" strokeWidth={1.5} aria-hidden />
            <p className="text-lg font-semibold">
              {filters.onlyFavorites && !favorites.length ? 'עוד אין מועדפים' : deferredQuery.trim() ? <>לא נמצא דבר עבור ״<bdi>{deferredQuery.trim()}</bdi>״</> : 'אין סרטים שמתאימים לסינון'}
            </p>
            <p className="max-w-sm text-sm text-stone-600 dark:text-stone-400">
              {filters.onlyFavorites && !favorites.length ? 'סמנו ♥ על סרט כדי לשמור אותו כאן.' : 'נסו מילה אחרת או חלק ממנה, או הסירו חלק מהמסננים.'}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {hasActiveFilters && deferredQuery.trim() && (
                <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="h-11 rounded-xl border border-stone-300 px-4 text-sm font-semibold hover:border-amber-500 dark:border-stone-700">חיפוש בלי המסננים</button>
              )}
              <button type="button" onClick={resetFilters} className="h-11 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400">הצג את כל הסרטים</button>
            </div>
          </div>
        ) : view === 'list' ? (
          <ul className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
            {visible.map((m) => <MovieListItem key={m.id} movie={m} {...itemProps(m)} />)}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((m) => <MovieCard key={m.id} movie={m} {...itemProps(m)} />)}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 text-center text-sm text-stone-600 lg:px-8 dark:text-stone-400" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        {stats.total} סרטים · {stats.withDetails} עם פירוט ״מה בקלטת״ ·{' '}
        <button type="button" onClick={() => setTagManagerOpen(true)} className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-300">גיבוי התגיות וההערות</button>
      </footer>

      {openMovie && (
        <VideoModal
          movie={openMovie}
          onClose={close}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={goTo}
          position={navIdx >= 0 ? `${navIdx + 1} מתוך ${navList.length}` : ''}
          parts={partsBySeries.get(openMovie.series) || EMPTY}
          searchTerms={searchTerms}
          tags={tagsByMovie[openMovie.id] || EMPTY}
          allTags={store.allTags}
          onAddTag={store.addTag}
          onRemoveTag={store.removeTag}
          onTagClick={filterBySingleTag}
          note={notes[openMovie.id] || ''}
          onSaveNote={store.setNote}
          isFavorite={favSet.has(openMovie.id)}
          onToggleFavorite={store.toggleFavorite}
          docIndexEntry={openMovie.docId ? docIndex[openMovie.docId] : null}
          userDocText={openMovie.docId ? docText[openMovie.docId] || '' : ''}
          onSaveDocText={store.setDocContent}
        />
      )}

      {tagManagerOpen && (
        <TagManager
          store={store}
          activeTags={filters.tags}
          onTagClick={filterBySingleTag}
          onRenameTag={renameTag}
          onDeleteTag={deleteTag}
          onClose={() => setTagManagerOpen(false)}
        />
      )}

      <Toast message={toast} onDone={clearToast} />
    </div>
  )
}
