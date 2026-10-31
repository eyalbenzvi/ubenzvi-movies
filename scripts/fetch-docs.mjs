#!/usr/bin/env node
/**
 * Pre-fetch the text of every "מה בקלטת" Google Doc into src/data/docContents.json,
 * so the app can full-text search inside them without any runtime API calls.
 *
 * Requirements: each Google Doc must be shared as "Anyone with the link can view".
 * Private docs are skipped (their existing entry, if any, is kept) and the app
 * falls back to the automatic extract / text pasted by the user inside the app.
 *
 * Usage:  npm run fetch-docs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const catalogPath = path.join(root, 'src/data/catalog.json')
const outPath = path.join(root, 'src/data/docContents.json')

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
let existing = {}
try { existing = JSON.parse(await readFile(outPath, 'utf8')) } catch { /* first run */ }

const docs = new Map()
for (const row of catalog) {
  if (!row.detailsUrl) continue
  try {
    const u = new URL(row.detailsUrl)
    const id = u.pathname.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1]
    if (id && !docs.has(id)) docs.set(id, u.searchParams.get('resourcekey'))
  } catch { /* ignore malformed URL */ }
}

console.log(`Fetching ${docs.size} documents…`)
const out = { ...existing }
let ok = 0
let failed = 0

for (const [id, resourceKey] of docs) {
  const url = `https://docs.google.com/document/d/${id}/export?format=txt`
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: resourceKey ? { 'X-Goog-Drive-Resource-Keys': `${id}/${resourceKey}` } : {},
    })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || type.includes('text/html')) throw new Error(`HTTP ${res.status} (doc is probably not shared publicly)`)
    const text = (await res.text()).replace(/^﻿/, '').replace(/\r\n/g, '\n').trim()
    out[id] = { text, fetchedAt: new Date().toISOString() }
    ok++
    console.log(`  ✓ ${id} (${text.length} chars)`)
  } catch (err) {
    failed++
    console.warn(`  ✗ ${id}: ${err.message}`)
  }
}

await writeFile(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(`\nDone: ${ok} fetched, ${failed} failed. Saved to ${path.relative(root, outPath)}`)
if (failed) console.log('Tip: share failed docs as "Anyone with the link → Viewer" and run again, or paste their text inside the app.')
