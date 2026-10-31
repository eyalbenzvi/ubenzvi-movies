import { useEffect, useRef, useState } from 'react'
import { Check, Download, Pencil, Plus, Tags, Trash2, Upload, X } from 'lucide-react'

/** Global tag management: create / rename / delete tags, plus JSON backup export & import. */
export default function TagManager({ store, activeTags, onTagClick, onClose }) {
  const { allTags, createTag, renameTag, deleteTag, exportData, importData, notes, docText, favorites } = store
  const [newTag, setNewTag] = useState('')
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [importMode, setImportMode] = useState('merge')
  const [message, setMessage] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !editing) onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose, editing])

  const flash = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uri-movies-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    flash('ok', 'קובץ הגיבוי הורד בהצלחה')
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (importMode === 'replace' && !window.confirm('הייבוא יחליף את כל התגיות וההערות הקיימות. להמשיך?')) return
      const res = importData(data, importMode)
      flash('ok', `יובאו ${res.tags} תגיות עבור ${res.movies} סרטים`)
    } catch (err) {
      flash('error', err instanceof SyntaxError ? 'הקובץ אינו JSON תקין' : err.message)
    }
  }

  const startEdit = (name) => { setEditing(name); setEditValue(name) }
  const saveEdit = () => { renameTag(editing, editValue); setEditing(null) }

  const assigned = allTags.reduce((s, t) => s + t.count, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="tag-manager-title" className="relative flex max-h-[92dvh] w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <div>
            <h2 id="tag-manager-title" className="flex items-center gap-2 font-display text-xl font-bold"><Tags className="size-5 text-amber-500" /> ניהול תגיות</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {allTags.length} תגיות · {assigned} שיוכים · {Object.keys(notes).length} הערות · {favorites.length} מועדפים · {Object.keys(docText).length} מסמכים שהוזנו
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label="סגור"><X className="size-5" /></button>
        </header>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-5">
          <form
            onSubmit={(e) => { e.preventDefault(); if (createTag(newTag)) setNewTag('') }}
            className="flex gap-2"
          >
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="שם תגית חדשה…"
              maxLength={40}
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-stone-700 dark:bg-stone-950/50"
            />
            <button type="submit" disabled={!newTag.trim()} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-40">
              <Plus className="size-4" /> צור
            </button>
          </form>

          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
            {allTags.length === 0 && <li className="p-4 text-center text-sm text-stone-500">אין תגיות עדיין.</li>}
            {allTags.map(({ name, count }) => (
              <li key={name} className="flex items-center gap-2 px-3 py-2">
                {editing === name ? (
                  <form onSubmit={(e) => { e.preventDefault(); saveEdit() }} className="flex flex-1 gap-2">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(null) } }}
                      maxLength={40}
                      className="min-w-0 flex-1 rounded-lg border border-amber-500 bg-white px-2 py-1 text-sm outline-none dark:bg-stone-950"
                    />
                    <button type="submit" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10" aria-label="שמור"><Check className="size-4" /></button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-500/10" aria-label="ביטול"><X className="size-4" /></button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { onTagClick(name); onClose() }}
                      className={`flex-1 truncate text-start text-sm font-medium hover:text-amber-600 ${activeTags.includes(name) ? 'text-amber-600 dark:text-amber-300' : ''}`}
                      title="הצג את כל הסרטים עם התגית"
                    >
                      {name}
                    </button>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">{count}</span>
                    <button type="button" onClick={() => startEdit(name)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-500/10 hover:text-amber-600" aria-label={`שנה שם ${name}`}><Pencil className="size-4" /></button>
                    <button
                      type="button"
                      onClick={() => { if (count === 0 || window.confirm(`למחוק את התגית "${name}" מ-${count} סרטים?`)) deleteTag(name) }}
                      className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-500/10 hover:text-rose-600"
                      aria-label={`מחק ${name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
            <h3 className="mb-1 font-semibold">גיבוי ושחזור</h3>
            <p className="mb-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              כל התגיות, ההערות, המועדפים ותוכן "מה בקלטת" שהוזן נשמרים בדפדפן הזה בלבד. ייצאו קובץ JSON כדי לגבות או להעביר למכשיר אחר.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">
                <Download className="size-4" /> ייצוא JSON
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold hover:border-amber-500 hover:text-amber-700 dark:border-stone-700 dark:hover:text-amber-300">
                <Upload className="size-4" /> ייבוא JSON
              </button>
              <select value={importMode} onChange={(e) => setImportMode(e.target.value)} className="rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm dark:border-stone-700 dark:bg-stone-900" aria-label="אופן הייבוא">
                <option value="merge">מיזוג עם הקיים</option>
                <option value="replace">החלפת הכל</option>
              </select>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
            </div>
            {message && (
              <p className={`mt-3 animate-fade-in text-sm font-medium ${message.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{message.text}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
