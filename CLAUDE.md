# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (PWA service worker enabled via devOptions)
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # ESLint check
```

There is no test framework configured.

## Architecture

LucidTrip is a single-page React PWA — a travel currency converter. It works offline after first load. The app is structured as a handful of focused modules; there is no router, no state management library, and no component library.

### Data flow

Exchange rates are fetched once on mount from `https://open.er-api.com/v6/latest/USD` (USD-based, so all conversions go through USD as a pivot). The raw rates object and a `savedAt` timestamp are persisted in `localStorage` under `triprate-rates`. On subsequent loads the cached rates are used immediately, then refreshed silently in the background. When offline, the app continues using the cached rates and shows an offline badge.

### Card/slot system (`App.jsx`)

The UI is a list of "slots" — each slot holds `{ id, code, place, flag }`. `code` is the currency for calculation, `place` is the ISO country code used for theming (or `null` for generic currencies), and `flag` is the lowercase flag-icons code.

- Amounts are never stored persistently; only the slot configuration (without amounts) is saved to `localStorage` under `triprate-slots`.
- There is always exactly one "active" card (`activeIndex`) which holds the raw user input. All other cards display computed converted values.
- The first card cannot be removed. Removing the active card transfers its computed value (as seen from card 0) to card 0.
- Swap animates cards 0 and 1 using Framer Motion `layout` + a scale keyframe (`swapping` state flag drives the 3D lift effect).
- `AnimatePresence mode="popLayout"` is used so removed cards are measured and extracted from the flow before unmount; `CurrencyCard` uses `forwardRef` specifically to support this — removing the `ref` causes a layout jump on the add button.

### Place vs. currency distinction (`places.js`, `currencies.js`)

The picker list is built by `buildEntries(rates)`:
1. **Places** — 30 curated countries in `PLACES` array (`places.js`). Each has an `id` (ISO country code), which doubles as the background image filename (`public/bg/<id>.webp`) and the flag-icons code. Multiple places can share the same `code` (e.g., DE/FR/PT/IT/NL/GR/HR/AT/ES all use `EUR`), giving each country its own background image and flag.
2. **Generic currencies** — all remaining codes from the API rates that aren't in `PLACES`, sorted alphabetically and shown below the places.

The entry `key` is the place `id` for places, or the currency `code` for generic currencies. This key is used throughout for theming, recents, and favorites.

### Theme system (`theme.js`)

Theming is entirely driven by the first card's place/currency key. There are two paths:

- **Place (has a `.webp`)**: Background is the image from `public/bg/<id>.webp`. Title gradient and accent color are extracted from the image at runtime using a 24×52 canvas pixel-sample (`extractImageColor`). The header text color (`headerDark`) is determined by sampling the top 22% of the image. The `<meta name="theme-color">` and `document.body.backgroundColor` are updated to match the very top and very bottom strips of the image, aligning the status bar and Android nav bar with the background.
- **Currency (no image)**: A blob gradient background is generated procedurally from the currency's flag colors, extracted via a 16×12 canvas render of the flag SVG (`extractFlagColor`). Three currencies (KRW, JPY, VND) have hardcoded `PRESET` colors instead of extraction. The `CUSTOM` object in `theme.js` is the override hook for adding hand-crafted themes without touching the general logic.

Background transitions are implemented via a `bgLayers` stack. A new theme pushes a new layer that fades in via CSS animation; once the fade completes (`onAnimationEnd`), all older layers below are discarded.

`getInitialTheme` returns synchronously (for the first render without flicker): it shows the image immediately for places, uses the preset for preset currencies, or falls back to a default gray gradient. `getTheme` is async and resolves after pixel sampling.

### i18n (`i18n.js`)

Language is detected once from `navigator.language` at module load time — `ko` for Korean devices, `en` for everything else. There is no runtime toggle. All UI strings are in the `STRINGS` object; import `t` for the current-language strings and `lang` for the current locale string.

### PWA / installed-app behavior (`backToExit.js`)

`setupBackToExit` is called in `main.jsx` before React mounts, so it captures the very first back-press even before hydration. It injects a dummy history entry and listens to `popstate`; the first back-press within a 2-second window dispatches the custom `lucid-exit-hint` event (which `App.jsx` listens for to show a toast), and the second press navigates back for real (OS-level app exit). This only activates in standalone/fullscreen PWA mode.

### Currency picker (`CurrencyPicker.jsx`)

`CurrencyPickerModal` renders into `document.body` via `createPortal`. The favorites list merges `FAVORITES` (hardcoded: KR, US, JP, FR) with the user's `recents` (last 6 picks, persisted in `localStorage` under `triprate-recent`), deduped in that order. Search runs against a pre-built `search` string on each entry that includes Korean name, English name, aliases, and currency name in both languages.

## Key conventions

- **No TypeScript** — plain `.jsx`/`.js` throughout.
- **CSS is a single flat file** (`App.css`) with BEM-like class names. No CSS modules or Tailwind.
- **Framer Motion** is used for all transitions: card enter/exit, background layers, picker panel, and toast. The `layout` prop on cards handles reflow animation automatically.
- **Glassmorphism border trick**: `.currency-card::before`, `.swap-button::before`, and `.add-button::before` use a gradient + `mask-composite: exclude` technique to render a gradient border ring without an extra DOM element.
- All `localStorage` reads are wrapped in try/catch — the app degrades gracefully if storage is unavailable or corrupt.
- Comments in source files are in Korean (the author's primary language).
