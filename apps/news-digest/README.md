# news-digest

> **Note:** Unlike the other `apps/*` directories, this is **not** a browser app. It has no Vite tooling, no UI, and no `dev` script. It's a set of CI-only engine files (a prompt, a config schema, a workflow template) consumed by a scheduled GitHub Actions workflow running in a separate private repo.

An automated daily news digest. A scheduled GitHub Actions workflow runs [Claude Code](https://github.com/anthropics/claude-code-action) in CI, which reads a `sources.json` config, fetches the top items from each source (subreddits, Hacker News), summarizes them with 1–2 sentence grounded summaries, and commits a dated markdown file back to the repo.

The **engine** (this folder) is public. Your **sources list and generated digests** live in a separate private repo so nothing about what you read is exposed.

## How it works

```
           cron fires in your private repo
                       │
                       ▼
      .github/workflows/daily.yml
                       │
                       ├── checkout YOUR private repo     → ./data
                       ├── checkout claude_playground     → ./engine
                       │
                       ▼
      anthropics/claude-code-action@v1 runs with prompt:
          "Follow ./engine/apps/news-digest/PROMPT.md.
           Config: ./data/sources.json.
           Output: ./data/digests/$(date +%F).md.
           Commit and push."
                       │
                       ▼
      Claude Code agent (in CI):
          1. Reads sources.json
          2. WebFetches each source (Reddit JSON / HN Firebase)
          3. WebFetches article URLs to ground summaries
          4. Writes ./data/digests/YYYY-MM-DD.md
          5. git add, commit, push
```

No Anthropic API key to manage — the workflow authenticates with your existing Claude Code subscription via `CLAUDE_CODE_OAUTH_TOKEN`. No Node fetchers, no SDK, no packaging. The "engine" is literally a prompt file plus a config schema.

## Setting up your private instance

1. **Create a new private GitHub repo** (e.g., `news-digest-private`). Empty is fine.
2. **Copy the workflow template** from this folder into your private repo at `.github/workflows/daily.yml`:
   ```bash
   curl -o .github/workflows/daily.yml \
     https://raw.githubusercontent.com/vi-o-al-ai/claude_playground/main/apps/news-digest/workflow.example.yml
   ```
3. **Copy the example config** into your private repo at the repo root, rename to `sources.json`, and edit it with your real sources:
   ```bash
   curl -o sources.json \
     https://raw.githubusercontent.com/vi-o-al-ai/claude_playground/main/apps/news-digest/sources.example.json
   ```
4. **Set the secret** in your private repo: `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: same token you use for other Claude Code workflows (get one via `claude` CLI if you don't have it)
5. **Grant the workflow write permission** so it can commit the digest back: `Settings → Actions → General → Workflow permissions → Read and write permissions`
6. **Adjust the cron time** in `.github/workflows/daily.yml` to your preferred morning time. The default `0 13 * * *` fires at 13:00 UTC (6:00 AM PT / 9:00 AM ET). Cron runs on UTC — [crontab.guru](https://crontab.guru) is handy for translating.
7. **Trigger a manual run** to verify everything works: `Actions → Daily News Digest → Run workflow`. Check that a new `digests/YYYY-MM-DD.md` file appears in your repo.

Once the first manual run succeeds, the cron takes over and you get a fresh digest every morning.

## Sources config

See `sources.example.json` for a runnable example and `sources.schema.json` for the full shape. MVP supports two source types:

- **`reddit`** — pulls top posts from any public subreddit, with a configurable time window (`day`, `week`, `month`, etc.)
- **`hackernews`** — pulls from HN's `topstories`, `newstories`, or `beststories` lists

Root-level `topN` sets the default item count per source; individual sources can override.

## Adding a new source type

The engine is designed to be extended without code changes. To add a new type (for example, `rss` for blog feeds or `github_releases` for watched repos):

1. Add a discriminated variant to `sources.schema.json`
2. Add a `### Type: {name}` section to `PROMPT.md` describing the fetch URL, the fields to extract, and the section-heading convention
3. Add an example entry to `sources.example.json`
4. Update `src/__tests__/config.test.js` to recognize the new `type` value

Push the change to `main`. The next scheduled run in your private repo picks up the new type automatically (it re-checks out `claude_playground@main` every run).

## Why this lives in `apps/` despite not being a browser app

It's discoverable here, versioned alongside the other projects in this monorepo, and benefits from the repo's shared lint/format/test tooling without needing its own CI pipeline. The Vitest shape test for `sources.example.json` runs in the same `npm run test` everyone else uses. The one-line note at the top of this file disambiguates it from the Vite-based apps.
