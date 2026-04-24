# CLAUDE.md — `@ai-arcade/news-digest`

**CI-only** agent engine. Not a browser app, not a Node library —
a prompt file plus a JSON schema consumed by a scheduled Claude Code
GitHub Action in a separate private repo. See root
[`REPO_MAP.md`](../../../REPO_MAP.md) and the long-form explanation in
[`README.md`](README.md).

## Purpose and scope

- **Does:** specify (a) how Claude Code should fetch/summarize items
  from Reddit and Hacker News (via `PROMPT.md`) and (b) the valid
  shape of `sources.json` (via `sources.schema.json`).
- **Does NOT:** run in a browser; have a Node build; have a dev server;
  ship any runtime code. The CI workflow lives in the consumer's
  private repo (copied from `workflow.example.yml`).

## Run, test, lint, build

```bash
# Tests (schema shape check against the example config)
npx vitest run apps/node/news-digest/src/__tests__/config.test.js

# Lint / format (from repo root)
npm run lint
npm run format:check

# No dev server. No build step. There is nothing to run locally.
# End-to-end exercise happens only inside the private consumer repo
# via the scheduled GitHub Action.
```

## Key files

| File                          | Role                                                 |
|-------------------------------|------------------------------------------------------|
| `PROMPT.md`                   | The agent instructions used by Claude Code in CI.    |
| `sources.schema.json`         | JSON schema for `sources.json`. Single source of truth for allowed source types. |
| `sources.example.json`        | Runnable example config, tested in `config.test.js`. |
| `workflow.example.yml`        | GitHub Actions workflow template for the consumer.   |
| `README.md`                   | Setup guide for creating your private consumer repo. |
| `src/__tests__/config.test.js`| Validates `sources.example.json` against the schema. |
| `package.json`                | Minimal. No `dev`/`build`/`start`.                   |

## Boundary rules

- **Owns:** the on-disk formats (`sources.json`, daily digest markdown
  filenames), the prompt contract with Claude Code, and the
  `sources.schema.json` schema.
- **Consumes:** nothing inside this repo at runtime. At "runtime" (CI
  of the consumer repo) it consumes Claude Code's built-in `WebFetch`,
  Reddit JSON API, HN Firebase API.
- **Must never import:** from any other workspace. Anything you add
  here should remain pure configuration/markdown + JSON.
- **Must never:** assume anything about the consumer repo's directory
  layout beyond what `workflow.example.yml` specifies (`./data` +
  `./engine`).

## Sharp edges

- **Not runnable here.** Any "does it work?" check happens only in the
  consumer repo's CI after a `push` to `main`. Treat schema tests as
  the primary guard.
- **Two files must stay in sync.** Adding a new source type requires
  editing `sources.schema.json`, `PROMPT.md`, `sources.example.json`,
  *and* `src/__tests__/config.test.js`. Miss one and the consumer's CI
  starts failing silently (or producing empty digests). See
  `README.md:69-78`.
- **No secret lives in this repo.** The OAuth token
  (`CLAUDE_CODE_OAUTH_TOKEN`) is configured in the consumer's private
  repo secrets — do not mention or commit it here.
- **Naming inconsistency:** package is `@ai-arcade/news-digest` even
  though it's not a game or arcade component. See
  [IMPROVEMENTS.md](../../../IMPROVEMENTS.md) item 1 for the scope
  discussion.

## Extraction status

**Ready to extract.** No imports into or out of the repo. The only
reason it lives here is to piggyback on shared lint/format/test
tooling (the README calls this out at `README.md:80`). Extraction cost:
one new small repo + a duplicated ESLint/Prettier/Vitest config.

## When working here

- **Do** update all four touchpoints (schema, prompt, example, test)
  when adding a source type. The checklist in
  `README.md` §"Adding a new source type" is authoritative.
- **Do** keep `PROMPT.md` imperative and runnable by an LLM — it is
  literally the program.
- **Do** add a `$schema` pointer in `sources.example.json` if you want
  editor-side validation (IMPROVEMENTS.md item 40).
- **Avoid** adding runtime JS here. If you need code, this package is
  the wrong home; a real Node package under `apps/node/` should live
  alongside, not replace this one.
- **Avoid** assuming the consumer checks out this repo at a particular
  path. The template wires `./engine` — anything else is a breaking
  change to the contract.
