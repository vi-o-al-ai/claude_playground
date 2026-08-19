---
name: new-project
description: Use when adding a brand-new game or app to the monorepo. Scaffolds the project from a template into the right tree, then hands off to the normal TDD loop. Also covers adding a whole new tech stack.
allowed-tools: Bash(npm *), Bash(node scripts/*), Bash(git *)
argument-hint: <web-game|web-app|node-app> <kebab-case-name>
---

# Add a New Project

Never hand-create a project directory. The generator puts it in the right tree, wires the Vite
config to the shared factory, and writes the `arcade` metadata the hub reads.

Work starts on a feature branch — run `/start-work` or `/start-issue` first if you have not.

## Step 1: Pick the type and name

| Type       | Lands in        | On the hub?            |
| ---------- | --------------- | ---------------------- |
| `web-game` | `games/web/<n>` | yes, as a game         |
| `web-app`  | `apps/web/<n>`  | yes, as an app         |
| `node-app` | `apps/node/<n>` | no — headless, CI-only |

The directory name is the deploy slug and the dev-server port seed, so it must be kebab-case
(`space-pinball`) and must not already be used by another project in the same category — even
under a different stack.

## Step 2: Scaffold

```
npm run new -- <type> <name> --title "<Title>" --emoji "<emoji>" --description "<one line>"
```

Only `<type>` and `<name>` are required; the title defaults to the titleized name, the emoji to
🎮 (games) or 🔧 (apps), and the description to a `TODO:` line. Fill in a real description before
opening a PR — it is the text on the hub card.

## Step 3: Link the workspace

```
npm install
```

This registers the new workspace and updates `package-lock.json`. Commit the lockfile change.

## Step 4: Build it with TDD

The template ships a passing smoke test so the suite stays green. From there, follow the repo's
TDD rules for every feature:

1. Write the failing tests in `<project>/src/__tests__/*.test.js` and commit them.
2. Implement until they pass.
3. Commit, ask the user to verify in the browser (`npm run dev -w <category>/<stack>/<name>`),
   then open a PR.

Before pushing, confirm the whole repo is still green:

```
npm run check
node scripts/build-manifest.mjs --check
```

## Adding a whole new tech stack

Only when the project genuinely cannot live in an existing stack (a new language or engine, not
just a new library):

1. **Create the tree** — `<category>/<stack>/<project>` (e.g. `games/rust/…`). Category stays
   `games` or `apps`; the stack segment is an authoring detail and never appears in the deployed
   URL.
2. **Add a subtree `CLAUDE.md`** at `<category>/<stack>/CLAUDE.md` describing the stack's build,
   test, and layout conventions — match the tone of `games/web/CLAUDE.md`.
3. **Add a CI workflow** `.github/workflows/ci-<stack>.yml`, path-filtered on
   `<category>/<stack>/**` plus the workflow file itself, following `ci-godot.yml`. Keep the
   filter stack-generic so a second project in that stack needs no workflow edit.
4. **Register the workspace glob** in the root `package.json` `workspaces` array — only if it is
   a JS stack npm can install. Non-JS stacks stay out of npm entirely.
5. **Deploy** — a non-web stack that ships to the site needs an `arcade.json` in each project
   (same `title`/`emoji`/`description` fields as the `arcade` block in `package.json`; that is
   how the Godot runner appears on the hub) and a build job in `deploy.yml` that exports its
   output into `<category>/<slug>/` in the assembled site.
6. **Add a template** under `templates/<stack>-<kind>/` and a matching entry in `TYPES` in
   `scripts/new-project.mjs`, with tests, so the next project in that stack is a one-liner.
