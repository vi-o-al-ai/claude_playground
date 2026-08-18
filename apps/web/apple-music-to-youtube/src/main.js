/** UI wiring for the Apple Music -> YouTube playlist converter. */
import { parsePlaylist, decodePlaylistFile } from "./parser.js";
import { estimateQuota, maxTracksWithin, formatQuota, DAILY_QUOTA_UNITS } from "./quota.js";
import { createYouTubeClient } from "./youtube.js";
import { convertPlaylist, withPendingResults } from "./convert.js";
import { createAuthorizer, loadGoogleIdentity, isTokenValid, validateClientId } from "./auth.js";
import { loadSettings, saveSettings, loadJob, saveJob, clearJob } from "./storage.js";

const $ = (id) => document.getElementById(id);

const el = {
  file: $("playlist-file"),
  text: $("playlist-text"),
  order: $("order"),
  importSummary: $("import-summary"),
  importPreview: $("import-preview"),
  stepConnect: $("step-connect"),
  stepConvert: $("step-convert"),
  stepResults: $("step-results"),
  clientId: $("client-id"),
  originHint: $("origin-hint"),
  connectBtn: $("connect-btn"),
  connectState: $("connect-state"),
  playlistName: $("playlist-name"),
  privacy: $("privacy"),
  quotaStats: $("quota-stats"),
  quotaNote: $("quota-note"),
  convertBtn: $("convert-btn"),
  cancelBtn: $("cancel-btn"),
  progress: $("progress"),
  progressLabel: $("progress-label"),
  resultsSummary: $("results-summary"),
  resultsTable: $("results-table"),
  downloadBtn: $("download-btn"),
  resumeBtn: $("resume-btn"),
  discardBtn: $("discard-btn"),
};

const state = {
  tracks: [],
  parse: null,
  token: null,
  running: false,
  signal: { aborted: false },
  lastRun: null,
  savedJob: null,
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const note = (kind, html) => `<p class="note ${kind}">${html}</p>`;

/* ---------------------------------------------------------------- step 1 */

function renderImport() {
  const result = state.parse;
  if (!result || result.tracks.length === 0) {
    el.importSummary.innerHTML =
      result && !result.tracks.length ? note("warn", "No tracks found in that input yet.") : "";
    el.importPreview.innerHTML = "";
    state.tracks = [];
    refreshGates();
    return;
  }

  state.tracks = result.tracks;
  const formatLabel = {
    tsv: "Apple Music export (tab-separated)",
    csv: "CSV export",
    lines: "pasted lines",
  }[result.format];

  const bits = [
    note("ok", `Read <strong>${result.tracks.length}</strong> tracks from your ${formatLabel}.`),
  ];
  if (result.warnings.length) {
    bits.push(
      note(
        "warn",
        `${result.warnings.length} line(s) had no artist and will be searched by title alone — matches there are less reliable.`,
      ),
    );
  }
  if (result.skipped.length) {
    bits.push(note("warn", `${result.skipped.length} line(s) were skipped (no usable title).`));
  }
  el.importSummary.innerHTML = bits.join("");

  const rows = result.tracks
    .map(
      (track, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(track.title)}</td>
        <td>${escapeHtml(track.artist) || '<span style="color:var(--muted)">—</span>'}</td>
        <td>${track.durationSec ? formatDuration(track.durationSec) : ""}</td>
      </tr>`,
    )
    .join("");

  el.importPreview.innerHTML = `<div class="scroll"><table>
      <thead><tr><th>#</th><th>Title</th><th>Artist</th><th>Length</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;

  if (!el.playlistName.value) el.playlistName.value = defaultPlaylistName();
  refreshGates();
}

function defaultPlaylistName() {
  const fileName = el.file.files?.[0]?.name;
  if (fileName) return fileName.replace(/\.[^.]+$/, "");
  return "Apple Music import";
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(seconds % 60).padStart(2, "0")}`;
}

function reparse() {
  state.parse = parsePlaylist(el.text.value, { order: el.order.value });
  renderImport();
}

el.text.addEventListener("input", reparse);
el.order.addEventListener("change", reparse);

el.file.addEventListener("change", async () => {
  const file = el.file.files?.[0];
  if (!file) return;
  try {
    el.text.value = decodePlaylistFile(await file.arrayBuffer());
    el.playlistName.value = defaultPlaylistName();
    reparse();
  } catch (error) {
    el.importSummary.innerHTML = note(
      "bad",
      `Could not read that file: ${escapeHtml(error.message)}`,
    );
  }
});

/* ---------------------------------------------------------------- step 2 */

el.originHint.textContent = window.location.origin;

const settings = loadSettings(localStorage);
el.clientId.value = settings.clientId;
el.privacy.value = settings.privacyStatus;
el.order.value = settings.order;

function updateSettings(patch) {
  saveSettings(localStorage, { ...loadSettings(localStorage), ...patch });
}

el.clientId.addEventListener("change", () => {
  updateSettings({ clientId: el.clientId.value.trim() });
  refreshGates();
});
el.privacy.addEventListener("change", () => updateSettings({ privacyStatus: el.privacy.value }));
el.order.addEventListener("change", () => updateSettings({ order: el.order.value }));

async function connect() {
  const clientId = el.clientId.value.trim();
  if (!validateClientId(clientId)) {
    el.connectState.innerHTML = `<span style="color:var(--bad)">That does not look like a Google client ID.</span>`;
    return false;
  }
  el.connectBtn.disabled = true;
  el.connectState.textContent = "Waiting for Google…";
  try {
    const google = await loadGoogleIdentity();
    const authorizer = createAuthorizer({ clientId, google });
    state.token = await authorizer.requestToken();
    el.connectState.innerHTML = `<span style="color:var(--ok)">Connected.</span>`;
    updateSettings({ clientId });
    refreshGates();
    return true;
  } catch (error) {
    el.connectState.innerHTML = `<span style="color:var(--bad)">${escapeHtml(error.message)}</span>`;
    return false;
  } finally {
    el.connectBtn.disabled = false;
  }
}

el.connectBtn.addEventListener("click", connect);

async function ensureToken() {
  if (isTokenValid(state.token, Date.now())) return true;
  state.token = null;
  refreshGates();
  return connect();
}

/* ---------------------------------------------------------------- step 3 */

function refreshGates() {
  const hasTracks = state.tracks.length > 0;
  const connected = isTokenValid(state.token, Date.now());

  el.stepConnect.dataset.locked = hasTracks ? "false" : "true";
  el.stepConvert.dataset.locked = hasTracks && connected ? "false" : "true";
  el.convertBtn.disabled = !hasTracks || !connected || state.running;

  renderQuota();
}

function renderQuota() {
  if (state.tracks.length === 0) {
    el.quotaStats.innerHTML = "";
    el.quotaNote.innerHTML = "";
    return;
  }
  const units = estimateQuota(state.tracks.length);
  const capacity = maxTracksWithin(DAILY_QUOTA_UNITS);

  el.quotaStats.innerHTML = `
    <div><strong>${state.tracks.length}</strong> tracks to convert</div>
    <div><strong>~${formatQuota(units)}</strong> API units needed</div>
    <div><strong>${formatQuota(DAILY_QUOTA_UNITS)}</strong> free units per day</div>`;

  el.quotaNote.innerHTML =
    units > DAILY_QUOTA_UNITS
      ? note(
          "warn",
          `This playlist needs more than one day of free YouTube quota. About <strong>${capacity}</strong>
           tracks will go through before Google starts refusing requests; the rest is saved and can be
           resumed tomorrow with the button that appears below.`,
        )
      : note(
          "ok",
          `That fits inside a single day of free YouTube quota (${formatQuota(units)} of
           ${formatQuota(DAILY_QUOTA_UNITS)} units).`,
        );
}

el.cancelBtn.addEventListener("click", () => {
  state.signal.aborted = true;
  el.cancelBtn.disabled = true;
  el.progressLabel.textContent = "Stopping after the current track…";
});

el.convertBtn.addEventListener("click", () => runConversion({}));
el.resumeBtn.addEventListener("click", () => {
  const job = state.savedJob;
  if (!job) return;
  runConversion({
    playlistId: job.playlistId,
    startIndex: job.resumeIndex,
    previousResults: job.results,
    tracks: job.tracks,
  });
});
el.discardBtn.addEventListener("click", () => {
  clearJob(localStorage);
  state.savedJob = null;
  el.resumeBtn.classList.add("hidden");
  el.discardBtn.classList.add("hidden");
});

async function runConversion({ playlistId, startIndex = 0, previousResults = [], tracks }) {
  if (!(await ensureToken())) return;

  const trackList = tracks?.length ? tracks : state.tracks;
  state.running = true;
  state.signal = { aborted: false };
  el.convertBtn.disabled = true;
  el.cancelBtn.disabled = false;
  el.cancelBtn.classList.remove("hidden");
  el.progress.classList.remove("hidden");
  el.progress.max = trackList.length;
  el.progress.value = startIndex;
  el.stepResults.classList.remove("hidden");
  el.resumeBtn.classList.add("hidden");

  const client = createYouTubeClient({ accessToken: state.token.accessToken });
  // One array for the whole run: rebuilding it from `previousResults` on each
  // tick would demote tracks this run already converted back to pending.
  const liveResults = withPendingResults(trackList, previousResults);

  try {
    const run = await convertPlaylist({
      tracks: trackList,
      client,
      playlistId,
      playlistTitle: el.playlistName.value.trim() || "Apple Music import",
      description: "Imported from Apple Music",
      privacyStatus: el.privacy.value,
      startIndex,
      previousResults,
      signal: state.signal,
      onProgress: ({ index, total, track, result, quotaUsed, playlistId: livePlaylistId }) => {
        el.progress.value = index + 1;
        el.progressLabel.textContent = `${index + 1} / ${total} — ${track.title} (${result.status}) · ${formatQuota(
          quotaUsed,
        )} units used`;
        liveResults[result.index] = result;
        persistJob({
          playlistId: livePlaylistId,
          tracks: trackList,
          results: liveResults,
          resumeIndex: index + 1,
        });
        renderResults({ playlistId: livePlaylistId, results: liveResults });
      },
    });

    state.lastRun = { ...run, tracks: trackList };
    if (run.completed) {
      clearJob(localStorage);
      state.savedJob = null;
    } else {
      const job = {
        playlistId: run.playlistId,
        playlistUrl: run.playlistUrl,
        tracks: trackList,
        results: run.results,
        resumeIndex: run.resumeIndex,
        stoppedReason: run.stoppedReason,
      };
      saveJob(localStorage, job);
      state.savedJob = job;
    }
    renderResults(state.lastRun);
  } catch (error) {
    el.resultsSummary.innerHTML = note("bad", `Conversion failed: ${escapeHtml(error.message)}`);
  } finally {
    state.running = false;
    el.cancelBtn.classList.add("hidden");
    el.progressLabel.textContent = "";
    refreshGates();
  }
}

function persistJob(job) {
  saveJob(localStorage, job);
  state.savedJob = job;
}

/* -------------------------------------------------------------- results */

function renderResults(run) {
  const results = run?.results || state.savedJob?.results || [];
  if (!results.length) return;

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const playlistUrl = run?.playlistUrl || state.savedJob?.playlistUrl;

  const summary = [];
  if (playlistUrl) {
    summary.push(
      note(
        "ok",
        `Playlist: <a href="${escapeHtml(playlistUrl)}" target="_blank" rel="noopener">open on YouTube</a>`,
      ),
    );
  }
  summary.push(
    `<div class="stat-row">
       <div><strong>${counts.added || 0}</strong> added</div>
       <div><strong>${counts["no-match"] || 0}</strong> no confident match</div>
       <div><strong>${counts.failed || 0}</strong> failed</div>
       <div><strong>${counts.pending || 0}</strong> not yet attempted</div>
     </div>`,
  );

  if (run?.stoppedReason === "quotaExceeded") {
    summary.push(
      note(
        "warn",
        `Your YouTube daily quota ran out. Everything so far is saved — come back after the quota resets
         (midnight Pacific time) and hit <strong>Resume</strong>.`,
      ),
    );
  } else if (run?.stoppedReason === "unauthorized") {
    summary.push(
      note(
        "warn",
        "The YouTube sign-in expired. Reconnect above, then hit <strong>Resume</strong>.",
      ),
    );
  } else if (run?.stoppedReason === "aborted") {
    summary.push(note("warn", "Stopped at your request. Hit <strong>Resume</strong> to carry on."));
  }
  el.resultsSummary.innerHTML = summary.join("");

  if (run?.stoppedReason) {
    el.resumeBtn.classList.remove("hidden");
    el.discardBtn.classList.remove("hidden");
  }

  el.resultsTable.innerHTML = `<div class="scroll"><table>
      <thead><tr><th>#</th><th>Track</th><th>Status</th><th>Matched video</th></tr></thead>
      <tbody>${results.map(resultRow).join("")}</tbody></table></div>`;
}

function resultRow(result) {
  const track = result.track || {};
  const label =
    result.status === "added" && result.confidence !== "high"
      ? `<span class="pill medium">check</span>`
      : `<span class="pill ${result.status}">${result.status.replace("-", " ")}</span>`;

  let detail = "";
  if (result.status === "added") {
    detail = `<a href="https://www.youtube.com/watch?v=${escapeHtml(result.video.videoId)}" target="_blank"
        rel="noopener">${escapeHtml(result.video.title)}</a>
        <div style="color:var(--muted);font-size:0.8rem">${escapeHtml(result.video.channelTitle)} ·
        score ${(result.score ?? 0).toFixed(2)}</div>`;
  } else if (result.status === "no-match") {
    const search = encodeURIComponent(result.query || `${track.title} ${track.artist}`);
    detail = `<a href="https://www.youtube.com/results?search_query=${search}" target="_blank" rel="noopener">
        search YouTube by hand</a>
        <div style="color:var(--muted);font-size:0.8rem">${escapeHtml(result.reason || "")}</div>`;
  } else if (result.status === "failed") {
    detail = `<span style="color:var(--bad)">${escapeHtml(result.error || "")}</span>`;
  }

  return `<tr>
      <td>${result.index + 1}</td>
      <td>${escapeHtml(track.title)}<div style="color:var(--muted);font-size:0.8rem">${escapeHtml(track.artist)}</div></td>
      <td>${label}</td>
      <td>${detail}</td>
    </tr>`;
}

el.downloadBtn.addEventListener("click", () => {
  const results = state.lastRun?.results || state.savedJob?.results || [];
  const csv = [
    ["#", "title", "artist", "status", "video_id", "video_title", "channel", "score"].join(","),
    ...results.map((r) =>
      [
        r.index + 1,
        r.track?.title,
        r.track?.artist,
        r.status,
        r.video?.videoId ?? "",
        r.video?.title ?? "",
        r.video?.channelTitle ?? "",
        r.score?.toFixed(2) ?? "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "apple-music-to-youtube.csv";
  link.click();
  URL.revokeObjectURL(url);
});

/* ------------------------------------------------------------ resume UI */

state.savedJob = loadJob(localStorage);
if (state.savedJob?.tracks?.length) {
  el.stepResults.classList.remove("hidden");
  el.resumeBtn.classList.remove("hidden");
  el.discardBtn.classList.remove("hidden");
  renderResults({ ...state.savedJob, results: state.savedJob.results });
  el.resultsSummary.insertAdjacentHTML(
    "afterbegin",
    note(
      "warn",
      `An unfinished conversion from a previous visit is saved
       (${state.savedJob.resumeIndex} of ${state.savedJob.tracks.length} tracks done).`,
    ),
  );
}

reparse();
refreshGates();
