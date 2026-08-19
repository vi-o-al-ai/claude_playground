/**
 * Renders the arcade hub's cards from the generated manifest.
 *
 * `manifest.json` is produced by scripts/build-manifest.mjs (wired into this
 * package's `predev` / `prebuild` scripts) from each project's `arcade`
 * metadata. Vite inlines the import at build time, so there is no runtime
 * fetch and no network dependency for the card list.
 *
 * Entry URLs are namespaced (`games/<slug>/`, `apps/<slug>/`) and resolved
 * relative to the hub, which is deployed at the site root.
 */

import manifest from "./manifest.json";

const SECTIONS = {
  games: { section: "games-section", grid: "games-grid" },
  apps: { section: "apps-section", grid: "apps-grid" },
};

/**
 * Builds a single card element for a manifest entry.
 *
 * @param {{ title: string, emoji: string, description: string, url: string }} entry
 * @returns {HTMLAnchorElement}
 */
export function createCard(entry) {
  const card = document.createElement("a");
  card.className = "game-card";
  card.href = `./${entry.url}`;

  const icon = document.createElement("div");
  icon.className = "game-icon";
  icon.textContent = entry.emoji;

  const title = document.createElement("h2");
  title.textContent = entry.title;

  const description = document.createElement("p");
  description.textContent = entry.description;

  card.append(icon, title, description);
  return card;
}

/**
 * Renders every manifest entry into its category's grid, revealing only the
 * sections that actually have cards.
 *
 * @param {Array<object>} entries - Manifest entries
 * @param {Document} [doc] - Document to render into
 */
export function renderManifest(entries, doc = document) {
  for (const { section, grid } of Object.values(SECTIONS)) {
    const gridEl = doc.getElementById(grid);
    if (gridEl) gridEl.replaceChildren();
    const sectionEl = doc.getElementById(section);
    if (sectionEl) sectionEl.hidden = true;
  }

  for (const entry of entries) {
    const ids = SECTIONS[entry.category];
    if (!ids) continue;

    const gridEl = doc.getElementById(ids.grid);
    if (!gridEl) continue;

    gridEl.append(createCard(entry));
    const sectionEl = doc.getElementById(ids.section);
    if (sectionEl) sectionEl.hidden = false;
  }
}

renderManifest(manifest);
