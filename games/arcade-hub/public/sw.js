/**
 * Service Worker for AI Games Arcade PWA.
 *
 * Strategy: Cache-first with network fallback.
 * - On install: pre-caches the arcade hub shell
 * - On fetch: serves from cache if available, falls back to network
 * - On activate: cleans up old cache versions
 *
 * Game pages are cached on first visit (runtime caching) rather than
 * pre-cached, since each game is an independent package that may or
 * may not be deployed alongside the hub.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `ai-arcade-${CACHE_VERSION}`;

// Shell files to pre-cache on install (arcade hub only)
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ai-arcade-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch: cache-first, network fallback, runtime caching for game pages
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip non-http(s) requests (e.g., chrome-extension://)
  if (!request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Don't cache non-OK responses or opaque responses
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        // Cache the fetched response for offline use (runtime caching)
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    }),
  );
});
