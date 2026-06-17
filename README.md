# FocusPDF Research Reader (Web)

A distraction-free PDF reader for researchers, rebuilt for the browser instead of Android. Runs on
Fedora, or anywhere else, in any modern browser — nothing to install on the reading side.

## Running it

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev       # local dev server with hot reload
```

```bash
npm run build      # production build into dist/
npm run preview    # serve that production build locally
```

To put it on another device, either run `npm run dev`/`preview` on that machine, or build once and
serve the `dist/` folder with any static file server (`npx serve dist`, nginx, GitHub Pages, etc.) —
it's a static site, so any host works.

## What it does

- **Open a PDF** via the file picker or drag-and-drop. Text-based PDFs open in **Text Mode**;
  scanned/image PDFs are detected automatically and open in **Scan Mode**.
- **Text Mode** splits each page into sentences and darkens everything except the current one,
  with a soft amber glow around the cutout. Next/Previous sentence, next/previous page.
- **Scan Mode** shows a horizontal reading window that moves down (or up) the page image, with
  adjustable height and step size.
- **Annotations**: add a note tied to the current sentence (or scan position) without leaving the
  reader. The Annotations screen lets you search, filter by document, edit, delete, and jump back
  to the exact spot.
- **Export** annotations to CSV or Markdown, in the `Source Document | Page | Excerpt | Annotation
  | Timestamp` table format from the brief.
- Settings: overlay darkness, sentence highlight padding, auto-centering, scan window height/step.
- Dark/light theme toggle, keyboard navigation, minimal animation throughout.

## Two adaptations from the Android spec, on purpose

**Volume keys → arrow keys.** Browsers intentionally don't let web pages intercept hardware volume
buttons (that's an OS-level restriction, not something any web app can route around). Arrow Up/Down
do the same job as the original Volume Up/Down (previous/next sentence, or move the scan window);
Left/Right change pages.

**"Recent files" require one re-pick.** For security, browsers won't let a site silently reopen an
arbitrary file from disk — there's no path to bypass that from JavaScript. Recent files are listed
with their last page/position remembered, but reopening one still means picking it again in the file
dialog; FocusPDF then resumes exactly where you left off.

## What's implemented vs. deferred

Built now: PDF loading + auto mode detection, Text Mode with sentence-level focus overlay, Scan Mode
with adjustable window, the full annotation system (add/search/filter/edit/delete/jump), CSV and
Markdown export, settings panel, recent files, dark/light theme, keyboard navigation.

Not yet built (flagged in the original brief as later-priority): PDF and DOCX export of annotations.
Both are straightforward to add on top of the existing `AnnotationRepository` data — ask and I can
wire them in.

## Architecture

```
src/
  types/            Shared TypeScript types (Annotation, RecentFile, AppSettings, SentenceBox)
  db/                Dexie (IndexedDB) schema + repositories for annotations and recent files
  lib/               pdf.js setup, sentence splitting, text/bbox extraction, CSV/Markdown export
  store/             Zustand stores: reader (current doc/page/sentence state), settings, UI nav
  hooks/             Keyboard navigation
  components/        TopBar, ReaderScreen, PdfCanvas, TextModeOverlay, ScanModeOverlay,
                      FloatingControls, AnnotationEditorSheet, AnnotationListScreen, SettingsPanel
```

Annotations and recent-file metadata persist in IndexedDB in the browser you're using — they don't
sync between devices on their own, since this build doesn't include a backend. If that's ever wanted
(e.g. syncing notes between your Fedora box and a phone), it'd mean adding a small sync server or
pointing the repositories at something like Supabase/Firebase instead of Dexie.

## A known rendering limitation

Sentence bounding boxes are computed from pdf.js's text-position data assuming non-rotated text,
which covers the overwhelming majority of academic PDFs. Pages with rotated or heavily multi-column
text may get a slightly imprecise highlight box — worth flagging if you hit a paper where the cutout
looks off.
