# Step 6: Progressive Web App (PWA) Support

## Overview

The AI Games Arcade is now a **Progressive Web App**. Users can install it on their phone or desktop and play all games offline.

## What Was Added

### Web App Manifest (`public/manifest.json`)

Tells the browser how to display the app when installed:

- **App name**: "AI Games Arcade" (short: "AI Arcade")
- **Display mode**: `standalone` — opens without browser chrome (address bar, tabs)
- **Theme color**: `#7b2ff7` (purple — matches the arcade gradient)
- **Background color**: `#0f0f23` (dark — matches the game background)
- **Icons**: 192x192 and 512x512 PNG icons

### Service Worker (`public/sw.js`)

Manages offline caching using a **cache-first with network fallback** strategy:

1. **On install**: Pre-caches the arcade hub shell (index.html, manifest, icons)
2. **On fetch**: Serves from cache if available, otherwise fetches from network and caches the response for next time
3. **On activate**: Cleans up old cache versions when the service worker updates

**Cache behavior:**

- Arcade hub pages: pre-cached on install
- Game pages: cached on first visit (runtime caching)
- After visiting a game once, it works fully offline

### Registration Script

Added to `index.html`:

```html
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
</script>
```

Registration fails silently if service workers aren't supported (older browsers, non-HTTPS in development).

### HTML Meta Tags

```html
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#7b2ff7" />
<link rel="apple-touch-icon" href="icons/icon-192.png" />
```

## File Structure

```
packages/arcade-hub/
├── index.html              # Manifest link, SW registration
├── public/                 # Static files copied to dist/ as-is
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/
│       ├── icon-192.png    # App icon (192x192)
│       ├── icon-512.png    # App icon (512x512)
│       └── generate-icons.html  # Helper to generate real icons
```

## How to Generate Real Icons

The included icons are solid-color placeholders. To create proper branded icons:

1. Open `packages/arcade-hub/public/icons/generate-icons.html` in a browser
2. Right-click each rendered canvas and "Save Image As"
3. Save as `icon-192.png` and `icon-512.png`, replacing the placeholders
4. Delete `generate-icons.html`

Or use any image editor / icon generator to create 192x192 and 512x512 PNG icons.

## Cache Versioning

To force a cache update (e.g., after deploying new game versions), increment the version in `sw.js`:

```js
const CACHE_VERSION = "v2"; // was "v1"
```

The old cache will be automatically deleted on the next visit.

## Limitations

- **HTTPS required**: Service workers only work over HTTPS (or localhost). GitHub Pages provides HTTPS by default.
- **No push notifications**: Not implemented — games are single-player/local.
- **Cross-origin games**: If games are hosted on different origins, the service worker can't cache them. All games must be on the same origin (same GitHub Pages site).

## Testing PWA Locally

```bash
# Build the arcade hub
npm run build --workspace=packages/arcade-hub

# Serve the built files
npm run preview --workspace=packages/arcade-hub

# Open http://localhost:4173 in Chrome
# DevTools → Application → Service Workers (verify registration)
# DevTools → Application → Manifest (verify installability)
# DevTools → Network → check "Offline" → reload (verify offline works)
```

## Design Decisions

1. **Cache-first strategy** — Games are static HTML/JS; serving from cache is always correct and faster than network.
2. **Runtime caching for games** — Games are independent packages that may not all be deployed together. Caching on first visit is more flexible than pre-caching all games.
3. **`public/` directory for PWA files** — Vite copies `public/` contents to `dist/` without processing. This keeps the service worker and manifest unmodified (service workers must not be bundled/hashed).
4. **`skipWaiting()` + `clients.claim()`** — New service worker versions activate immediately without requiring the user to close all tabs.
5. **Placeholder icons** — Real icons can be generated from the included HTML helper. Placeholders ensure the PWA is valid and installable from day one.
