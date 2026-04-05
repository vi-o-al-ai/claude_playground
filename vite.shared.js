import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Creates a Vite config for a single game/app package.
 * Each package is fully independent — its own dev server, build, and output.
 *
 * @param {Object} options
 * @param {string} options.root - Absolute path to the package directory
 * @param {number} [options.port] - Dev server port (optional)
 */
export function createGameConfig({ root, port }) {
  return defineConfig({
    root,
    build: {
      outDir: resolve(root, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      open: true,
    },
  });
}
