/**
 * Boundary tracing: turns a binary pixel mask into closed vector loops on
 * the pixel-corner lattice. Outer boundaries come out clockwise and holes
 * counter-clockwise, so rendering all loops of a color in one path with
 * fill-rule="evenodd" fills regions and punches holes correctly.
 */

// right, down, left, up — indexed so (d + 1) % 4 is a clockwise (right) turn
// in screen coordinates (y grows downward).
const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/**
 * Traces every boundary loop of a mask.
 *
 * @param {Uint8Array|number[]} mask - Row-major 0/1 values, length w*h
 * @param {number} width
 * @param {number} height
 * @returns {Array<Array<[number, number]>>} Closed loops of corner points
 *   (first point not repeated); collinear points are merged away.
 */
export function traceMask(mask, width, height) {
  const W = width + 1; // vertex lattice width
  const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;

  // Directed boundary edges keyed by start vertex, oriented so the filled
  // region is on the right (clockwise outer loops).
  const edgeMap = new Map();
  const addEdge = (x, y, dir) => {
    const key = y * W + x;
    const list = edgeMap.get(key);
    if (list) list.push(dir);
    else edgeMap.set(key, [dir]);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) addEdge(x, y, 0);
      if (!filled(x + 1, y)) addEdge(x + 1, y, 1);
      if (!filled(x, y + 1)) addEdge(x + 1, y + 1, 2);
      if (!filled(x - 1, y)) addEdge(x, y + 1, 3);
    }
  }

  const loops = [];
  for (const [startKey, dirs] of edgeMap) {
    while (dirs.length > 0) {
      loops.push(walkLoop(edgeMap, W, startKey));
    }
  }
  return loops;
}

/**
 * Follows edges from a start vertex until the loop closes. At vertices where
 * two boundaries meet (diagonally-touching pixels), the sharpest right turn
 * is preferred, which keeps diagonal regions as separate loops.
 */
function walkLoop(edgeMap, W, startKey) {
  const startX = startKey % W;
  const startY = (startKey - startX) / W;
  const startDir = edgeMap.get(startKey).pop();

  const points = [[startX, startY]];
  let dir = startDir;
  let x = startX + DIRS[dir][0];
  let y = startY + DIRS[dir][1];

  while (x !== startX || y !== startY) {
    const candidates = edgeMap.get(y * W + x);
    let next = -1;
    for (const pref of [(dir + 1) % 4, dir, (dir + 3) % 4]) {
      const at = candidates.indexOf(pref);
      if (at !== -1) {
        next = pref;
        candidates.splice(at, 1);
        break;
      }
    }
    if (next !== dir) points.push([x, y]);
    dir = next;
    x += DIRS[dir][0];
    y += DIRS[dir][1];
  }

  // If the loop closes traveling in its opening direction, the start vertex
  // sits mid-segment and is collinear — drop it.
  if (dir === startDir) points.shift();
  return points;
}

/**
 * Ramer–Douglas–Peucker simplification adapted to closed loops. Tolerance is
 * the maximum perpendicular deviation (in pixels) a removed point may have.
 *
 * @param {Array<[number, number]>} points - Closed loop (start not repeated)
 * @param {number} tolerance
 * @returns {Array<[number, number]>}
 */
export function simplifyLoop(points, tolerance) {
  if (tolerance <= 0 || points.length <= 3) return points.map((p) => [...p]);

  // Anchor at points[0] and the point farthest from it, then simplify the
  // two open chains between the anchors.
  let far = 0;
  let best = -1;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[0][0];
    const dy = points[i][1] - points[0][1];
    const d = dx * dx + dy * dy;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const first = rdp(points.slice(0, far + 1), tolerance);
  const second = rdp([...points.slice(far), points[0]], tolerance);
  const out = [...first.slice(0, -1), ...second.slice(0, -1)];
  if (out.length >= 3) return out;

  // Degenerate result — keep the widest triangle instead of collapsing.
  let extra = -1;
  let bestDist = -1;
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === far) continue;
    const d = perpendicularDistance(points[i], points[0], points[far]);
    if (d > bestDist) {
      bestDist = d;
      extra = i;
    }
  }
  const [a, b] = extra < far ? [extra, far] : [far, extra];
  return [points[0], points[a], points[b]].map((p) => [...p]);
}

/** Iterative RDP over an open chain; endpoints are always kept. */
function rdp(chain, tolerance) {
  const keep = new Uint8Array(chain.length);
  keep[0] = 1;
  keep[chain.length - 1] = 1;
  const stack = [[0, chain.length - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop();
    let split = -1;
    let maxDist = tolerance;
    for (let i = lo + 1; i < hi; i++) {
      const d = perpendicularDistance(chain[i], chain[lo], chain[hi]);
      if (d > maxDist) {
        maxDist = d;
        split = i;
      }
    }
    if (split !== -1) {
      keep[split] = 1;
      stack.push([lo, split], [split, hi]);
    }
  }
  return chain.filter((_, i) => keep[i] === 1);
}

/** Distance from point p to the line segment (a, b). */
function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.sqrt(lengthSq);
}
