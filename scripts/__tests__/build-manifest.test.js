import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MANIFEST_PATH, buildManifest, writeManifest } from "../build-manifest.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../build-manifest.mjs");
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

let root;

/** Writes a JSON file, creating parent directories as needed. */
function writeJson(relativePath, value) {
  const file = join(root, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}

/** Creates a project whose metadata lives in package.json. */
function packageProject(relativeDir, arcade) {
  writeJson(`${relativeDir}/package.json`, {
    name: `@ai-arcade/${relativeDir.split("/").pop()}`,
    private: true,
    ...(arcade ? { arcade } : {}),
  });
}

/** Creates a project whose metadata lives in a standalone arcade.json. */
function jsonProject(relativeDir, arcade) {
  writeJson(`${relativeDir}/arcade.json`, arcade);
}

const SOLITAIRE = {
  title: "Solitaire",
  emoji: "🃏",
  description: "The timeless single-player card game.",
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "arcade-manifest-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("buildManifest", () => {
  it("reads metadata from package.json", () => {
    packageProject("games/web/solitaire", SOLITAIRE);

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries).toEqual([
      {
        slug: "solitaire",
        category: "games",
        title: "Solitaire",
        emoji: "🃏",
        description: "The timeless single-player card game.",
        url: "games/solitaire/",
      },
    ]);
  });

  it("reads metadata from arcade.json for non-npm projects", () => {
    jsonProject("games/godot/runner", {
      title: "Zombie Lane Runner",
      emoji: "🧟",
      description: "Dodge and shoot zombies.",
    });

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      slug: "runner",
      category: "games",
      title: "Zombie Lane Runner",
      url: "games/runner/",
    });
  });

  it("prefers package.json metadata when both sources exist", () => {
    packageProject("games/web/solitaire", SOLITAIRE);
    jsonProject("games/web/solitaire", { title: "Ignored", emoji: "❓", description: "Ignored." });

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries[0].title).toBe("Solitaire");
  });

  it("skips project directories that declare no metadata", () => {
    packageProject("games/web/solitaire", SOLITAIRE);
    // The hub itself and CI-only Node apps carry no arcade metadata.
    packageProject("games/web/arcade-hub", null);
    packageProject("apps/node/news-digest", null);
    // A stray directory with neither manifest file at all.
    mkdirSync(join(root, "games/web/scratch"), { recursive: true });

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries.map((entry) => entry.slug)).toEqual(["solitaire"]);
  });

  it("derives the category from the top-level directory segment", () => {
    packageProject("games/web/solitaire", SOLITAIRE);
    packageProject("apps/web/timeline-tracker", {
      title: "Timeline Tracker",
      emoji: "⏱️",
      description: "Track your day.",
    });

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries.map((entry) => [entry.category, entry.url])).toEqual([
      ["games", "games/solitaire/"],
      ["apps", "apps/timeline-tracker/"],
    ]);
  });

  it("ignores top-level directories that are not games or apps", () => {
    packageProject("packages/shared-ui", SOLITAIRE);
    packageProject("scripts/lib/thing", SOLITAIRE);

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries).toEqual([]);
  });

  it("sorts entries by title within category, games before apps", () => {
    packageProject("games/web/sudoku", {
      title: "Sudoku",
      emoji: "🧩",
      description: "Grid logic.",
    });
    packageProject("games/web/in-a-nutshell", {
      title: "In a Nutshell",
      emoji: "🥜",
      description: "Guess the answer.",
    });
    packageProject("apps/web/timeline-tracker", {
      title: "Timeline Tracker",
      emoji: "⏱️",
      description: "Track your day.",
    });
    packageProject("apps/web/baby-countdown", {
      title: "Baby Countdown",
      emoji: "🫘",
      description: "Countdown.",
    });

    const { entries } = buildManifest(root);

    expect(entries.map((entry) => entry.title)).toEqual([
      "In a Nutshell",
      "Sudoku",
      "Baby Countdown",
      "Timeline Tracker",
    ]);
  });

  it("allows the same slug in different categories", () => {
    packageProject("games/web/tracker", { title: "Tracker", emoji: "🎮", description: "A game." });
    packageProject("apps/web/tracker", { title: "Tracker", emoji: "🛠️", description: "An app." });

    const { entries, errors } = buildManifest(root);

    expect(errors).toEqual([]);
    expect(entries.map((entry) => entry.url)).toEqual(["games/tracker/", "apps/tracker/"]);
  });

  it("fails on a duplicate slug within one category", () => {
    packageProject("games/web/solitaire", SOLITAIRE);
    jsonProject("games/godot/solitaire", SOLITAIRE);

    const { errors } = buildManifest(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/duplicate/i);
    expect(errors[0]).toContain("solitaire");
    expect(errors[0]).toContain("games/web/solitaire");
    expect(errors[0]).toContain("games/godot/solitaire");
  });

  it("fails on missing required fields, naming the project", () => {
    packageProject("games/web/solitaire", { title: "Solitaire", emoji: "🃏" });

    const { entries, errors } = buildManifest(root);

    expect(entries).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("games/web/solitaire");
    expect(errors[0]).toMatch(/description/);
  });

  it("fails on fields of the wrong type or empty strings", () => {
    packageProject("games/web/a", { title: 42, emoji: "🃏", description: "ok" });
    packageProject("games/web/b", { title: "B", emoji: "", description: "ok" });
    packageProject("games/web/c", { title: "C", emoji: "🃏", description: "   " });
    packageProject("games/web/d", "not-an-object");

    const { entries, errors } = buildManifest(root);

    expect(entries).toEqual([]);
    expect(errors).toHaveLength(4);
    for (const slug of ["a", "b", "c", "d"]) {
      expect(errors.some((error) => error.includes(`games/web/${slug}`))).toBe(true);
    }
  });

  it("fails with a clear error on unparseable JSON", () => {
    mkdirSync(join(root, "games/web/broken"), { recursive: true });
    writeFileSync(join(root, "games/web/broken/package.json"), "{ not json");

    const { errors } = buildManifest(root);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("games/web/broken/package.json");
  });

  it("tolerates a repo root with no games or apps directories", () => {
    expect(buildManifest(root)).toEqual({ entries: [], errors: [] });
  });
});

describe("writeManifest", () => {
  it("writes pretty-printed JSON to the hub source directory", () => {
    packageProject("games/web/solitaire", SOLITAIRE);
    const { entries } = buildManifest(root);

    const file = writeManifest(root, entries);

    expect(file).toBe(join(root, MANIFEST_PATH));
    const contents = readFileSync(file, "utf8");
    expect(contents.endsWith("\n")).toBe(true);
    expect(contents).toContain('\n  {\n    "slug": "solitaire"');
    expect(JSON.parse(contents)).toEqual(entries);
  });
});

describe("CLI", () => {
  function run(args) {
    try {
      const stdout = execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
      return { status: 0, output: stdout };
    } catch (error) {
      return { status: error.status ?? 1, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
    }
  }

  it("writes the manifest by default", () => {
    packageProject("games/web/solitaire", SOLITAIRE);

    const { status } = run([`--root=${root}`]);

    expect(status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, MANIFEST_PATH), "utf8"))).toHaveLength(1);
  });

  it("validates without writing in --check mode", () => {
    packageProject("games/web/solitaire", SOLITAIRE);

    const { status } = run([`--root=${root}`, "--check"]);

    expect(status).toBe(0);
    expect(existsSync(join(root, MANIFEST_PATH))).toBe(false);
  });

  it("exits non-zero and writes nothing when metadata is invalid", () => {
    packageProject("games/web/solitaire", SOLITAIRE);
    jsonProject("games/godot/solitaire", SOLITAIRE);

    const { status, output } = run([`--root=${root}`]);

    expect(status).not.toBe(0);
    expect(output).toMatch(/duplicate/i);
    expect(existsSync(join(root, MANIFEST_PATH))).toBe(false);
  });

  it("passes --check against the real repository", () => {
    const { status } = run(["--check"]);
    expect(status).toBe(0);
  });
});

describe("the real repository", () => {
  it("produces one entry per deployable project", () => {
    const { entries, errors } = buildManifest(REPO_ROOT);

    expect(errors).toEqual([]);
    expect(entries.map((entry) => entry.url).sort()).toEqual([
      "apps/apple-music-to-youtube/",
      "apps/baby-countdown/",
      "apps/timeline-tracker/",
      "games/in-a-nutshell/",
      "games/runner/",
      "games/solitaire/",
      "games/space-invaders/",
      "games/splendor/",
      "games/sudoku/",
      "games/tic-tac-toe/",
    ]);
    // The hub itself and the CI-only Node app are not deployable cards.
    expect(entries.some((entry) => entry.slug === "arcade-hub")).toBe(false);
    expect(entries.some((entry) => entry.slug === "news-digest")).toBe(false);
  });
});
