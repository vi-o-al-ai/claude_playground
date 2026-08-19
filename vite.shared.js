import { defineConfig } from "vite";
import { basename, relative, resolve, sep } from "path";
import { derivePort } from "./scripts/lib/ports.mjs";

// This file lives at the repo root, so its own directory is the repo root.
const repoRoot = import.meta.dirname;

/**
 * Computes the deployed base path for a project.
 *
 * Projects live at `<category>/<stack>/<name>` (e.g. `games/web/solitaire`).
 * The stack segment is an authoring detail and is not part of the public URL,
 * so that project deploys to `${PAGES_BASE}/games/solitaire/`. The site root
 * project (the arcade hub) deploys to `${PAGES_BASE}/` itself.
 *
 * With PAGES_BASE unset — local dev and local builds — the base is always "/".
 *
 * @param {string} root - Absolute path to the project directory
 * @param {boolean} siteRoot - Whether this project is the site's landing page
 * @returns {string} The Vite `base` value
 */
function deriveBase(root, siteRoot) {
  // eslint-disable-next-line no-undef
  const pagesBase = process.env.PAGES_BASE;
  if (!pagesBase) return "/";
  if (siteRoot) return `${pagesBase}/`;

  const segments = relative(repoRoot, root).split(sep).filter(Boolean);
  const name = segments[segments.length - 1];
  const category = segments.length > 1 ? segments[0] : null;

  return category ? `${pagesBase}/${category}/${name}/` : `${pagesBase}/${name}/`;
}

/**
 * Creates a Vite config for a single project (game or app).
 * Each project is fully independent — its own dev server, build, and output.
 *
 * The dev server port is derived from the project's directory name, so it is
 * stable across checkouts and never needs to be hand-picked. `strictPort` is
 * off, so Vite falls forward to the next free port if something else already
 * holds it.
 *
 * @param {Object} options
 * @param {string} options.root - Absolute path to the project directory
 * @param {boolean} [options.siteRoot=false] - Serve this project at the site
 *   root (`${PAGES_BASE}/`) instead of `${PAGES_BASE}/<category>/<name>/`.
 *   Only the arcade hub sets this.
 */
export function createProjectConfig({ root, siteRoot = false }) {
  return defineConfig({
    root,
    base: deriveBase(root, siteRoot),
    build: {
      outDir: resolve(root, "dist"),
      emptyOutDir: true,
    },
    server: {
      port: derivePort(basename(root)),
      strictPort: false,
      open: true,
    },
  });
}
