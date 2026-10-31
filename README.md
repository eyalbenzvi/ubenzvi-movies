# 🎬 הסרטים של אורי — Uri's Movie Catalog

A Hebrew-first (RTL), fully static React app for browsing, watching, searching and tagging a
personal family video archive of **124 recordings** (41 of them with a "מה בקלטת" breakdown doc).
Built with **React 19 + Vite + Tailwind CSS v4 + Lucide icons**, deployable to **GitHub Pages**.

## Features

| | |
|---|---|
| 🎞️ **Grid & list views** | Responsive card grid (1–5 columns) and a compact list. Drive thumbnails where available, warm "VHS label" art otherwise. |
| ▶️ **In-app player** | Modal with an embedded Google Drive `/preview` player, a prominent **"פתח בחלון חדש"** button, prev/next navigation (also ← / → keys), and a deep link per movie (`#/movie/<id>`). |
| 📄 **"מה בקלטת" tab** | Embedded Google Doc preview + open-in-new-tab, for the 41 items that have one. |
| 🔎 **Deep search** | One search bar over titles, tags, personal notes **and the contents of the "מה בקלטת" docs**. Hebrew-aware: ignores niqqud and quote marks (`מעה"ב` = `מעהב`), folds final letters, tolerates a prefix letter (`הטיול` → `טיול`), supports `"quoted phrases"`; all words must match. Hits are highlighted, and matches found inside a doc show an excerpt. Press `/` to focus. |
| 🏷️ **Tags** | Add/remove tags per movie (autocomplete + smart suggestions derived from the title), click any tag to filter, combine multiple tags (AND). Global manager to create / rename / merge / delete tags. |
| 💾 **Persistence & backup** | Tags, notes, favorites and pasted doc text live in `localStorage` (synced across tabs). Export / import a JSON backup (merge or replace). |
| 🎚️ **Filters & sorting** | Decade chips + per-year select (years parsed from titles), tag chips, "has מה בקלטת", favorites, video/audio. Sort: relevance, א–ת, ת–א, newest, oldest. |
| 🌗 **Themes** | Warm cinematic dark theme (default) and a light theme. Respects `prefers-reduced-motion`. |

## Quick start

Requires **Node.js 20.19+** (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

## Deploying to GitHub Pages

The build uses a **relative base (`./`)** and a **HashRouter** (`/#/movie/abc`), so it works in a
sub-path (`https://<user>.github.io/<repo>/`) *and* on a custom domain, and refreshing any page never 404s.

**Option A — GitHub Actions (recommended).** `.github/workflows/deploy.yml` builds and deploys on every push to `main`.
1. Push the repo to GitHub.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the *Actions* tab).

**Option B — `gh-pages` branch from your machine.**
```bash
npm run deploy     # builds, then pushes dist/ to the gh-pages branch
```
Then set *Settings → Pages → Source:* **Deploy from a branch → `gh-pages` / root**.

**Custom domain:** add a `public/CNAME` file containing your domain (e.g. `movies.example.com`) and configure DNS as described in the GitHub Pages docs.

> ⚠️ **Privacy:** a GitHub Pages site is public, and so are the Drive links in `src/data/catalog.json`.
> Videos only play for viewers who have access in Google Drive — for the embedded player to work for
> family members, share each file as *"Anyone with the link → Viewer"* (or make sure viewers are signed
> in with an account that has access). Otherwise use the "פתח בחלון חדש" button.

## Deep search inside "מה בקלטת"

The docs live in Google Docs, which a static site can't read at runtime. The search index for each doc is
resolved in this order:

1. **Text pasted in the app** — open a movie → "מה בקלטת" tab → *"הדבק תוכן מהמסמך"*. Copy the doc
   content (Ctrl+A, Ctrl+C) and paste. It's saved in `localStorage` and included in the JSON backup.
2. **Pre-fetched text** in `src/data/docContents.json`, produced by:
   ```bash
   npm run fetch-docs
   ```
   This downloads every doc as plain text. It only works for docs shared as *"Anyone with the link"*; at the
   time of writing all 34 unique docs are private, so the file is empty `{}`. Share them, run the script,
   commit the JSON, and every word becomes searchable for everyone.
3. **Automatic extract** (fallback) built from catalog metadata — tape number, parts covered by the doc,
   and years — so all 41 items are always discoverable (e.g. search `מספר 16`).

## Project structure

```
├── index.html                    # RTL shell, fonts, pre-paint theme
├── vite.config.js                # base: './' for GitHub Pages
├── .github/workflows/deploy.yml  # CI deploy to Pages
├── scripts/fetch-docs.mjs        # pre-fetch "מה בקלטת" docs text
└── src/
    ├── main.jsx                  # HashRouter bootstrap
    ├── App.jsx                   # state, search/filter/sort pipeline, routing
    ├── index.css                 # Tailwind v4 theme, animations
    ├── data/
    │   ├── catalog.json          # 124 rows from the spreadsheet: title, movieUrl, detailsUrl
    │   ├── movies.js             # enrichment: ids, years, parts, embed/thumbnail URLs, tag suggestions
    │   ├── docContents.json      # fetched doc text (from `npm run fetch-docs`)
    │   └── docIndex.js           # doc search index (fetched text or auto extract)
    ├── lib/
    │   ├── search.js             # Hebrew normalization, query parsing, scoring, highlight ranges
    │   └── storage.js            # localStorage helpers + useLocalStorage hook
    ├── hooks/
    │   ├── useArchiveStore.js    # tags, notes, favorites, doc text, export/import
    │   └── useTheme.js
    └── components/
        ├── Header.jsx            # logo, master search bar, theme & tag-manager buttons
        ├── FilterBar.jsx         # decades/years, tag chips, toggles, sort, view switch
        ├── MovieCard.jsx         # grid card
        ├── MovieListItem.jsx     # compact row
        ├── Thumbnail.jsx         # Drive thumbnail with fallback art
        ├── VideoModal.jsx        # player / "מה בקלטת" / tags & notes tabs
        ├── TagEditor.jsx         # per-movie tag input with autocomplete & suggestions
        ├── TagManager.jsx        # global tags + JSON backup
        ├── TagChip.jsx, Highlight.jsx, MatchInfo.jsx
```

## Updating the catalog

Edit `src/data/catalog.json` (one object per movie: `title`, `movieUrl`, `detailsUrl` or `null`).
Movie ids are a hash of the title, so **tags stay attached when rows are reordered or added**; renaming a
title gives it a new id (re-tag it, or edit the id inside an exported backup and re-import).

Two rows currently have no video link ("סוף מסלול אלון פלחה"ן צנחנים 30/01/2009" and
"עובדה עם עידן בעופרת יצוקה"); they're shown with a "no link yet" state.
