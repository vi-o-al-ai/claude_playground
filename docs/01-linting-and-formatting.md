# Step 1: Linting & Formatting Setup

## Overview

This step introduces automated code quality tooling to the AI Games Arcade project using **ESLint** (v10) and **Prettier** (v3). These tools catch bugs early, enforce consistent style, and reduce code review friction.

## What Was Added

### ESLint (`eslint.config.js`)

- **Flat config format** (ESLint v10 default)
- **`@eslint/js` recommended rules** as a baseline
- **`eslint-plugin-html`** to lint inline `<script>` blocks inside HTML game files
- **`eslint-config-prettier`** to disable ESLint rules that conflict with Prettier
- Browser globals (DOM APIs, `localStorage`, `requestAnimationFrame`, etc.) pre-configured
- Game-specific overrides:
  - `ai_games/**/*.js` treated as `script` (not ES modules) since games use global scope
  - Cross-file globals like `Sudoku` are handled per-file

### Key ESLint Rules

| Rule             | Setting            | Why                                                  |
| ---------------- | ------------------ | ---------------------------------------------------- |
| `no-unused-vars` | warn               | Catches dead code without blocking development       |
| `eqeqeq`         | error              | Prevents subtle type coercion bugs (`==` vs `===`)   |
| `no-var`         | error              | Enforces `let`/`const` over `var` for proper scoping |
| `prefer-const`   | warn               | Encourages immutability where possible               |
| `curly`          | error (multi-line) | Prevents ambiguous control flow                      |

### Prettier (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "htmlWhitespaceSensitivity": "ignore"
}
```

### npm Scripts

| Script                 | Command               | Description                      |
| ---------------------- | --------------------- | -------------------------------- |
| `npm run lint`         | `eslint .`            | Check for linting errors         |
| `npm run lint:fix`     | `eslint . --fix`      | Auto-fix linting issues          |
| `npm run format`       | `prettier --write .`  | Format all files                 |
| `npm run format:check` | `prettier --check .`  | Check formatting without changes |
| `npm run check`        | `lint + format:check` | Run both checks (used in CI)     |

## Files Added/Modified

- `package.json` — initialized with scripts and dev dependencies
- `eslint.config.js` — ESLint flat config
- `.prettierrc` — Prettier configuration
- `.prettierignore` — files excluded from formatting
- `.gitignore` — excludes `node_modules/`, `dist/`, etc.

## Usage

```bash
# Install dependencies
npm install

# Check for issues
npm run check

# Auto-fix everything
npm run lint:fix && npm run format
```

## Design Decisions

1. **ESLint v10 flat config** — Modern standard; avoids deprecated `.eslintrc` patterns.
2. **`eslint-plugin-html`** — Most games are single HTML files with inline scripts; this lets us lint them directly.
3. **Script source type for game files** — Games use global scope patterns (IIFE, cross-file references), not ES modules. This avoids false `no-undef` errors.
4. **Warnings over errors for style rules** — Rules like `prefer-const` and `no-unused-vars` warn rather than error, so they don't block development but still surface during review.
5. **Prettier handles all formatting** — ESLint formatting rules are disabled via `eslint-config-prettier` to avoid conflicts. One tool per concern.
