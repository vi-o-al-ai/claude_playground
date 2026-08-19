/**
 * Placeholder entry point for __TITLE__.
 *
 * This is a Node app, not a browser project — it has no Vite config, no
 * `index.html`, and never appears on the arcade hub.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv } from "node:process";

/**
 * The greeting shown while this project is still a stub.
 *
 * @returns {string}
 */
export function greeting() {
  return "__EMOJI__ __TITLE__";
}

// Run only when invoked directly, so importing the module stays side-effect free.
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(greeting());
}
