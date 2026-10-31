import { forwardRef } from 'react'
import { CassetteTape, Moon, Search, Sun, Tags, X } from 'lucide-react'
import { useIsPhone } from '../hooks/useMediaQuery.js'
import { useHideOnScroll } from '../hooks/useScrollDirection.js'

const Header = forwardRef(function Header({ query, onQueryChange, theme, onToggleTheme, onOpenTagManager, onHome, total }, searchRef) {
  const isPhone = useIsPhone()
  const hidden = useHideOnScroll() && isPhone && !query

  return (
    <header
      className={`sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-xl transition-transform duration-300 ${hidden ? '-translate-y-full' : ''}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:py-3 lg:px-8">
        <button type="button" onClick={onHome} className="flex min-w-0 items-center gap-2.5 text-start" aria-label="לעמוד הבית">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent sm:size-10">
            <CassetteTape className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-lg font-semibold sm:text-xl">הסרטים של אורי</span>
            <span className="hidden text-xs text-muted lg:block">ארכיון הווידאו המשפחתי · {total} סרטים</span>
          </span>
        </button>

        <div className="ms-auto flex items-center sm:order-last">
          <button type="button" onClick={onOpenTagManager} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-muted transition hover:bg-line hover:text-accent-ink" aria-label="תגיות וגיבוי">
            <Tags className="size-5" aria-hidden /> <span className="hidden xl:inline">תגיות וגיבוי</span>
          </button>
          <button type="button" onClick={onToggleTheme} className="inline-flex size-11 items-center justify-center rounded-xl text-muted transition hover:bg-line hover:text-accent-ink" aria-label={theme === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}>
            {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
          </button>
        </div>

        <form role="search" className="relative w-full sm:w-auto sm:flex-1" onSubmit={(e) => { e.preventDefault(); searchRef.current?.blur() }}>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={isPhone ? 'חיפוש סרט, תגית או רגע…' : 'חיפוש בשמות, בתגיות, בהערות ובתוכן ״מה בקלטת״…'}
            className="h-11 w-full rounded-full border border-line-strong bg-surface pe-12 ps-11 text-base outline-none transition placeholder:text-subtle focus:border-focus focus:ring-2 focus:ring-focus/25 focus-visible:outline-none sm:h-12 [&::-webkit-search-cancel-button]:hidden"
            aria-label="חיפוש בקטלוג"
          />
          <div className="absolute end-1 top-1/2 flex -translate-y-1/2 items-center">
            {query ? (
              <button type="button" onClick={() => { onQueryChange(''); searchRef.current?.focus() }} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="נקה חיפוש">
                <X className="size-4" aria-hidden />
              </button>
            ) : (
              <kbd className="me-2 hidden rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-xs text-muted can-hover:inline" aria-hidden>/</kbd>
            )}
          </div>
        </form>
      </div>
    </header>
  )
})

export default Header
