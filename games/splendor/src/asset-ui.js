/**
 * Art customizer overlay for Splendor.
 *
 * Renders three tabs inside #art-customizer-overlay:
 *   1. Library  — upload images, rename, delete, toggle "Hide HUD".
 *                 Also hosts the prominent "Import bundle file" and
 *                 "Load demo preset" actions.
 *   2. Mapping — every customizable piece is shown with its current
 *                 mapped asset; clicking opens a picker grid.
 *   3. Bundle  — export, import, load preset, clear all.
 *
 * Invoked from the lobby and top-bar "Customize Art" buttons via
 * window.showArtCustomizer(), which is wired in ui.js.
 */

import {
  TIER1_CARDS,
  TIER2_CARDS,
  TIER3_CARDS,
  NOBLES,
  GEM_COLORS,
  GEM_HEX,
  PIECE_IDS,
} from "./engine.js";

let overlayEl = null;
let bodyEl = null;
let activeTab = "library";
let store = null;
let unsubChange = null;
let escHandler = null;

export function initArtCustomizer(assetStore) {
  store = assetStore;
  overlayEl = document.getElementById("art-customizer-overlay");
  bodyEl = document.getElementById("art-customizer-body");
  if (!overlayEl || !bodyEl) {
    console.warn("Art customizer overlay elements not found");
    return;
  }

  window._showArtCustomizer = openOverlay;
  window.hideArtCustomizer = closeOverlay;

  // Close on backdrop click.
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) closeOverlay();
  });
}

function openOverlay() {
  if (!overlayEl) return;
  overlayEl.classList.add("active");
  rerender();
  if (!unsubChange && store) {
    unsubChange = store.onChange(() => {
      if (overlayEl.classList.contains("active")) rerender();
    });
  }
  if (!escHandler) {
    escHandler = (e) => {
      if (e.key === "Escape" && overlayEl.classList.contains("active")) closeOverlay();
    };
    document.addEventListener("keydown", escHandler);
  }
}

function closeOverlay() {
  if (!overlayEl) return;
  overlayEl.classList.remove("active");
  if (unsubChange) {
    unsubChange();
    unsubChange = null;
  }
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
}

function rerender() {
  bodyEl.innerHTML = "";

  // Header with title + close button.
  const header = document.createElement("div");
  header.className = "art-customizer-header";
  const title = document.createElement("h2");
  title.textContent = "🎨 Customize Art";
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.onclick = closeOverlay;
  header.append(title, closeBtn);
  bodyEl.appendChild(header);

  // Tabs.
  const tabs = document.createElement("div");
  tabs.className = "art-tabs";
  for (const key of ["library", "mapping", "bundle"]) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "art-tab" + (activeTab === key ? " active" : "");
    tab.textContent = key[0].toUpperCase() + key.slice(1);
    tab.onclick = () => {
      activeTab = key;
      rerender();
    };
    tabs.appendChild(tab);
  }
  bodyEl.appendChild(tabs);

  const tabBody = document.createElement("div");
  tabBody.className = "art-tab-body";
  bodyEl.appendChild(tabBody);

  if (activeTab === "library") renderLibrary(tabBody);
  else if (activeTab === "mapping") renderMapping(tabBody);
  else if (activeTab === "bundle") renderBundle(tabBody);
}

// --------------------------------------------------------------------
// Library tab
// --------------------------------------------------------------------

function renderLibrary(container) {
  const actions = document.createElement("div");
  actions.className = "art-actions-row";

  const uploadLabel = document.createElement("label");
  uploadLabel.className = "art-file-btn primary";
  uploadLabel.textContent = "📁 Upload Images";
  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.accept = "image/*";
  uploadInput.multiple = true;
  uploadInput.onchange = async () => {
    for (const file of uploadInput.files) {
      try {
        // 2048 px preserves detail on body backgrounds and large card art
        // without exploding IndexedDB or the online-broadcast payload.
        await store.addAsset(file.name, file, { maxDim: 2048 });
      } catch (err) {
        alert("Failed to add " + file.name + ": " + err.message);
      }
    }
    uploadInput.value = "";
  };
  uploadLabel.appendChild(uploadInput);

  const importBundleLabel = document.createElement("label");
  importBundleLabel.className = "art-file-btn";
  importBundleLabel.textContent = "📦 Import Bundle File";
  const importBundleInput = document.createElement("input");
  importBundleInput.type = "file";
  importBundleInput.accept = "application/json,.json";
  importBundleInput.onchange = async () => {
    const file = importBundleInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const replace = confirm(
        "Replace your current library with this bundle?\n\nOK = Replace (wipes current library)\nCancel = Merge (keeps both)",
      );
      await store.importBundle(bundle, { replace });
    } catch (err) {
      alert("Failed to import bundle: " + err.message);
    }
    importBundleInput.value = "";
  };
  importBundleLabel.appendChild(importBundleInput);

  const demoBtn = document.createElement("button");
  demoBtn.type = "button";
  demoBtn.textContent = "✨ Load Demo Preset";
  demoBtn.onclick = loadDemoPreset;

  actions.append(uploadLabel, importBundleLabel, demoBtn);
  container.appendChild(actions);

  // Grid.
  (async () => {
    const assets = await store.listAssets();
    if (assets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "art-library-empty";
      empty.textContent = "Your library is empty. Upload images or import a bundle to get started.";
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "art-library-grid";
    for (const asset of assets) {
      const tile = document.createElement("div");
      tile.className = "art-library-tile";

      const img = document.createElement("img");
      const url = store.getAssetUrl(asset.id);
      if (url) img.src = url;
      img.alt = asset.name;
      tile.appendChild(img);

      const hudBtn = document.createElement("button");
      hudBtn.type = "button";
      hudBtn.className = "art-hide-hud" + (asset.hideDefaultHud ? " active" : "");
      hudBtn.textContent = asset.hideDefaultHud ? "HUD off" : "HUD on";
      hudBtn.title = "Toggle whether the default card HUD is hidden when this art is used";
      hudBtn.onclick = (e) => {
        e.stopPropagation();
        store.updateAsset(asset.id, { hideDefaultHud: !asset.hideDefaultHud });
      };
      tile.appendChild(hudBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "art-delete";
      delBtn.textContent = "×";
      delBtn.title = "Delete asset";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${asset.name}"?`)) {
          await store.removeAsset(asset.id);
        }
      };
      tile.appendChild(delBtn);

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "art-name";
      nameInput.value = asset.name;
      nameInput.onclick = (e) => e.stopPropagation();
      nameInput.onchange = () => {
        store.updateAsset(asset.id, { name: nameInput.value || "untitled" });
      };
      tile.appendChild(nameInput);

      grid.appendChild(tile);
    }
    container.appendChild(grid);
  })();
}

// --------------------------------------------------------------------
// Mapping tab
// --------------------------------------------------------------------

function renderMapping(container) {
  // Hint.
  const hint = document.createElement("div");
  hint.style.cssText = "margin-bottom:12px;font-size:0.85rem;color:rgba(255,255,255,0.6);";
  hint.textContent =
    "Click a piece to assign one of your uploaded images. A coloured dot means the piece has custom art.";
  container.appendChild(hint);

  renderMappingGroup(container, "Tier 1 Cards", TIER1_CARDS.map(cardPiece));
  renderMappingGroup(container, "Tier 2 Cards", TIER2_CARDS.map(cardPiece));
  renderMappingGroup(container, "Tier 3 Cards", TIER3_CARDS.map(cardPiece));
  renderMappingGroup(container, "Nobles", NOBLES.map(noblePiece));
  renderMappingGroup(
    container,
    "Gem Tokens",
    [...GEM_COLORS, "gold"].map((c) => ({
      id: `gem:${c}`,
      label: c,
      swatchBg: GEM_HEX[c],
    })),
  );
  renderMappingGroup(
    container,
    "Deck Piles",
    PIECE_IDS.decks.map((id) => ({
      id,
      label: id.replace("deck:", "Deck ").toUpperCase(),
      swatchBg: "rgba(255,255,255,0.1)",
    })),
  );
  renderMappingGroup(container, "Background", [
    {
      id: PIECE_IDS.background,
      label: "Body",
      swatchBg: "linear-gradient(135deg,#0f0c29,#24243e)",
    },
  ]);
}

function cardPiece(card) {
  return {
    id: card.id,
    label: `T${card.tier} ${card.bonus}${card.points > 0 ? ` (${card.points}pt)` : ""}`,
    swatchBg: GEM_HEX[card.bonus] + "55",
  };
}

function noblePiece(noble) {
  return {
    id: noble.id,
    label: `Noble ${noble.id.replace("noble:", "#")}`,
    swatchBg: "rgba(255,215,0,0.3)",
  };
}

function renderMappingGroup(container, title, pieces) {
  const group = document.createElement("div");
  group.className = "art-mapping-group";

  const h3 = document.createElement("h3");
  h3.textContent = `${title} (${pieces.length})`;
  group.appendChild(h3);

  const row = document.createElement("div");
  row.className = "art-mapping-row";

  for (const piece of pieces) {
    const el = document.createElement("div");
    el.className = "art-mapping-piece";
    const mappedAssetId = store.getMapping(piece.id);
    if (mappedAssetId) el.classList.add("mapped");

    const swatch = document.createElement("div");
    swatch.className = "art-piece-swatch";
    const mappedUrl = store.getUrlForPiece(piece.id);
    if (mappedUrl) {
      swatch.style.backgroundImage = `url("${mappedUrl}")`;
    } else {
      swatch.style.background = piece.swatchBg || "#333";
    }
    el.appendChild(swatch);

    const label = document.createElement("span");
    label.textContent = piece.label;
    el.appendChild(label);

    el.onclick = () => openPicker(piece);
    row.appendChild(el);
  }

  group.appendChild(row);
  container.appendChild(group);
}

async function openPicker(piece) {
  const assets = await store.listAssets();
  if (assets.length === 0) {
    alert("Your library is empty. Upload some images in the Library tab first.");
    return;
  }

  // Build a simple picker modal inside the overlay.
  const picker = document.createElement("div");
  picker.style.cssText =
    "position:fixed;inset:0;z-index:11000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);";
  const card = document.createElement("div");
  card.style.cssText =
    "background:linear-gradient(135deg,#1a1545,#2d2460);padding:20px;border-radius:12px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.15);";

  const h = document.createElement("h3");
  h.textContent = `Pick art for: ${piece.label}`;
  h.style.cssText = "margin:0 0 12px;color:#a8e6cf;";
  card.appendChild(h);

  const grid = document.createElement("div");
  grid.className = "art-library-grid";

  // "None" tile to clear the mapping.
  const noneTile = document.createElement("div");
  noneTile.className = "art-library-tile";
  noneTile.style.cssText =
    "display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:rgba(255,255,255,0.7);cursor:pointer;";
  noneTile.textContent = "— Clear —";
  noneTile.onclick = () => {
    store.setMapping(piece.id, null);
    picker.remove();
  };
  grid.appendChild(noneTile);

  for (const asset of assets) {
    const tile = document.createElement("div");
    tile.className = "art-library-tile";
    tile.style.cursor = "pointer";
    const img = document.createElement("img");
    const url = store.getAssetUrl(asset.id);
    if (url) img.src = url;
    img.alt = asset.name;
    tile.appendChild(img);
    const name = document.createElement("div");
    name.className = "art-name";
    name.textContent = asset.name;
    tile.appendChild(name);
    tile.onclick = () => {
      store.setMapping(piece.id, asset.id);
      picker.remove();
    };
    grid.appendChild(tile);
  }
  card.appendChild(grid);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = "margin-top:12px;";
  cancelBtn.onclick = () => picker.remove();
  card.appendChild(cancelBtn);

  picker.appendChild(card);
  picker.onclick = (e) => {
    if (e.target === picker) picker.remove();
  };
  document.body.appendChild(picker);
}

// --------------------------------------------------------------------
// Bundle tab
// --------------------------------------------------------------------

function renderBundle(container) {
  const intro = document.createElement("div");
  intro.style.cssText = "margin-bottom:16px;font-size:0.85rem;color:rgba(255,255,255,0.7);";
  intro.textContent =
    "A bundle packages all your uploaded images and piece mappings into a single JSON file you can share or back up.";
  container.appendChild(intro);

  const actions = document.createElement("div");
  actions.className = "art-actions-row";

  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "primary";
  exportBtn.textContent = "⬇ Export Bundle (JSON)";
  exportBtn.onclick = exportBundleToFile;

  const importLabel = document.createElement("label");
  importLabel.className = "art-file-btn";
  importLabel.textContent = "⬆ Import Bundle";
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.onchange = async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const replace = confirm(
        "Replace your current library with this bundle?\n\nOK = Replace\nCancel = Merge",
      );
      await store.importBundle(bundle, { replace });
      alert("Bundle imported.");
    } catch (err) {
      alert("Failed to import bundle: " + err.message);
    }
    importInput.value = "";
  };
  importLabel.appendChild(importInput);

  const demoBtn = document.createElement("button");
  demoBtn.type = "button";
  demoBtn.textContent = "✨ Load Demo Preset";
  demoBtn.onclick = loadDemoPreset;

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "danger";
  clearBtn.textContent = "🗑 Clear All";
  clearBtn.onclick = async () => {
    if (confirm("Delete ALL custom art and mappings? This cannot be undone.")) {
      await store.clearAll();
    }
  };

  actions.append(exportBtn, importLabel, demoBtn, clearBtn);
  container.appendChild(actions);
}

async function exportBundleToFile() {
  const bundle = await store.exportBundle();
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `splendor-art-bundle-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadDemoPreset() {
  try {
    // Vite resolves this relative to the source file at build time.
    const mod = await import("./presets/demo-bundle.json");
    const bundle = mod.default || mod;
    const replace = confirm(
      "Load the demo preset?\n\nOK = Replace your current library\nCancel = Merge into your existing library",
    );
    await store.importBundle(bundle, { replace });
  } catch (err) {
    alert("Failed to load demo preset: " + err.message);
  }
}
