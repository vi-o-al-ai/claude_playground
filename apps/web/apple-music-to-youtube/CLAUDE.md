# Apple Music → YouTube

Converts an exported Apple Music playlist into a playlist on the user's own
YouTube account. Vite dev port: 3012.

## Why it is import-based

Reading a real Apple Music library needs a MusicKit developer token, which can
only be signed with a private key from a paid Apple Developer Program
membership. Rather than gate the app behind that, the user exports the playlist
(`File → Library → Export Playlist…`, a UTF-16LE tab-separated file) or pastes
`Title - Artist` lines. `src/parser.js` is the seam a live MusicKit source
would plug into later: anything that produces `{title, artist, album,
durationSec}` works with the rest of the pipeline.

## Modules

- `parser.js` — Apple Music TSV export (with UTF-16 BOM handling), CSV, and
  freeform lines. Title-first lists split on the _last_ `-` so hyphenated
  titles survive; artist-first splits on the first.
- `query.js` — strips release-only noise (remaster/deluxe/bonus tags) while
  keeping qualifiers that change the recording (live, acoustic, remix), pulls
  out `feat.` credits, and builds the search string.
- `match.js` — scores candidates on title/artist/duration, bonuses for
  `- Topic` channels and "official" uploads, penalties for covers, karaoke,
  nightcore, hour loops and so on. A penalty only applies when the candidate
  says it and the source track does not.
- `youtube.js` — Data API v3 client. Charges quota _before_ the request,
  because YouTube bills failed calls too.
- `convert.js` — per-track orchestration; stops cleanly on quota/auth/abort and
  reports `resumeIndex`.
- `auth.js` — Google Identity Services token client. A static site cannot hold
  a client secret, so this is the implicit flow: ~1 hour token, no refresh.
- `storage.js` — settings and resumable job state. Access tokens are
  deliberately never persisted.

## Quota is the real constraint

The free YouTube quota is 10,000 units/day. Each track costs 100 (search) + 1
(durations) + 50 (insert) = 151 units, so roughly **65 tracks/day**. Longer
playlists are expected to stop mid-run; the job is saved to `localStorage` and
resumed after the quota resets (midnight Pacific). Do not "fix" a conversion
that stops at ~65 tracks — that is the API, not a bug.

## Setup the user must do once

A Google Cloud project with the YouTube Data API v3 enabled and an OAuth
**Web application** client whose authorised JavaScript origin matches wherever
the app is served. The client ID is pasted into the UI and kept in
`localStorage`; no client secret is involved.
