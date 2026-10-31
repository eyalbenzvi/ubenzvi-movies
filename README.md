# 🎬 הסרטים של אורי — Uri's Movie Catalog

A Hebrew-first (RTL), fully static React app for browsing, watching, searching and tagging a
family video archive of **124 recordings**, 41 of them with a "מה בקלטת" (tape contents) document.
Built with **React 19 + Vite + Tailwind CSS v4 + Lucide icons**, deployed to **GitHub Pages**.

## Features

- **Netflix-style home** — featured recording (changes daily, plus a "סרט אקראי" shuffle), and shelves:
  recently watched, favorites, family tapes, one per decade, audio recordings, undated.
- **Grid & list views** for search results / filters; 2 columns on phones.
- **Movie window** — full-screen on phones (swipe down or Back to close), player on top, then:
  - **מה בקלטת** — the tape's segment list (from the Google Doc), with the original doc on demand;
  - **חלקים** — all parts of a multi-part tape;
  - **תגיות והערות** — tags and auto-saved personal notes.
- **In-app full screen** — the Drive player / doc can't navigate away from the app; Back returns.
- **Deep search** across titles, tags, notes **and the text of all "מה בקלטת" documents**. Hebrew-aware
  (niqqud, quotes, final letters, maqaf, a prefix letter), `"quoted phrases"`, highlighted excerpts.
- **Years from the documents** — tapes without a year in their title get it from the dated segments.
- **Filters & sort** — decade/year, tags, "has מה בקלטת", favorites, video/audio; a bottom sheet on phones.
- **Moments (timestamped tags)** — "סמן רגע" under the player (and in full screen): type the time the
  player shows (2210 → 22:10) and what happens. Moments are listed like chapters, editable, searchable,
  and open the video at that time (`#/movie/<id>?t=1330`). The app can't read Google's player position,
  so the time is typed by the user.
- **Tags, notes, favorites, history** in `localStorage`, with JSON backup export/import (validated).
- **Dark (default) & light themes**, keyboard & screen-reader friendly, respects reduced motion.

## Run locally

Requires **Node.js 20.19+** (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main` (and the current working
branch `ccr-b3965374-zsn143`). One-time setup: *Settings → Pages → Source:* **GitHub Actions**.
The site is served at `https://<user>.github.io/<repo>/`.

The build uses a relative base (`./`) and a HashRouter (`#/movie/<id>`), so refresh/deep links never 404,
and it also works on a custom domain (add `public/CNAME`).

## Updating the "מה בקלטת" content

```bash
npm run fetch-docs   # downloads all linked Google Docs as text → src/data/docContents.json
```
Works while the docs are shared "Anyone with the link". Commit the updated JSON to publish it.
Docs that become private are dropped from the file on the next run.

## Privacy & security — read this

- **The site and this repository are public.** Anyone with the address can see the titles, the
  "מה בקלטת" texts, and (because the Drive files are shared by link) watch the videos. The site asks
  search engines not to index it (`noindex`), but that is not access control.
- **The only real protection for the videos is Google Drive sharing.** To restrict them, change the
  files/folder from "Anyone with the link" to specific family accounts. Embedded playback then works
  only for viewers signed in to an allowed Google account; thumbnails will fall back to placeholders.
- **Stronger options**, if needed later: host privately (e.g. Cloudflare Pages + Cloudflare Access,
  free for small teams) or encrypt the catalog at build time behind a family password.
- Hardening in place: Content-Security-Policy and referrer policy (meta tags), sandboxed Drive/Docs
  iframes, only `https://drive.google.com` / `docs.google.com` links are accepted, validated
  localStorage reads and backup imports, GitHub Actions pinned to commit SHAs with per-job
  permissions, `npm audit` in CI, Dependabot.

## Project structure

```
├── index.html                    # RTL shell, CSP is injected at build (vite.config.js)
├── public/                       # theme.js (pre-paint theme), manifest, favicon
├── scripts/fetch-docs.mjs        # pre-fetch "מה בקלטת" docs text
├── docs/REVIEW.md                # expert review findings & how each was handled
└── src/
    ├── App.jsx                   # routing, search/filter/sort pipeline, home shelves
    ├── data/                     # catalog.json, docContents.json, movies.js, docIndex.js
    ├── lib/                      # search.js (Hebrew search), docParse.js, storage.js
    ├── hooks/                    # useArchiveStore, useTheme, useBackClose, useMediaQuery, …
    └── components/               # Header, FilterBar, HomeRows, MovieCard, MovieListItem,
                                  # VideoModal, EmbedFrame, Sheet, TagEditor, TagManager, …
```

## Updating the catalog

Edit `src/data/catalog.json` (`title`, `movieUrl`, `detailsUrl` or `null`). Movie ids are a hash of the
title, so tags survive reordering; renaming a title gives it a new id.
