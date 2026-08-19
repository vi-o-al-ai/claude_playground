# News Digest

NOT a browser app. Runs as a Claude Code agent in scheduled GitHub Actions workflows.

## How It Works

1. Reads `sources.json` config (Reddit, Hacker News sources).
2. Fetches and summarizes articles using WebFetch/WebSearch tools.
3. Writes dated markdown digest files.

## Key Files

- `PROMPT.md` -- agent instructions for the CI workflow.
- `sources.schema.json` -- config schema.
- `sources.example.json` -- template config.
- `workflow.example.yml` -- GitHub Actions workflow template.

## Notes

No Vite, no UI, no npm dev/build scripts. Designed to run headless in CI.

`workflow.example.yml` is a template for a **separate private repo** (the one holding your sources and digests) — this repo never runs it. What this repo does run is `ci-web.yml`, which lints and unit-tests this package (`src/__tests__/config.test.js`) along with every other workspace.
