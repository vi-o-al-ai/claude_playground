# claude_playground

A browser-based arcade of small games and apps, mostly written with [Claude Code](https://claude.com/claude-code). Everything here is static: the whole repo builds into one GitHub Pages site.

**Live site:** https://vi-o-al-ai.github.io/claude_playground/

It is an npm workspaces monorepo, but the interesting part is the tree convention — a project is just a directory in the right place with the right metadata, and the tooling (dev server, CI, deploy, hub listing) picks it up from there.

## Layout

Projects live at `<category>/<stack>/<project>`. The **category** decides where the project lands on the site, the **stack** decides the toolchain, and the **directory name** is the deploy slug.

| Path            | Toolchain                                    | Deploys to           |
| --------------- | -------------------------------------------- | -------------------- |
| `games/web/*`   | Vite + vanilla JS, Vitest                    | `/games/<slug>/`     |
| `games/godot/*` | Godot 4.6 (GDScript), GUT tests              | `/games/<slug>/`     |
| `apps/web/*`    | Vite + vanilla JS, Vitest                    | `/apps/<slug>/`      |
| `apps/node/*`   | Node.js, headless (CI-only)                  | not deployed         |
| `packages/*`    | shared JS libraries (`@ai-arcade/shared-ui`) | consumed by projects |

Two supporting directories sit outside that tree: `scripts/` (repo tooling — the manifest builder, the scaffolder, port derivation — with its own tests) and `templates/` (scaffolds used by `npm run new`).

The stack segment is an authoring detail and never appears in a URL. `games/web/sudoku` and `games/godot/runner` both deploy under `/games/`, which is also why a slug has to be unique within its category. The arcade hub (`games/web/arcade-hub`) is the site root.

## Commands

```bash
npm install                          # link all workspaces

npm run dev -w games/web/sudoku      # dev server for one project
npm run check                        # lint + format check + tests (run before pushing)
npm run build                        # build every project that has a build step
npm run new -- web-game <name>       # scaffold a new project

npm test                             # Vitest across the repo
npx vitest run games/web/sudoku/src/__tests__/engine.test.js   # one file
```

Dev ports are derived from the directory name (FNV-1a hashed into 3100–3499), so they are stable across machines and nobody has to pick one. Vite falls forward if the port is taken.

Godot tests run from the project directory:

```bash
cd games/godot/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

A husky pre-commit hook runs ESLint and Prettier on staged files.

## Adding a project

```bash
npm run new -- web-game space-pinball --title "Space Pinball" --emoji 🕹️ --description "Tilt-free pinball in space."
npm install
```

Types are `web-game`, `web-app`, and `node-app`. The name must be kebab-case and unused in its category.

That is the whole setup step. The scaffold writes an `arcade` block into the project's `package.json`:

```json
"arcade": {
  "title": "Space Pinball",
  "emoji": "🕹️",
  "description": "Tilt-free pinball in space."
}
```

which is all any of the tooling needs:

- **Hub card** — `scripts/build-manifest.mjs` scans the tree and generates the hub's card list. Never hand-edit cards into the hub's `index.html`.
- **CI** — `ci-web.yml` has no path filters, so a new project is linted, tested, and built with no workflow edit.
- **Deploy** — `deploy.yml` globs the tree and copies the build to `/<category>/<slug>/`, failing loudly on a slug collision.
- **Dev server and base path** — `createProjectConfig({ root })` in `vite.config.js` derives both from the directory name.

Non-npm projects (the Godot runner) declare the same three fields in an `arcade.json` instead. A project with no arcade metadata simply stays off the hub — that is how the hub itself and the CI-only Node app opt out.

Then build it the usual way: tests first in `src/__tests__/*.test.js`, then the implementation. See [CLAUDE.md](./CLAUDE.md) for the working agreement.

## Adding a new tech stack

Only when a project genuinely cannot live in an existing stack — a new language or engine, not just a new library. The short version: make `<category>/<stack>/`, add a subtree `CLAUDE.md` describing its conventions, add a path-filtered `.github/workflows/ci-<stack>.yml` (copy `ci-godot.yml`, keep the filter stack-generic), give deployable projects an `arcade.json` plus a build job in `deploy.yml`, and add a template so the next one is a one-liner.

The full recipe, with the reasoning, is in [.claude/skills/new-project/SKILL.md](./.claude/skills/new-project/SKILL.md).

## Docs

[`docs/`](./docs/) is a running write-up of how the repo got here — linting, the monorepo, module extraction, testing, CI, PWA support, Godot deployment. The early steps describe layouts that have since been replaced; [`docs/02b-heterogeneous-tech-stacks.md`](./docs/02b-heterogeneous-tech-stacks.md) and [`docs/05-ci-pipeline.md`](./docs/05-ci-pipeline.md) describe the current conventions.

## License

MIT.
