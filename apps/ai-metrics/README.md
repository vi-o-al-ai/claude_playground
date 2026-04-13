# ai-metrics

> A browser-based dashboard for tracking your progress using Claude and other AI models. Vanilla JS + Vite, fully client-side, data persisted to `localStorage`.

Log the sessions you have with AI models (Claude, GPT, Gemini, etc.), then review aggregates — time spent, token and cost totals, streaks, week-over-week deltas, and breakdowns by model and category. Nothing is sent to a server; everything lives in your browser.

## Running locally

```bash
npm run dev --workspace apps/ai-metrics
```

Vite starts on [http://localhost:3010/](http://localhost:3010/) and auto-opens your browser. On first load the dashboard is empty — click **"Load sample"** in the header to populate it with ~13 fake sessions spread across the last two weeks so every chart has something to render. Or just start logging real sessions with the "Log a session" form.

## Features

**Summary cards** (top of page)

- **Total sessions** — lifetime count, with this-week count as a sub-stat
- **Time logged** — lifetime minutes formatted as hours/minutes
- **Day streak** — consecutive days with at least one session, allowing the streak to end at yesterday if today is empty
- **Week over week** — percent change in session count between the trailing 7 days and the 7 days before that
- **Avg rating** — mean of user-provided 1–5 ratings (only rated sessions are counted)
- **Total cost** — sum of per-session USD costs, with total token count as a sub-stat

**Charts**

- **Activity** — 30-day rolling SVG bar chart of sessions per day
- **By model** — horizontal bars of minutes spent per model, top 8
- **By category** — horizontal bars of minutes spent per category, top 8
- **Top tags** — tag cloud showing the 12 most-used tags

**Sessions table** — every logged session with filters for model, category, and a free-text search across notes and tags. Each row has a Delete button.

**Header actions** — Export (download all sessions as JSON), Import (replace current data with a JSON file), Load sample (append demo data), Reset (clear everything).

## Session data model

Every entry is normalized through `createSession()` in `src/metrics.js:29` into this shape:

| Field              | Type          | Notes                                             |
| ------------------ | ------------- | ------------------------------------------------- |
| `id`               | string        | Auto-generated if missing                         |
| `timestamp`        | number (ms)   | Defaults to `Date.now()`                          |
| `model`            | string        | Free text, e.g. `claude-opus-4-6`, `gpt-4o`       |
| `category`         | string        | `coding`, `writing`, `research`, `analysis`, etc. |
| `durationMinutes`  | number ≥ 0    | How long the session lasted                       |
| `promptTokens`     | number ≥ 0    | Optional                                          |
| `completionTokens` | number ≥ 0    | Optional                                          |
| `cost`             | number ≥ 0    | USD                                               |
| `rating`           | 1–5 or `null` | `null` means "not rated"                          |
| `notes`            | string        | Free-form                                         |
| `tags`             | string[]      | Lowercased, comma-separated in the form           |

Invalid numeric fields are coerced to `0`. Missing strings fall back to sensible defaults (`"unknown"` for model, `"other"` for category).

## Persistence

Sessions are serialized to `localStorage` under the key `ai_metrics_dashboard_v1`. To inspect or wipe the store manually:

```js
// DevTools console
JSON.parse(localStorage.getItem("ai_metrics_dashboard_v1"));
localStorage.removeItem("ai_metrics_dashboard_v1");
```

Use **Export** from the header to download a JSON backup, and **Import** to restore it on another machine or browser.

## Architecture

- **`src/metrics.js`** — pure engine. No DOM, no storage, no side effects. All aggregation functions (`computeSummary`, `groupByModel`/`Category`/`Day`, `computeStreak`, `computeWeekOverWeek`, `topTags`) take a session array and return derived data. Fully unit-tested.
- **`src/main.js`** — UI controller. Handles localStorage, form events, filters, rendering, and sample/import/export.
- **`index.html` + `style.css`** — static shell and theme.

Tests live in `src/__tests__/metrics.test.js` and run via the root `npm run test`. The engine is the trusted source of truth for every number shown on the dashboard, so if a metric looks wrong, start with the corresponding test.

## Tips

- **Tag aggressively.** Tags are the only freeform axis for searching sessions later. `frontend`, `bug`, `refactor`, `learning`, and project names all work well.
- **Rate for signal, not perfectionism.** The avg rating card is most useful when you rate consistently. Skip ratings on sessions where quality doesn't matter (quick edits, tool calls) — `null` ratings are excluded from the average.
- **Treat duration as wall-clock, not active.** It's easier to log "I spent 45 minutes on this" than to stopwatch every prompt.
- **Export weekly.** LocalStorage is durable but not backed up. A weekly JSON export to cloud storage or a git repo gives you safety and a long-term archive.
