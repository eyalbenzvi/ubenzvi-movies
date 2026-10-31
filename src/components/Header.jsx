import { forwardRef } from 'react'
import { Clapperboard, Moon, Search, Sun, Tags, X } from 'lucide-react'

const Header = forwardRef(function Header({ query, onQueryChange, theme, onToggleTheme, onOpenTagManager, stats }, searchRef) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur-xl dark:border-stone-800/80 dark:bg-[#120e0b]/85">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:gap-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <a href="#/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-stone-950 shadow-lg shadow-amber-600/30">
              <Clapperboard className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-xl font-bold tracking-tight sm:text-2xl">הסרטים של אורי</span>
              <span className="block text-xs text-stone-500 dark:text-stone-400">ארכיון הווידאו המשפחתי · {stats.total} סרטים</span>
            </span>
          </a>
          <div className="flex items-center gap-1 md:hidden">
            <IconButtons theme={theme} onToggleTheme={onToggleTheme} onOpenTagManager={onOpenTagManager} />
          </div>
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder='חיפוש בשמות, בתגיות, בהערות ובתוכן "מה בקלטת"…'
            className="w-full rounded-2xl border border-stone-300 bg-white py-3 pe-20 ps-11 text-base shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 dark:border-stone-700 dark:bg-stone-900/80 dark:placeholder:text-stone-500 [&::-webkit-search-cancel-button]:hidden"
            aria-label="חיפוש בקטלוג"
          />
          <div className="absolute end-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <button type="button" onClick={() => { onQueryChange(''); searchRef.current?.focus() }} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200" aria-label="נקה חיפוש">
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-stone-300 px-1.5 py-0.5 font-mono text-[11px] text-stone-400 sm:inline dark:border-stone-700">/</kbd>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <IconButtons theme={theme} onToggleTheme={onToggleTheme} onOpenTagManager={onOpenTagManager} withLabel />
        </div>
      </div>
    </header>
  )
})

function IconButtons({ theme, onToggleTheme, onOpenTagManager, withLabel }) {
  return (
    <>
      <button type="button" onClick={onOpenTagManager} className="inline-flex items-center gap-1.5 rounded-xl p-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-200/70 hover:text-amber-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-amber-300" aria-label="ניהול תגיות וגיבוי">
        <Tags className="size-5" /> {withLabel && <span className="hidden lg:inline">תגיות וגיבוי</span>}
      </button>
      <button type="button" onClick={onToggleTheme} className="rounded-xl p-2.5 text-stone-600 transition hover:bg-stone-200/70 hover:text-amber-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-amber-300" aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'} title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}>
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>
    </>
  )
}

export default Header
