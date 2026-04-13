import { defineConfig } from "vite";
import { resolve } from "path";

// The landing page is special: its build output is copied to the GitHub
// Pages root (_site/index.html), not into a per-package subdirectory. So
// unlike the other packages — which nest under `/claude_playground/<name>/`
// — this one's base is exactly `/claude_playground/` when deployed.
const pagesBase = process.env.PAGES_BASE;
const base = pagesBase ? `${pagesBase}/` : "/";

export default defineConfig({
  root: resolve(import.meta.dirname, "."),
  base,
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 3011,
    open: true,
  },
});
