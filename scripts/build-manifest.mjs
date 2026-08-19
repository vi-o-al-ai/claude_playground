#!/usr/bin/env node
/**
 * Builds the arcade hub's card manifest from per-project metadata.
 *
 * Every deployable project declares itself with an `arcade` object — in its
 * `package.json` for npm workspaces, or in a standalone `arcade.json` for
 * projects npm knows nothing about (the Godot runner). A project with no such
 * metadata never appears on the hub, which is how the hub itself and the
 * CI-only Node app stay off the grid.
 *
 * The category is derived from the tree rather than stored: anything under
 * `games/` is a game, anything under `apps/` is an app. Deployed URLs are
 * namespaced the same way (see `deriveBase` in vite.shared.js), so the entry
 * URL is simply `<category>/<slug>/`.
 *
 * Usage:
 *   node scripts/build-manifest.mjs            # write games/web/arcade-hub/src/manifest.json
 *   node scripts/build-manifest.mjs --check    # validate only, write nothing
 *   node scripts/build-manifest.mjs --root=DIR # scan DIR instead of the repo root
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stderr, stdout } from "node:process";

/** Top-level directories that hold deployable projects, in hub display order. */
export const CATEGORIES = ["games", "apps"];

/** Where the generated manifest lives, relative to the repo root. */
export const MANIFEST_PATH = join("games", "web", "arcade-hub", "src", "manifest.json");

/** Metadata fields every project must declare. */
const REQUIRED_FIELDS = ["title", "emoji", "description"];

/** This script lives in `<repoRoot>/scripts`. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Reads and parses a JSON file.
 *
 * @param {string} file - Absolute path
 * @returns {{ value?: unknown, error?: string }}
 */
function readJson(file) {
  try {
    return { value: JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Lists the immediate subdirectories of a directory, or [] if it is absent.
 *
 * @param {string} dir - Absolute path
 * @returns {string[]} Directory names, sorted
 */
function subdirectories(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Lists every project directory in a category, across all of its stacks.
 *
 * A project's directory name is its deploy slug: `<category>/<stack>/<slug>`
 * deploys to `<category>/<slug>/`, so two stacks in the same category can never
 * share a name. Callers that care about that clash (the manifest builder, the
 * scaffolder) share this scan rather than re-walking the tree.
 *
 * @param {string} repoRoot - Absolute path to the repository root
 * @param {string} category - Top-level directory, e.g. "games"
 * @returns {{ slug: string, stack: string, category: string, path: string }[]}
 *   In stack order, then slug order; `path` is repo-relative.
 */
export function listProjects(repoRoot, category) {
  const projects = [];
  for (const stack of subdirectories(join(repoRoot, category))) {
    for (const slug of subdirectories(join(repoRoot, category, stack))) {
      projects.push({ slug, stack, category, path: `${category}/${stack}/${slug}` });
    }
  }
  return projects;
}

/**
 * Checks that a metadata object declares every required field as a non-empty
 * string.
 *
 * @param {unknown} arcade
 * @returns {string[]} Human-readable problems, empty when valid
 */
function validate(arcade) {
  if (arcade === null || typeof arcade !== "object" || Array.isArray(arcade)) {
    return ["arcade metadata must be an object"];
  }
  const problems = [];
  for (const field of REQUIRED_FIELDS) {
    const value = arcade[field];
    if (typeof value !== "string") {
      problems.push(`"${field}" must be a string`);
    } else if (value.trim() === "") {
      problems.push(`"${field}" must not be empty`);
    }
  }
  return problems;
}

/**
 * Loads a project's arcade metadata, preferring `package.json` over
 * `arcade.json`.
 *
 * @param {string} projectDir - Absolute path to the project directory
 * @param {string} label - Repo-relative path, used in error messages
 * @returns {{ arcade?: object, errors: string[], found: boolean }}
 */
function loadMetadata(projectDir, label) {
  const packageFile = join(projectDir, "package.json");
  if (existsSync(packageFile)) {
    const { value, error } = readJson(packageFile);
    if (error) return { errors: [`${label}/package.json: invalid JSON — ${error}`], found: true };
    if (value && typeof value === "object" && "arcade" in value) {
      return { arcade: value.arcade, errors: [], found: true };
    }
  }

  const arcadeFile = join(projectDir, "arcade.json");
  if (existsSync(arcadeFile)) {
    const { value, error } = readJson(arcadeFile);
    if (error) return { errors: [`${label}/arcade.json: invalid JSON — ${error}`], found: true };
    return { arcade: value, errors: [], found: true };
  }

  return { errors: [], found: false };
}

/**
 * Scans a repo root and builds the hub manifest.
 *
 * Entries are sorted by title within their category, categories in
 * `CATEGORIES` order, so the generated file is stable across runs.
 *
 * @param {string} repoRoot - Absolute path to the repository root
 * @returns {{ entries: object[], errors: string[] }} `errors` is empty on success
 */
export function buildManifest(repoRoot) {
  const entries = [];
  const errors = [];

  for (const category of CATEGORIES) {
    /** @type {Map<string, string>} slug -> first project path that claimed it */
    const seen = new Map();

    for (const { slug, path: label } of listProjects(repoRoot, category)) {
      const projectDir = join(repoRoot, label);

      const { arcade, errors: loadErrors, found } = loadMetadata(projectDir, label);
      if (loadErrors.length > 0) {
        errors.push(...loadErrors);
        continue;
      }
      if (!found || arcade === undefined) continue;

      const problems = validate(arcade);
      if (problems.length > 0) {
        errors.push(`${label}: ${problems.join("; ")}`);
        continue;
      }

      const claimed = seen.get(slug);
      if (claimed) {
        errors.push(
          `duplicate slug "${slug}" in ${category}: ${claimed} and ${label} would both deploy to ${category}/${slug}/`,
        );
        continue;
      }
      seen.set(slug, label);

      entries.push({
        slug,
        category,
        title: arcade.title,
        emoji: arcade.emoji,
        description: arcade.description,
        url: `${category}/${slug}/`,
      });
    }
  }

  entries.sort((a, b) => {
    const byCategory = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
    return byCategory !== 0 ? byCategory : a.title.localeCompare(b.title, "en");
  });

  return { entries, errors };
}

/**
 * Writes the manifest file, creating its directory if needed.
 *
 * @param {string} repoRoot - Absolute path to the repository root
 * @param {object[]} entries - Entries from {@link buildManifest}
 * @returns {string} The absolute path written
 */
export function writeManifest(repoRoot, entries) {
  const file = join(repoRoot, MANIFEST_PATH);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
  return file;
}

/**
 * CLI entry point.
 *
 * @param {string[]} args - Arguments after the script name
 * @returns {number} Process exit code
 */
export function main(args) {
  const check = args.includes("--check");
  const rootArg = args.find((arg) => arg.startsWith("--root="));
  const repoRoot = rootArg ? resolve(rootArg.slice("--root=".length)) : REPO_ROOT;

  const { entries, errors } = buildManifest(repoRoot);

  if (errors.length > 0) {
    stderr.write("Arcade metadata is invalid:\n");
    for (const error of errors) stderr.write(`  - ${error}\n`);
    return 1;
  }

  if (check) {
    stdout.write(`Arcade metadata OK — ${entries.length} project(s).\n`);
    return 0;
  }

  const file = writeManifest(repoRoot, entries);
  stdout.write(`Wrote ${entries.length} entries to ${file}\n`);
  return 0;
}

// Run only when invoked directly, so importing the module stays side-effect free.
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  exit(main(argv.slice(2)));
}
