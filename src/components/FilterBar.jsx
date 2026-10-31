import { useState } from 'react'
import { ArrowDownUp, CalendarDays, FileText, GalleryHorizontalEnd, Heart, LayoutGrid, List, Music, RotateCcw, SlidersHorizontal, Video, X } from 'lucide-react'
import Sheet from './Sheet.jsx'
import TagChip from './TagChip.jsx'
import { useBackClose } from '../hooks/useBackClose.js'

export const SORTS = [
  { id: 'relevance', label: 'מומלץ' },
  { id: 'newest', label: 'החדש ביותר' },
  { id: 'oldest', label: 'הישן ביותר' },
  { id: 'az', label: 'א–ת' },
  { id: 'za', label: 'ת–א' },
]

const VIEWS = [
  { id: 'rows', label: 'שורות', icon: GalleryHorizontalEnd },
  { id: 'grid', label: 'רשת', icon: LayoutGrid },
  { id: 'list', label: 'רשימה', icon: List },
]

export function decadeLabel(d) {
  if (d === 'none') return 'ללא שנה'
  return d < 2000 ? `שנות ה-${String(d).slice(2)}` : `שנות ה-${d}`
}

function Pill({ active, onClick, children, title, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 sm:h-9 ${
        active
          ? 'border-amber-500 bg-amber-500 text-stone-950'
          : 'border-line bg-surface text-muted hover:border-amber-500/70 hover:text-accent-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}

const Count = ({ n, active }) => <span className={`tabular-nums ${active ? 'text-stone-800' : 'text-muted'}`}>{n}</span>

function DecadePills({ filters, setFilter, decadeCounts }) {
  const { decade } = filters
  const list = decade != null && !decadeCounts.some((d) => d.decade === decade) ? [...decadeCounts, { decade, count: 0 }] : decadeCounts
  return (
    <>
      <Pill active={decade == null} onClick={() => setFilter('decade', null)}>כל השנים</Pill>
      {list.map(({ decade: d, count }) => (
        <Pill key={d} active={decade === d} onClick={() => setFilter('decade', decade === d ? null : d)}>
          {decadeLabel(d)} <Count n={count} active={decade === d} />
        </Pill>
      ))}
    </>
  )
}

function YearSelect({ filters, setFilter, yearsInDecade }) {
  const { year } = filters
  if (yearsInDecade.length < 2 && year == null) return null
  const years = year != null && !yearsInDecade.some((y) => y.year === year) ? [...yearsInDecade, { year, count: 0 }] : yearsInDecade
  return (
    <label className="relative inline-flex shrink-0 items-center">
      <CalendarDays className={`pointer-events-none absolute start-3 size-4 ${year != null ? 'text-accent-ink' : 'text-muted'}`} aria-hidden />
      <select
        value={year ?? ''}
        onChange={(e) => setFilter('year', e.target.value ? Number(e.target.value) : null)}
        className={`h-10 appearance-none rounded-full border pe-4 ps-9 text-sm font-medium outline-none focus:border-focus sm:h-9 ${year != null ? 'border-amber-500 bg-amber-500/10 text-accent-ink' : 'border-line-strong bg-surface text-ink'}`}
        aria-label="סינון לפי שנה"
      >
        <option value="">כל שנות העשור</option>
        {years.map(({ year: y, count }) => <option key={y} value={y}>{y} ({count})</option>)}
      </select>
    </label>
  )
}

function Toggles({ filters, setFilter }) {
  const { onlyDetails, onlyFavorites, type } = filters
  return (
    <>
      <Pill active={onlyDetails} onClick={() => setFilter('onlyDetails', !onlyDetails)} title='רק סרטים עם פירוט "מה בקלטת"'>
        <FileText className="size-4" aria-hidden /> עם ״מה בקלטת״
      </Pill>
      <Pill active={onlyFavorites} onClick={() => setFilter('onlyFavorites', !onlyFavorites)}>
        <Heart className="size-4" aria-hidden /> מועדפים
      </Pill>
      <Pill active={type === 'video'} onClick={() => setFilter('type', type === 'video' ? 'all' : 'video')}>
        <Video className="size-4" aria-hidden /> וידאו
      </Pill>
      <Pill active={type === 'audio'} onClick={() => setFilter('type', type === 'audio' ? 'all' : 'audio')}>
        <Music className="size-4" aria-hidden /> שמע
      </Pill>
    </>
  )
}

function SortSelect({ sort, setFilter, className = '' }) {
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <ArrowDownUp className="pointer-events-none absolute start-3 size-4 text-muted" aria-hidden />
      <select
        value={sort}
        onChange={(e) => setFilter('sort', e.target.value)}
        className="h-10 w-full appearance-none rounded-full border border-line-strong bg-surface pe-4 ps-9 text-sm font-medium outline-none focus:border-focus sm:h-9"
        aria-label="מיון"
      >
        {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </label>
  )
}

function ViewSwitch({ view, setFilter, isHome = true }) {
  // "Rows" is the home browsing mode; while searching / filtering results are a grid or list.
  const views = isHome ? VIEWS : VIEWS.filter((v) => v.id !== 'rows')
  return (
    <div className="flex w-fit shrink-0 rounded-full border border-line p-0.5" role="group" aria-label="תצוגה">
      {views.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setFilter('view', id)}
          aria-pressed={view === id}
          aria-label={`תצוגת ${label}`}
          title={label}
          className={`flex size-9 items-center justify-center rounded-full transition sm:size-8 ${view === id ? 'bg-amber-500 text-stone-950' : 'text-muted hover:text-ink'}`}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}

function TagFilters({ filters, setFilter, allTags }) {
  const toggleTag = (t) => setFilter('tags', filters.tags.includes(t) ? filters.tags.filter((x) => x !== t) : [...filters.tags, t])
  const used = allTags.filter((t) => t.count > 0 || filters.tags.includes(t.name))
  if (!used.length) return <p className="text-sm text-muted">עוד אין תגיות. פתחו סרט והוסיפו תגיות בלשונית ״תגיות והערות״.</p>
  return used.map((t) => <TagChip key={t.name} name={t.name} count={t.count} active={filters.tags.includes(t.name)} onClick={toggleTag} />)
}

/** Removable chips for every active filter. */
function ActiveChips({ filters, setFilter, onReset }) {
  const chips = []
  if (filters.decade != null) chips.push({ key: 'decade', label: decadeLabel(filters.decade), clear: () => setFilter('decade', null) })
  if (filters.year != null) chips.push({ key: 'year', label: String(filters.year), clear: () => setFilter('year', null) })
  for (const t of filters.tags) chips.push({ key: `t-${t}`, label: `# ${t}`, clear: () => setFilter('tags', filters.tags.filter((x) => x !== t)) })
  if (filters.onlyDetails) chips.push({ key: 'det', label: 'עם ״מה בקלטת״', clear: () => setFilter('onlyDetails', false) })
  if (filters.onlyFavorites) chips.push({ key: 'fav', label: 'מועדפים', clear: () => setFilter('onlyFavorites', false) })
  if (filters.type !== 'all') chips.push({ key: 'type', label: filters.type === 'audio' ? 'שמע' : 'וידאו', clear: () => setFilter('type', 'all') })
  if (!chips.length) return null
  return (
    <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={c.clear} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-amber-500/15 pe-2 ps-3 text-sm font-medium text-amber-900 hover:bg-amber-500/25 dark:text-amber-200" aria-label={`הסר מסנן ${c.label}`}>
          {c.label} <X className="size-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onReset} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-rose-700 hover:bg-rose-500/10 dark:text-rose-400">
        <RotateCcw className="size-3.5" aria-hidden /> נקה הכל
      </button>
    </div>
  )
}

function FilterSheet({ onClose, resultCount, ...props }) {
  const close = useBackClose(onClose)
  const { filters, setFilter } = props
  return (
    <Sheet onClose={close} labelledBy="filters-title">
      <div className="flex items-center justify-between px-5 pb-2" data-sheet-drag>
        <h2 id="filters-title" className="text-lg font-bold">סינון ומיון</h2>
        <button type="button" onClick={close} className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label="סגור"><X className="size-5" aria-hidden /></button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-4">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">תקופה</h3>
          <div className="flex flex-wrap gap-2"><DecadePills {...props} /></div>
          <YearSelect {...props} />
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">הצג רק</h3>
          <div className="flex flex-wrap gap-2"><Toggles {...props} /></div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">תגיות</h3>
          <div className="flex flex-wrap gap-2"><TagFilters {...props} /></div>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted">מיון</h3>
            <SortSelect sort={filters.sort} setFilter={setFilter} className="w-full" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted">תצוגה</h3>
            <ViewSwitch view={filters.view} setFilter={setFilter} isHome={props.isHome} />
          </div>
        </section>
      </div>
      <div className="flex gap-2 border-t border-line p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={props.onReset} className="h-12 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-surface-2">איפוס</button>
        <button type="button" onClick={close} className="h-12 flex-1 rounded-xl bg-amber-500 text-base font-bold text-stone-950 hover:bg-amber-400">
          הצג {resultCount} סרטים
        </button>
      </div>
    </Sheet>
  )
}

export default function FilterBar(props) {
  const { filters, setFilter, resultCount, totalCount, onReset } = props
  const [sheetOpen, setSheetOpen] = useState(false)
  const activeCount =
    (filters.decade != null) + (filters.year != null) + filters.tags.length + filters.onlyDetails + filters.onlyFavorites + (filters.type !== 'all')

  return (
    <section className="space-y-3" aria-label="סינון ומיון">
      {/* Phone: one compact row; everything else lives in the bottom sheet */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="no-scrollbar -ms-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto ps-4">
          <Pill active={activeCount > 0} onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal className="size-4" aria-hidden /> סינון
            {activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-stone-950/85 text-xs font-bold text-amber-300 ring-2 ring-amber-500">{activeCount}</span>}
          </Pill>
          <DecadePills {...props} />
        </div>
        <ViewSwitch view={filters.view} setFilter={setFilter} isHome={props.isHome} />
      </div>

      {/* Tablet & desktop: inline */}
      <div className="hidden space-y-3 sm:block">
        <div className="flex flex-wrap items-center gap-2">
          <DecadePills {...props} />
          <YearSelect {...props} />
        </div>
        {props.allTags.some((t) => t.count > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-muted">תגיות:</span>
            <TagFilters {...props} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Toggles {...props} />
          <div className="ms-auto flex items-center gap-2">
            <span className="text-sm tabular-nums text-muted" aria-live="polite">
              {resultCount === totalCount ? `${totalCount} סרטים` : `${resultCount} מתוך ${totalCount}`}
            </span>
            <SortSelect sort={filters.sort} setFilter={setFilter} />
            <ViewSwitch view={filters.view} setFilter={setFilter} isHome={props.isHome} />
          </div>
        </div>
      </div>

      <ActiveChips filters={filters} setFilter={setFilter} onReset={onReset} />

      {!props.isHome && (
        <p className="text-sm tabular-nums text-muted sm:hidden" aria-live="polite">
          {resultCount === totalCount ? `${totalCount} סרטים` : `${resultCount} מתוך ${totalCount}`}
        </p>
      )}

      {sheetOpen && <FilterSheet {...props} onClose={() => setSheetOpen(false)} />}
    </section>
  )
}
