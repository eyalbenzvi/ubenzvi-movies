import { useRef, useState } from 'react'
import { Check, Download, Pencil, Plus, Tags, Trash2, Upload, X } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { useBackClose } from '../hooks/useBackClose.js'
import { MAX_IMPORT_BYTES } from '../hooks/useArchiveStore.js'

const btn = 'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition'
const primary = `${btn} bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:bg-amber-500/35 disabled:text-stone-950/60`
const secondary = `${btn} border border-line-strong hover:border-amber-500 hover:text-accent-ink  `
const iconBtn = 'flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition'

/** Global tag management + JSON backup. */
export default function TagManager({ store, activeTags, onTagClick, onRenameTag, onDeleteTag, onClose }) {
  const close = useBackClose(onClose)
  const { allTags, createTag, exportData, importData, notes, favorites } = store
  const [newTag, setNewTag] = useState('')
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [importMode, setImportMode] = useState('merge')
  const [pendingReplace, setPendingReplace] = useState(null) // parsed backup awaiting confirmation
  const [message, setMessage] = useState(null)
  const fileRef = useRef(null)

  const flash = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uri-movies-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    flash('ok', 'קובץ הגיבוי הורד')
  }

  const runImport = (data, mode) => {
    try {
      const res = importData(data, mode)
      flash('ok', `יובאו ${res.tags} תגיות, ${res.notes} הערות ו-${res.favorites} מועדפים`)
    } catch (err) {
      flash('error', err.message)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) return flash('error', 'הקובץ גדול מדי (עד 5MB)')
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      return flash('error', 'הקובץ אינו קובץ גיבוי תקין')
    }
    if (importMode === 'replace') setPendingReplace(data)
    else runImport(data, 'merge')
  }

  const saveEdit = () => {
    onRenameTag(editing, editValue)
    setEditing(null)
  }

  return (
    <Sheet onClose={close} labelledBy="tag-manager-title">
      <header className="flex items-center justify-between gap-2 px-5 pb-3 pt-1 sm:pt-4" data-sheet-drag>
        <div className="min-w-0">
          <h2 id="tag-manager-title" className="flex items-center gap-2 font-display text-xl font-bold"><Tags className="size-5 text-amber-500" aria-hidden /> תגיות וגיבוי</h2>
          <p className="text-sm text-muted">{allTags.length} תגיות · {Object.keys(notes).length} הערות · {favorites.length} מועדפים</p>
        </div>
        <button type="button" onClick={close} className={`${iconBtn} rounded-full hover:bg-surface-2 `} aria-label="סגור"><X className="size-5" aria-hidden /></button>
      </header>

      <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <form onSubmit={(e) => { e.preventDefault(); if (createTag(newTag)) { flash('ok', `נוצרה התגית "${newTag.trim()}"`); setNewTag('') } }} className="flex min-w-0 gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="שם תגית חדשה…"
            maxLength={40}
            aria-label="שם תגית חדשה"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-base outline-none focus:border-focus focus:ring-2 focus:ring-focus/25 sm:text-sm"
          />
          <button type="submit" disabled={!newTag.trim()} className={`${primary} shrink-0`}><Plus className="size-4" aria-hidden /> צור</button>
        </form>

        <ul className="divide-y divide-line rounded-xl border border-line">
          {allTags.length === 0 && <li className="p-4 text-center text-sm text-muted">אין תגיות עדיין.</li>}
          {allTags.map(({ name, count }) => (
            <li key={name} className="flex min-w-0 items-center gap-1 px-2 py-1">
              {editing === name ? (
                <form onSubmit={(e) => { e.preventDefault(); saveEdit() }} className="flex w-full min-w-0 items-center gap-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setEditing(null) } }}
                    maxLength={40}
                    aria-label={`שם חדש לתגית ${name}`}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-amber-500 bg-surface px-2 text-base outline-none sm:text-sm"
                  />
                  <button type="submit" className={`${iconBtn} text-emerald-600 hover:bg-emerald-500/10`} aria-label="שמור"><Check className="size-5" aria-hidden /></button>
                  <button type="button" onClick={() => setEditing(null)} className={`${iconBtn} hover:bg-stone-500/10`} aria-label="ביטול"><X className="size-5" aria-hidden /></button>
                </form>
              ) : confirmDelete === name ? (
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 py-1">
                  <span className="min-w-0 flex-1 text-sm">למחוק את <b>{name}</b>{count ? ` מ-${count} סרטים` : ''}?</span>
                  <button type="button" onClick={() => { onDeleteTag(name); setConfirmDelete(null) }} className={`${btn} h-10 bg-rose-600 text-white hover:bg-rose-500`}>מחק</button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className={`${btn} h-10 hover:bg-surface-2 `}>ביטול</button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { onTagClick(name); close() }}
                    className={`flex h-11 min-w-0 flex-1 items-center truncate rounded-lg px-2 text-start text-base font-medium hover:text-accent-ink ${activeTags.includes(name) ? 'text-accent-ink' : ''}`}
                    title="הצג את כל הסרטים עם התגית"
                  >
                    {name}
                  </button>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-muted">{count}</span>
                  <button type="button" onClick={() => { setEditing(name); setEditValue(name) }} className={`${iconBtn} hover:bg-stone-500/10 hover:text-accent-ink`} aria-label={`שנה שם לתגית ${name}`}><Pencil className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => (count ? setConfirmDelete(name) : onDeleteTag(name))} className={`${iconBtn} hover:bg-rose-500/10 hover:text-rose-600`} aria-label={`מחק את התגית ${name}`}><Trash2 className="size-4" aria-hidden /></button>
                </>
              )}
            </li>
          ))}
        </ul>

        <section className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <div>
            <h3 className="font-semibold">גיבוי ושחזור</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              התגיות, ההערות והמועדפים נשמרים רק בדפדפן הזה. כדאי לייצא קובץ גיבוי מדי פעם, וכך גם מעבירים אותם למכשיר אחר.
            </p>
          </div>
          <button type="button" onClick={handleExport} className={`${primary} w-full sm:w-auto`}><Download className="size-4" aria-hidden /> ייצוא קובץ גיבוי</button>

          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex rounded-xl border border-line-strong p-1" role="radiogroup" aria-label="אופן הייבוא">
              {[['merge', 'מיזוג עם הקיים'], ['replace', 'החלפת הכל']].map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={importMode === id} onClick={() => setImportMode(id)}
                  className={`h-10 flex-1 rounded-lg text-sm font-semibold transition ${importMode === id ? 'bg-amber-500 text-stone-950' : 'text-muted'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className={`${secondary} w-full sm:w-auto`}><Upload className="size-4" aria-hidden /> ייבוא מקובץ גיבוי</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
          </div>

          {pendingReplace && (
            <div className="animate-fade-in space-y-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm" role="alert">
              <p>הייבוא <b>יחליף</b> את כל התגיות, ההערות והמועדפים הקיימים. להמשיך?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { runImport(pendingReplace, 'replace'); setPendingReplace(null) }} className={`${btn} h-10 bg-rose-600 text-white hover:bg-rose-500`}>כן, להחליף</button>
                <button type="button" onClick={() => setPendingReplace(null)} className={`${btn} h-10 hover:bg-surface-2 `}>ביטול</button>
              </div>
            </div>
          )}
          {message && (
            <p className={`animate-fade-in text-sm font-medium ${message.type === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} role="status">{message.text}</p>
          )}
        </section>
      </div>
    </Sheet>
  )
}
