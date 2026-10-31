import { ArrowDownUp, FileText, Heart, LayoutGrid, List, Music, RotateCcw, Video } from 'lucide-react'
import TagChip from './TagChip.jsx'

export const SORTS = [
  { id: 'az', label: 'א–ת' },
  { id: 'za', label: 'ת–א' },
  { id: 'newest', label: 'החדש ביותר' },
  { id: 'oldest', label: 'הישן ביותר' },
  { id: 'relevance', label: 'רלוונטיות' },
]

export function decadeLabel(d) {
  if (d === 'none') return 'ללא שנה'
  return d < 2000 ? `שנות ה-${String(d).slice(2)}` : `שנות ה-${d}`
}

function Pill({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
          : 'border-stone-300 bg-white/60 text-stone-600 hover:border-amber-500/70 hover:text-amber-700 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:text-amber-300'
      }`}
    >
      {children}
    </button>
  )
}

export default function FilterBar({ filters, setFilter, decadeCounts, yearsInDecade, allTags, resultCount, totalCount, onReset, hasActiveFilters }) {
  const { decade, year, tags, onlyDetails, onlyFavorites, type, sort, view } = filters
  const toggleTag = (t) => setFilter('tags', tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])
  const usedTags = allTags.filter((t) => t.count > 0 || tags.includes(t.name))

  return (
    <section className="space-y-3" aria-label="סינון ומיון">
      {/* Decades */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Pill active={decade === null} onClick={() => setFilter('decade', null)}>כל השנים</Pill>
        {decadeCounts.map(({ decade: d, count }) => (
          <Pill key={d} active={decade === d} onClick={() => setFilter('decade', decade === d ? null : d)}>
            {decadeLabel(d)} <span className="tabular-nums opacity-60">{count}</span>
          </Pill>
        ))}
        {yearsInDecade.length > 1 && (
          <select
            value={year ?? ''}
            onChange={(e) => setFilter('year', e.target.value ? Number(e.target.value) : null)}
            className="shrink-0 animate-fade-in rounded-full border border-amber-500/60 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 outline-none dark:bg-stone-900 dark:text-amber-200"
            aria-label="סינון לפי שנה"
          >
            <option value="">כל שנות העשור</option>
            {yearsInDecade.map(({ year: y, count }) => <option key={y} value={y}>{y} ({count})</option>)}
          </select>
        )}
      </div>

      {/* Tags */}
      {usedTags.length > 0 && (
        <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">תגיות:</span>
          {usedTags.map((t) => (
            <TagChip key={t.name} name={t.name} count={t.count} active={tags.includes(t.name)} onClick={toggleTag} />
          ))}
        </div>
      )}

      {/* Toggles, sort & view */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={onlyDetails} onClick={() => setFilter('onlyDetails', !onlyDetails)} title='רק סרטים עם מסמך "מה בקלטת"'>
          <FileText className="size-3.5" /> עם "מה בקלטת"
        </Pill>
        <Pill active={onlyFavorites} onClick={() => setFilter('onlyFavorites', !onlyFavorites)}>
          <Heart className="size-3.5" /> מועדפים
        </Pill>
        <Pill active={type === 'video'} onClick={() => setFilter('type', type === 'video' ? 'all' : 'video')}>
          <Video className="size-3.5" /> וידאו
        </Pill>
        <Pill active={type === 'audio'} onClick={() => setFilter('type', type === 'audio' ? 'all' : 'audio')}>
          <Music className="size-3.5" /> שמע
        </Pill>
        {hasActiveFilters && (
          <button type="button" onClick={onReset} className="inline-flex animate-fade-in items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">
            <RotateCcw className="size-3.5" /> נקה הכל
          </button>
        )}

        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400" aria-live="polite">
            {resultCount === totalCount ? `${totalCount} סרטים` : `${resultCount} מתוך ${totalCount}`}
          </span>
          <label className="relative inline-flex items-center">
            <ArrowDownUp className="pointer-events-none absolute start-2.5 size-3.5 text-stone-400" aria-hidden />
            <select
              value={sort}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="appearance-none rounded-full border border-stone-300 bg-white py-1.5 pe-3 ps-7 text-xs font-medium outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-900"
              aria-label="מיון"
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <div className="flex rounded-full border border-stone-300 p-0.5 dark:border-stone-700" role="group" aria-label="תצוגה">
            <button type="button" onClick={() => setFilter('view', 'grid')} aria-pressed={view === 'grid'} className={`rounded-full p-1.5 transition ${view === 'grid' ? 'bg-amber-500 text-stone-950' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'}`} aria-label="תצוגת רשת">
              <LayoutGrid className="size-4" />
            </button>
            <button type="button" onClick={() => setFilter('view', 'list')} aria-pressed={view === 'list'} className={`rounded-full p-1.5 transition ${view === 'list' ? 'bg-amber-500 text-stone-950' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'}`} aria-label="תצוגת רשימה">
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
