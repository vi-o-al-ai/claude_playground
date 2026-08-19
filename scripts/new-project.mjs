#!/usr/bin/env node
/**
 * Scaffolds a new game or app from the templates in `templates/`.
 *
 * A project is nothing more than a directory in the right place with the right
 * metadata: `<category>/<stack>/<slug>`, where the directory name is also the
 * deploy slug and the dev-server port seed. This script copies the matching
 * template, substitutes the placeholder tokens, and stops there — no npm
 * install, no git, no test running. Everything else is the normal TDD loop.
 *
 * Usage:
 *   npm run new -- <type> <name> [--title "..."] [--emoji "..."] [--description "..."]
 *
 *   <type>  web-game | web-app | node-app
 *   <name>  kebab-case directory name, e.g. space-pinball
 *
 * Example:
 *   npm run new -- web-game space-pinball --title "Space Pinball" --emoji 🕹️
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stderr, stdout } from "node:process";

import { listProjects } from "./build-manifest.mjs";

/** This script lives in `<repoRoot>/scripts`. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the scaffold templates live, relative to the repo root. */
export const TEMPLATES_DIR = join(REPO_ROOT, "templates");

/**
 * The supported project types and where each one lands.
 *
 * `template` is the directory under `templates/`; `category`/`stack` form the
 * destination `<category>/<stack>/<name>`.
 */
export const TYPES = {
  "web-game": { category: "games", stack: "web", template: "web-game", emoji: "🎮" },
  "web-app": { category: "apps", stack: "web", template: "web-app", emoji: "🔧" },
  "node-app": { category: "apps", stack: "node", template: "node-app", emoji: "🔧" },
};

/** Project directory names are kebab-case: lowercase words joined by hyphens. */
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Turns a kebab-case slug into a human title.
 *
 * @param {string} name - e.g. "space-pinball"
 * @returns {string} e.g. "Space Pinball"
 */
export function titleize(name) {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Every file below a directory, as absolute paths.
 *
 * @param {string} dir - Absolute path
 * @returns {string[]}
 */
function filesIn(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesIn(child));
    else files.push(child);
  }
  return files;
}

/**
 * Replaces every placeholder token in a template file's contents.
 *
 * Tokens only ever appear in file contents, never in file names, so copying is
 * a plain recursive copy followed by a rewrite pass.
 *
 * @param {string} contents
 * @param {{ name: string, title: string, emoji: string, description: string }} tokens
 * @returns {string}
 */
function substitute(contents, tokens) {
  return contents
    .replaceAll("__NAME__", tokens.name)
    .replaceAll("__TITLE__", tokens.title)
    .replaceAll("__EMOJI__", tokens.emoji)
    .replaceAll("__DESCRIPTION__", tokens.description);
}

/**
 * Scaffolds a new project.
 *
 * Validation runs before anything is written, so a rejected request leaves the
 * tree untouched.
 *
 * @param {Object} options
 * @param {string} options.repoRoot - Absolute path to the repository root
 * @param {string} options.type - One of the keys of {@link TYPES}
 * @param {string} options.name - kebab-case project directory name
 * @param {string} [options.title] - Display title; defaults to the titleized name
 * @param {string} [options.emoji] - Hub card emoji; defaults per type
 * @param {string} [options.description] - Hub card description; defaults to a TODO
 * @returns {{ dir: string, relativeDir: string, files: string[], title: string,
 *   emoji: string, description: string }}
 * @throws {Error} When the type, name, or destination is not usable
 */
export function createProject({ repoRoot, type, name, title, emoji, description }) {
  const spec = TYPES[type];
  if (!spec) {
    throw new Error(
      `unknown project type "${type}" — expected one of ${Object.keys(TYPES).join(", ")}`,
    );
  }

  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    throw new Error(
      `invalid project name "${name}" — must be kebab-case (lowercase letters, digits and hyphens, starting with a letter), e.g. space-pinball`,
    );
  }

  const relativeDir = `${spec.category}/${spec.stack}/${name}`;
  const dir = join(repoRoot, spec.category, spec.stack, name);
  if (existsSync(dir)) {
    throw new Error(`${relativeDir} already exists — pick another name or delete it first`);
  }

  const clash = listProjects(repoRoot, spec.category).find((project) => project.slug === name);
  if (clash) {
    throw new Error(
      `slug "${name}" is already taken in ${spec.category}: ${clash.path} deploys to ${spec.category}/${name}/, so ${relativeDir} would collide with it`,
    );
  }

  const templateDir = join(TEMPLATES_DIR, spec.template);
  if (!existsSync(templateDir)) {
    throw new Error(`missing template directory ${templateDir}`);
  }

  const resolvedTitle = title || titleize(name);
  const tokens = {
    name,
    title: resolvedTitle,
    emoji: emoji || spec.emoji,
    description: description || `TODO: describe ${resolvedTitle}`,
  };

  mkdirSync(dirname(dir), { recursive: true });
  cpSync(templateDir, dir, { recursive: true });

  const files = filesIn(dir).sort();
  for (const file of files) {
    writeFileSync(file, substitute(readFileSync(file, "utf8"), tokens));
  }

  return {
    dir,
    relativeDir,
    files: files.map((file) => file.slice(dir.length + 1)),
    ...tokens,
  };
}

const USAGE = `Usage: npm run new -- <type> <name> [--title "..."] [--emoji "..."] [--description "..."]

  <type>  ${Object.keys(TYPES).join(" | ")}
  <name>  kebab-case directory name, e.g. space-pinball

Example:
  npm run new -- web-game space-pinball --title "Space Pinball" --emoji 🕹️
`;

/**
 * Parses CLI arguments into createProject options.
 *
 * Flags accept either `--flag value` or `--flag=value`.
 *
 * @param {string[]} args
 * @returns {{ positional: string[], flags: Record<string, string> }}
 */
function parseArgs(args) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const equals = body.indexOf("=");
    if (equals !== -1) {
      flags[body.slice(0, equals)] = body.slice(equals + 1);
    } else {
      flags[body] = args[index + 1] ?? "";
      index += 1;
    }
  }

  return { positional, flags };
}

/**
 * CLI entry point.
 *
 * @param {string[]} args - Arguments after the script name
 * @param {Object} [io]
 * @param {(text: string) => void} [io.write] - Sink for normal output
 * @param {(text: string) => void} [io.fail] - Sink for errors and usage
 * @returns {number} Process exit code
 */
export function main(
  args,
  { write = (text) => stdout.write(text), fail = (text) => stderr.write(text) } = {},
) {
  const { positional, flags } = parseArgs(args);
  const [type, name] = positional;

  if (!type || !name) {
    fail(USAGE);
    return 1;
  }

  const repoRoot = flags.root ? resolve(flags.root) : REPO_ROOT;

  let project;
  try {
    project = createProject({
      repoRoot,
      type,
      name,
      title: flags.title,
      emoji: flags.emoji,
      description: flags.description,
    });
  } catch (error) {
    fail(`${error.message}\n`);
    return 1;
  }

  const dir = project.relativeDir;
  const web = TYPES[type].stack === "web";

  // Node apps have no dev server and no hub card, so their last step differs.
  const run = web ? `npm run dev -w ${dir}` : `node ${dir}/src/index.js`;
  const last = web
    ? `  4. Fill in the description in ${dir}/package.json — it becomes the hub card.\n`
    : "";

  write(`Created ${dir} (${project.emoji} ${project.title})\n`);
  for (const file of project.files) write(`  ${dir}/${file}\n`);
  write(`
Next steps:
  1. npm install   # link the new workspace
  2. ${run}
  3. Follow TDD: write the failing tests in ${dir}/src/__tests__/ first,
     commit them, then implement until they pass.
${last}`);

  return 0;
}

// Run only when invoked directly, so importing the module stays side-effect free.
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  exit(main(argv.slice(2)));
}
