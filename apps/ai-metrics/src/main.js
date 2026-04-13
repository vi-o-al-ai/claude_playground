/**
 * AI Metrics Dashboard — UI controller.
 *
 * Responsibilities:
 *   - Persist sessions to localStorage
 *   - Wire form submit, filters, import/export, reset, sample loader
 *   - Render summary cards, charts, and the session table whenever state changes
 *
 * All statistics come from the pure metrics engine in ./metrics.js.
 */
import {
  createSession,
  computeSummary,
  groupByModel,
  groupByCategory,
  groupByDay,
  computeStreak,
  computeWeekOverWeek,
  topTags,
  toIsoDay,
} from "./metrics.js";

const STORAGE_KEY = "ai_metrics_dashboard_v1";
const CHART_COLORS = ["#58a6ff", "#a371f7", "#3fb950", "#f0883e", "#e685b5", "#79c0ff"];

// ---------- state ----------

let sessions = loadSessions();
const filters = { model: "", category: "", search: "" };

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => createSession(s));
  } catch {
    return [];
  }
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function addSession(partial) {
  sessions.push(createSession(partial));
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  saveSessions();
  render();
}

function deleteSession(id) {
  sessions = sessions.filter((s) => s.id !== id);
  saveSessions();
  render();
}

// ---------- helpers ----------

function formatDateTimeLocal(ts) {
  // For <input type="datetime-local"> — local timezone, no seconds.
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocal(value) {
  // Returns ms epoch or NaN.
  if (!value) return NaN;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatHours(totalMinutes) {
  if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatCost(n) {
  return `$${n.toFixed(2)}`;
}

function formatRating(r) {
  return r > 0 ? `${r.toFixed(1)}★` : "—";
}

function formatDeltaPct(pct) {
  if (!Number.isFinite(pct)) return "";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text === null || text === undefined ? "" : String(text);
  return div.innerHTML;
}

function parseTags(input) {
  return input
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function applyFilters(list) {
  const needle = filters.search.trim().toLowerCase();
  return list.filter((s) => {
    if (filters.model && s.model !== filters.model) return false;
    if (filters.category && s.category !== filters.category) return false;
    if (needle) {
      const hay = `${s.notes} ${s.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

// ---------- rendering ----------

function renderSummaryCards(now) {
  const summary = computeSummary(sessions);
  const streak = computeStreak(sessions, now);
  const wow = computeWeekOverWeek(sessions, now);
  const wowArrow = wow.percentChangeCount >= 0 ? "up" : "down";

  const cards = [
    {
      label: "Total sessions",
      value: String(summary.totalSessions),
      delta: `${wow.current.count} this week`,
      deltaClass: "",
    },
    {
      label: "Time logged",
      value: formatHours(summary.totalMinutes),
      delta: `${formatHours(wow.current.minutes)} this week`,
      deltaClass: "",
    },
    {
      label: "Day streak",
      value: `${streak}🔥`,
      delta: streak > 0 ? "keep it up" : "log a session today",
      deltaClass: "",
    },
    {
      label: "Week over week",
      value: formatDeltaPct(wow.percentChangeCount),
      delta: `${wow.previous.count} prior → ${wow.current.count} now`,
      deltaClass: wowArrow,
    },
    {
      label: "Avg rating",
      value: formatRating(summary.averageRating),
      delta: `${summary.ratedCount}/${summary.totalSessions} rated`,
      deltaClass: "",
    },
    {
      label: "Total cost",
      value: formatCost(summary.totalCost),
      delta: `${formatNumber(summary.totalTokens)} tokens`,
      deltaClass: "",
    },
  ];

  const container = document.getElementById("summary-cards");
  container.innerHTML = cards
    .map(
      (c) => `
      <div class="summary-card">
        <span class="label">${escapeHtml(c.label)}</span>
        <span class="value">${escapeHtml(c.value)}</span>
        <span class="delta ${c.deltaClass}">${escapeHtml(c.delta)}</span>
      </div>
    `,
    )
    .join("");
}

function renderActivityChart(now) {
  const container = document.getElementById("chart-activity");
  const grouped = groupByDay(sessions);
  const byDay = new Map(grouped.map((d) => [d.day, d]));

  // Always show a rolling 30-day window ending today.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const ts = now - i * DAY_MS;
    const key = toIsoDay(ts);
    const bucket = byDay.get(key) || { day: key, count: 0, minutes: 0 };
    days.push(bucket);
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const width = 600;
  const height = 160;
  const padding = { top: 12, right: 8, bottom: 24, left: 24 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = chartW / days.length;

  const bars = days
    .map((d, i) => {
      const h = (d.count / maxCount) * chartH;
      const x = padding.left + i * barW + 1;
      const y = padding.top + (chartH - h);
      const label = `${d.day}: ${d.count} session${d.count === 1 ? "" : "s"}`;
      return `<rect class="bar-day" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(barW - 2).toFixed(2)}" height="${h.toFixed(2)}" rx="1"><title>${escapeHtml(label)}</title></rect>`;
    })
    .join("");

  // X-axis labels at ~5 positions
  const xLabels = [
    0,
    Math.floor(days.length / 4),
    Math.floor(days.length / 2),
    Math.floor((days.length * 3) / 4),
    days.length - 1,
  ]
    .map((i) => {
      const d = days[i];
      const parts = d.day.split("-");
      const label = `${parts[1]}/${parts[2]}`;
      const x = padding.left + i * barW + barW / 2;
      return `<text class="axis-label" x="${x.toFixed(2)}" y="${height - 6}" text-anchor="middle">${label}</text>`;
    })
    .join("");

  // Y-axis gridlines at 0, mid, max
  const yMid = padding.top + chartH / 2;
  const yBottom = padding.top + chartH;
  const gridlines = `
    <line class="axis-line" x1="${padding.left}" y1="${yBottom}" x2="${width - padding.right}" y2="${yBottom}" />
    <text class="axis-label" x="${padding.left - 4}" y="${padding.top + 4}" text-anchor="end">${maxCount}</text>
    <text class="axis-label" x="${padding.left - 4}" y="${yMid + 3}" text-anchor="end">${Math.round(maxCount / 2)}</text>
    <text class="axis-label" x="${padding.left - 4}" y="${yBottom + 3}" text-anchor="end">0</text>
  `;

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Daily session activity">
      ${gridlines}
      ${bars}
      ${xLabels}
    </svg>
  `;
}

function renderBarGroup(containerId, groups, valueKey, formatter) {
  const container = document.getElementById(containerId);
  if (groups.length === 0) {
    container.innerHTML = `<p class="card-sub">No data yet.</p>`;
    return;
  }
  const max = Math.max(...groups.map((g) => g[valueKey]), 1);
  container.innerHTML = groups
    .slice(0, 8)
    .map((g, i) => {
      const pct = (g[valueKey] / max) * 100;
      const color = CHART_COLORS[i % CHART_COLORS.length];
      return `
        <div class="bar-row">
          <span class="label" title="${escapeHtml(g.key)}">${escapeHtml(g.key)}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct.toFixed(1)}%; background:${color};"></div>
          </div>
          <span class="value">${escapeHtml(formatter(g))}</span>
        </div>
      `;
    })
    .join("");
}

function renderTopTags() {
  const container = document.getElementById("top-tags");
  const tags = topTags(sessions, 12);
  if (tags.length === 0) {
    container.innerHTML = `<p class="card-sub">Add tags when logging sessions to see them here.</p>`;
    return;
  }
  container.innerHTML = tags
    .map(
      (t) =>
        `<span class="tag-chip">${escapeHtml(t.tag)}<span class="count">${t.count}</span></span>`,
    )
    .join("");
}

function renderFilterOptions() {
  const modelSelect = document.getElementById("filter-model");
  const categorySelect = document.getElementById("filter-category");

  const models = [...new Set(sessions.map((s) => s.model))].sort();
  const categories = [...new Set(sessions.map((s) => s.category))].sort();

  modelSelect.innerHTML =
    `<option value="">All models</option>` +
    models.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  modelSelect.value = filters.model;

  categorySelect.innerHTML =
    `<option value="">All categories</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  categorySelect.value = filters.category;
}

function renderSessionsTable() {
  const tbody = document.getElementById("session-tbody");
  const meta = document.getElementById("sessions-meta");

  const filtered = applyFilters(sessions);
  meta.textContent = `${filtered.length} of ${sessions.length} shown`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">No sessions match your filters yet. Log one above or click "Load sample".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((s) => {
      const date = new Date(s.timestamp);
      const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      const tokens = s.promptTokens + s.completionTokens;
      const tagsHtml = s.tags
        .map((t) => `<span class="tag-inline">${escapeHtml(t)}</span>`)
        .join("");
      return `
        <tr data-id="${escapeHtml(s.id)}">
          <td>${escapeHtml(dateStr)}</td>
          <td>${escapeHtml(s.model)}</td>
          <td>${escapeHtml(s.category)}</td>
          <td class="num">${s.durationMinutes}</td>
          <td class="num">${formatNumber(tokens)}</td>
          <td class="num">${formatCost(s.cost)}</td>
          <td class="num">${s.rating === null || s.rating === undefined ? "—" : `${s.rating}★`}</td>
          <td class="notes-cell">${tagsHtml}${escapeHtml(s.notes)}</td>
          <td><button class="btn btn-link" data-action="delete" data-id="${escapeHtml(s.id)}">Delete</button></td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  const now = Date.now();
  renderSummaryCards(now);
  renderActivityChart(now);
  renderBarGroup("chart-models", groupByModel(sessions), "minutes", (g) => formatHours(g.minutes));
  renderBarGroup("chart-categories", groupByCategory(sessions), "minutes", (g) =>
    formatHours(g.minutes),
  );
  renderTopTags();
  renderFilterOptions();
  renderSessionsTable();
}

// ---------- event wiring ----------

function wireForm() {
  const form = document.getElementById("session-form");
  const tsInput = document.getElementById("f-timestamp");
  tsInput.value = formatDateTimeLocal(Date.now());

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const tsValue = parseDateTimeLocal(tsInput.value);
    const timestamp = Number.isFinite(tsValue) ? tsValue : Date.now();

    const duration = parseFloat(document.getElementById("f-duration").value);
    const promptTokens = parseFloat(document.getElementById("f-prompt-tokens").value);
    const completionTokens = parseFloat(document.getElementById("f-completion-tokens").value);
    const cost = parseFloat(document.getElementById("f-cost").value);
    const ratingRaw = document.getElementById("f-rating").value;

    addSession({
      timestamp,
      model: document.getElementById("f-model").value.trim() || "unknown",
      category: document.getElementById("f-category").value,
      durationMinutes: Number.isFinite(duration) ? duration : 0,
      promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
      completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
      cost: Number.isFinite(cost) ? cost : 0,
      rating: ratingRaw === "" ? null : parseInt(ratingRaw, 10),
      notes: document.getElementById("f-notes").value,
      tags: parseTags(document.getElementById("f-tags").value),
    });

    // Keep the form mostly populated for rapid entry, but clear notes/tags
    // and bump the timestamp to now so the next entry is fresh.
    document.getElementById("f-notes").value = "";
    document.getElementById("f-tags").value = "";
    document.getElementById("f-prompt-tokens").value = "";
    document.getElementById("f-completion-tokens").value = "";
    document.getElementById("f-cost").value = "";
    document.getElementById("f-rating").value = "";
    tsInput.value = formatDateTimeLocal(Date.now());
  });
}

function wireTable() {
  document.getElementById("session-tbody").addEventListener("click", (e) => {
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (!target) return;
    if (target.dataset.action === "delete") {
      const id = target.dataset.id;
      if (id && confirm("Delete this session?")) {
        deleteSession(id);
      }
    }
  });
}

function wireFilters() {
  document.getElementById("filter-model").addEventListener("change", (e) => {
    filters.model = e.target.value;
    renderSessionsTable();
  });
  document.getElementById("filter-category").addEventListener("change", (e) => {
    filters.category = e.target.value;
    renderSessionsTable();
  });
  document.getElementById("filter-search").addEventListener("input", (e) => {
    filters.search = e.target.value;
    renderSessionsTable();
  });
}

function wireHeaderButtons() {
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-metrics-${toIsoDay(Date.now())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const importInput = document.getElementById("import-input");
  document.getElementById("btn-import").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          alert("Invalid file: expected a JSON array of sessions.");
          return;
        }
        if (!confirm(`Import ${data.length} sessions? This will replace your current data.`)) {
          return;
        }
        sessions = data.map((s) => createSession(s));
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        saveSessions();
        render();
      } catch {
        alert("Could not parse the file. Make sure it is a valid AI metrics JSON export.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (sessions.length === 0) return;
    if (confirm("Delete all sessions? This cannot be undone.")) {
      sessions = [];
      saveSessions();
      render();
    }
  });

  document.getElementById("btn-sample").addEventListener("click", () => {
    if (
      sessions.length > 0 &&
      !confirm("This will add sample sessions to your existing data. Continue?")
    ) {
      return;
    }
    sessions = sessions.concat(buildSampleSessions());
    sessions.sort((a, b) => b.timestamp - a.timestamp);
    saveSessions();
    render();
  });
}

function buildSampleSessions() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const data = [
    {
      daysAgo: 0,
      hour: 10,
      model: "claude-opus-4-6",
      category: "coding",
      durationMinutes: 45,
      promptTokens: 3200,
      completionTokens: 1800,
      cost: 0.42,
      rating: 5,
      notes: "Refactored metrics engine with tests",
      tags: ["tdd", "refactor"],
    },
    {
      daysAgo: 0,
      hour: 14,
      model: "claude-sonnet-4-6",
      category: "writing",
      durationMinutes: 20,
      promptTokens: 1500,
      completionTokens: 2400,
      cost: 0.18,
      rating: 4,
      notes: "Drafted release notes",
      tags: ["docs"],
    },
    {
      daysAgo: 1,
      hour: 9,
      model: "claude-opus-4-6",
      category: "analysis",
      durationMinutes: 30,
      promptTokens: 4100,
      completionTokens: 2200,
      cost: 0.51,
      rating: 5,
      notes: "Reviewed SQL query plan",
      tags: ["sql", "perf"],
    },
    {
      daysAgo: 1,
      hour: 16,
      model: "gpt-4o",
      category: "brainstorm",
      durationMinutes: 25,
      promptTokens: 800,
      completionTokens: 1500,
      cost: 0.12,
      rating: 3,
      notes: "Product naming session",
      tags: ["product"],
    },
    {
      daysAgo: 2,
      hour: 11,
      model: "claude-opus-4-6",
      category: "coding",
      durationMinutes: 60,
      promptTokens: 5500,
      completionTokens: 3200,
      cost: 0.71,
      rating: 4,
      notes: "Debugged websocket reconnection",
      tags: ["bug", "websocket"],
    },
    {
      daysAgo: 3,
      hour: 13,
      model: "claude-sonnet-4-6",
      category: "research",
      durationMinutes: 40,
      promptTokens: 2800,
      completionTokens: 2100,
      cost: 0.22,
      rating: 4,
      notes: "Compared vector DBs",
      tags: ["research"],
    },
    {
      daysAgo: 4,
      hour: 10,
      model: "claude-opus-4-6",
      category: "coding",
      durationMinutes: 35,
      promptTokens: 3000,
      completionTokens: 1800,
      cost: 0.38,
      rating: 5,
      notes: "Added pagination to API",
      tags: ["api"],
    },
    {
      daysAgo: 5,
      hour: 15,
      model: "gemini-2.5-pro",
      category: "writing",
      durationMinutes: 15,
      promptTokens: 900,
      completionTokens: 1200,
      cost: 0.05,
      rating: 3,
      notes: "Email draft",
      tags: ["email"],
    },
    {
      daysAgo: 6,
      hour: 9,
      model: "claude-opus-4-6",
      category: "learning",
      durationMinutes: 50,
      promptTokens: 2200,
      completionTokens: 3400,
      cost: 0.44,
      rating: 5,
      notes: "Deep dive into Rust lifetimes",
      tags: ["rust", "learning"],
    },
    {
      daysAgo: 8,
      hour: 14,
      model: "claude-sonnet-4-6",
      category: "coding",
      durationMinutes: 25,
      promptTokens: 1500,
      completionTokens: 1100,
      cost: 0.12,
      rating: 4,
      notes: "CSS tweaks",
      tags: ["css"],
    },
    {
      daysAgo: 9,
      hour: 10,
      model: "gpt-4o",
      category: "analysis",
      durationMinutes: 30,
      promptTokens: 2100,
      completionTokens: 1300,
      cost: 0.17,
      rating: 3,
      notes: "Analyzed support tickets",
      tags: ["support"],
    },
    {
      daysAgo: 10,
      hour: 11,
      model: "claude-opus-4-6",
      category: "coding",
      durationMinutes: 55,
      promptTokens: 4000,
      completionTokens: 2500,
      cost: 0.57,
      rating: 5,
      notes: "Wrote migration script",
      tags: ["db", "migration"],
    },
    {
      daysAgo: 12,
      hour: 16,
      model: "claude-opus-4-6",
      category: "research",
      durationMinutes: 20,
      promptTokens: 1800,
      completionTokens: 900,
      cost: 0.2,
      rating: 4,
      notes: "OAuth providers comparison",
      tags: ["auth"],
    },
  ];
  return data.map((d) =>
    createSession({
      ...d,
      timestamp: now - d.daysAgo * DAY + (d.hour - 12) * 3600 * 1000,
    }),
  );
}

// ---------- boot ----------

wireForm();
wireTable();
wireFilters();
wireHeaderButtons();
render();
