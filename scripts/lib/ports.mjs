/**
 * Deterministic dev-server port assignment.
 *
 * Every Vite project in the monorepo derives its dev port from its directory
 * name instead of hard-coding one. That keeps ports stable across machines and
 * checkouts, removes the "which port is free?" bookkeeping when adding a
 * project, and guarantees two projects only ever clash if their names hash to
 * the same slot (checked by scripts/__tests__/ports.test.js for the names that
 * currently exist).
 */

/** First port in the assignable range (inclusive). */
export const PORT_RANGE_START = 3100;

/** Last port in the assignable range (inclusive). */
export const PORT_RANGE_END = 3499;

const PORT_RANGE_SIZE = PORT_RANGE_END - PORT_RANGE_START + 1;

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

const encoder = new TextEncoder();

/**
 * 32-bit FNV-1a hash of a string's UTF-8 bytes.
 *
 * @param {string} value
 * @returns {number} Unsigned 32-bit hash
 */
function fnv1a(value) {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of encoder.encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Derives a stable dev-server port from a project directory name.
 *
 * @param {string} name - Project directory name, e.g. "solitaire"
 * @returns {number} A port in [PORT_RANGE_START, PORT_RANGE_END]
 */
export function derivePort(name) {
  if (typeof name !== "string") {
    throw new TypeError(`derivePort expects a string, received ${typeof name}`);
  }
  return PORT_RANGE_START + (fnv1a(name) % PORT_RANGE_SIZE);
}
