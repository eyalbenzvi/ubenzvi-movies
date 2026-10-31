import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'

import Header from './components/Header.jsx'
import FilterBar from './components/FilterBar.jsx'
import MovieCard from './components/MovieCard.jsx'
import MovieListItem from './components/MovieListItem.jsx'
import VideoModal from './components/VideoModal.jsx'
import TagManager from './components/TagManager.jsx'
import { movies, moviesById, stats } from './data/movies.js'
import { docIndex } from './data/docIndex.js'
import { buildIndex, search } from './lib/search.js'
import { useArchiveStore } from './hooks/useArchiveStore.js'
import { useTheme } from './hooks/useTheme.js'
import { useLocalStorage } from './lib/storage.js'

const EMPTY = []
const collator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' })

const DEFAULT_FILTERS = { decade: null, year: null, tags: [], onlyDetails: false, onlyFavorites: false, type: 'all' }

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const store = useArchiveStore()
  const { tagsByMovie, notes, docText, favorites } = store

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [view, setView] = useLocalStorage('view', 'grid')
  const [sort, setSort] = useLocalStorage('sort', 'relevance')
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const searchRef = useRef(null)

  const location = useLocation()
  const navigate = useNavigate()
  const routeMatch = matchPath('/movie/:id', location.pathname)
  const openMovie = routeMatch ? moviesById[routeMatch.params.id] : null

  const setFilter = useCallback((key, value) => {
    if (key === 'view') return setView(value)
    if (key === 'sort') return setSort(value)
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'decade' ? { year: null } : {}) }))
  }, [setView, setSort])

  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setQuery('') }

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
    docText: m.docId ? docText[m.docId] || docIndex[m.docId]?.text || '' : '',
  })), [tagsByMovie, notes, docText])

  const searchResults = useMemo(() => search(index, deferredQuery), [index, deferredQuery])
  const searchMatched = useMemo(
    () => (searchResults ? movies.filter((m) => searchResults.has(m.id)) : movies),
    [searchResults],
  )

  // ---- Facets (computed on search results so counts stay meaningful) ------
  const decadeCounts = useMemo(() => {
    const counts = new Map()
    for (const m of searchMatched) {
      const d = m.decade ?? 'none'
      counts.set(d, (counts.get(d) || 0) + 1)
    }
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
  const visible = useMemo(() => {
    const favSet = new Set(favorites)
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
      if (a.year == null && b.year == null) return byTitle(a, b)
      if (a.year == null) return 1
      if (b.year == null) return -1
      return dir * (a.year - b.year) || (a.part ?? 0) - (b.part ?? 0) || byTitle(a, b)
    }
    const sorters = {
      az: byTitle,
      za: (a, b) => -byTitle(a, b),
      newest: byYear(-1),
      oldest: byYear(1),
      relevance: (a, b) =>
        searchResults ? searchResults.get(b.id).score - searchResults.get(a.id).score || a.index - b.index : a.index - b.index,
    }
    return [...list].sort(sorters[sort] || sorters.relevance)
  }, [searchMatched, searchResults, filters, favorites, tagsByMovie, sort])

  const hasActiveFilters =
    !!query || filters.decade != null || filters.tags.length > 0 || filters.onlyDetails || filters.onlyFavorites || filters.type !== 'all'

  // ---- Modal navigation --------------------------------------------------
  const open = useCallback((m) => navigate(`/movie/${m.id}`), [navigate])
  const close = useCallback(() => navigate('/'), [navigate])

  const navList = openMovie && visible.some((m) => m.id === openMovie.id) ? visible : movies
  const navIdx = openMovie ? navList.findIndex((m) => m.id === openMovie.id) : -1
  const prevMovie = navIdx > 0 ? navList[navIdx - 1] : null
  const nextMovie = navIdx >= 0 && navIdx < navList.length - 1 ? navList[navIdx + 1] : null
  const goPrev = useMemo(() => (prevMovie ? () => navigate(`/movie/${prevMovie.id}`, { replace: true }) : null), [prevMovie, navigate])
  const goNext = useMemo(() => (nextMovie ? () => navigate(`/movie/${nextMovie.id}`, { replace: true }) : null), [nextMovie, navigate])

  useEffect(() => {
    document.title = openMovie ? `${openMovie.displayTitle} · הסרטים של אורי` : 'הסרטים של אורי'
  }, [openMovie])

  const toggleTagFilter = useCallback((t) => {
    setFilters((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }))
  }, [])

  const filterBySingleTag = useCallback((t) => {
    setFilters((f) => ({ ...f, tags: [t] }))
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  const favSet = useMemo(() => new Set(favorites), [favorites])

  const itemProps = (m, i) => ({
    movie: m,
    match: searchResults?.get(m.id),
    tags: tagsByMovie[m.id] || EMPTY,
    activeTags: filters.tags,
    isFavorite: favSet.has(m.id),
    onOpen: open,
    onTagClick: toggleTagFilter,
    onToggleFavorite: store.toggleFavorite,
    style: { animationDelay: `${Math.min(i, 24) * 20}ms` },
  })

  return (
    <div className="min-h-dvh">
      <Header
        ref={searchRef}
        query={query}
        onQueryChange={setQuery}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenTagManager={() => setTagManagerOpen(true)}
        stats={stats}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <FilterBar
          filters={{ ...filters, sort, view }}
          setFilter={setFilter}
          decadeCounts={decadeCounts}
          yearsInDecade={yearsInDecade}
          allTags={store.allTags}
          resultCount={visible.length}
          totalCount={movies.length}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {visible.length === 0 ? (
          <div className="flex animate-fade-in flex-col items-center gap-3 py-24 text-center">
            <SearchX className="size-12 text-stone-400" strokeWidth={1.5} />
            <p className="text-lg font-semibold">לא נמצאו סרטים</p>
            <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
              נסו מילת חיפוש אחרת, הסירו חלק מהמסננים, או הוסיפו את תוכן "מה בקלטת" כדי להרחיב את החיפוש.
            </p>
            <button type="button" onClick={resetFilters} className="mt-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">נקה חיפוש ומסננים</button>
          </div>
        ) : view === 'list' ? (
          <ul className="space-y-1">
            {visible.map((m, i) => <MovieListItem {...itemProps(m, i)} key={m.id} />)}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((m, i) => <MovieCard {...itemProps(m, i)} key={m.id} />)}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 text-center text-xs text-stone-500 dark:text-stone-500 sm:px-6 lg:px-8">
        {stats.total} סרטים · {stats.withDetails} עם פירוט "מה בקלטת" · התגיות וההערות נשמרות בדפדפן זה בלבד (גבו דרך "תגיות וגיבוי")
      </footer>

      {openMovie && (
        <VideoModal
          movie={openMovie}
          onClose={close}
          onPrev={goPrev}
          onNext={goNext}
          position={navIdx >= 0 ? `${navIdx + 1} / ${navList.length}` : null}
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
          userDocText={openMovie.docId ? docText[openMovie.docId] : null}
          onSaveDocText={store.setDocContent}
        />
      )}

      {tagManagerOpen && (
        <TagManager store={store} activeTags={filters.tags} onTagClick={filterBySingleTag} onClose={() => setTagManagerOpen(false)} />
      )}
    </div>
  )
}
