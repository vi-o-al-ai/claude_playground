import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TYPES, createProject, main, titleize } from "../new-project.mjs";

let root;

/** Creates an empty project directory inside the temp repo root. */
function existingProject(relativeDir, packageJson) {
  const dir = join(root, relativeDir);
  mkdirSync(dir, { recursive: true });
  if (packageJson) {
    writeFileSync(`${join(dir, "package.json")}`, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
  return dir;
}

/** Reads a generated file relative to the temp repo root. */
function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

/** Reads and parses a generated JSON file relative to the temp repo root. */
function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

/** Every file below a directory, as repo-root-relative paths. */
function walk(relativeDir) {
  const files = [];
  for (const entry of readdirSync(join(root, relativeDir), { withFileTypes: true })) {
    const child = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...walk(child));
    else files.push(child);
  }
  return files.sort();
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "arcade-new-project-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("titleize", () => {
  it("turns a kebab-case slug into a title", () => {
    expect(titleize("space-pinball")).toBe("Space Pinball");
    expect(titleize("sudoku")).toBe("Sudoku");
    expect(titleize("apple-music-to-youtube")).toBe("Apple Music To Youtube");
  });
});

describe("createProject — web-game", () => {
  it("scaffolds into games/web/<name> with every template file", () => {
    const result = createProject({ repoRoot: root, type: "web-game", name: "space-pinball" });

    expect(result.dir).toBe(join(root, "games", "web", "space-pinball"));
    expect(result.relativeDir).toBe("games/web/space-pinball");
    expect(walk("games/web/space-pinball")).toEqual([
      "games/web/space-pinball/CLAUDE.md",
      "games/web/space-pinball/index.html",
      "games/web/space-pinball/package.json",
      "games/web/space-pinball/src/__tests__/smoke.test.js",
      "games/web/space-pinball/src/main.js",
      "games/web/space-pinball/vite.config.js",
    ]);
  });

  it("substitutes tokens in package.json", () => {
    createProject({
      repoRoot: root,
      type: "web-game",
      name: "space-pinball",
      title: "Space Pinball",
      emoji: "🕹️",
      description: "Flippers in orbit.",
    });

    const pkg = readJson("games/web/space-pinball/package.json");

    expect(pkg.name).toBe("@ai-arcade/space-pinball");
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe("module");
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.arcade).toEqual({
      title: "Space Pinball",
      emoji: "🕹️",
      description: "Flippers in orbit.",
    });
  });

  it("leaves no placeholder tokens behind in any file", () => {
    createProject({ repoRoot: root, type: "web-game", name: "space-pinball" });

    for (const file of walk("games/web/space-pinball")) {
      expect(read(file)).not.toMatch(/__[A-Z]+__/);
    }
  });

  it("wires the vite config to the shared factory at the right depth", () => {
    createProject({ repoRoot: root, type: "web-game", name: "space-pinball" });

    const config = read("games/web/space-pinball/vite.config.js");

    expect(config).toContain('from "../../../vite.shared.js"');
    expect(config).toContain("createProjectConfig");
  });

  it("applies defaults for title, emoji and description", () => {
    createProject({ repoRoot: root, type: "web-game", name: "space-pinball" });

    const pkg = readJson("games/web/space-pinball/package.json");

    expect(pkg.arcade).toEqual({
      title: "Space Pinball",
      emoji: "🎮",
      description: "TODO: describe Space Pinball",
    });
  });
});

describe("createProject — web-app", () => {
  it("scaffolds into apps/web/<name> with arcade metadata", () => {
    const result = createProject({
      repoRoot: root,
      type: "web-app",
      name: "budget-buddy",
      description: "Tracks the pennies.",
    });

    expect(result.relativeDir).toBe("apps/web/budget-buddy");

    const pkg = readJson("apps/web/budget-buddy/package.json");
    expect(pkg.name).toBe("@ai-arcade/budget-buddy");
    expect(pkg.arcade).toEqual({
      title: "Budget Buddy",
      emoji: "🔧",
      description: "Tracks the pennies.",
    });
    expect(read("apps/web/budget-buddy/index.html")).toContain("<title>Budget Buddy</title>");
  });
});

describe("createProject — node-app", () => {
  it("scaffolds into apps/node/<name> without arcade metadata", () => {
    const result = createProject({ repoRoot: root, type: "node-app", name: "link-checker" });

    expect(result.relativeDir).toBe("apps/node/link-checker");
    expect(walk("apps/node/link-checker")).toEqual([
      "apps/node/link-checker/CLAUDE.md",
      "apps/node/link-checker/package.json",
      "apps/node/link-checker/src/__tests__/smoke.test.js",
      "apps/node/link-checker/src/index.js",
    ]);

    const pkg = readJson("apps/node/link-checker/package.json");
    expect(pkg.name).toBe("@ai-arcade/link-checker");
    expect(pkg.arcade).toBeUndefined();
  });
});

describe("createProject — validation", () => {
  it("rejects an unknown type", () => {
    expect(() => createProject({ repoRoot: root, type: "web-thing", name: "solitaire-2" })).toThrow(
      /unknown project type/i,
    );
  });

  it("rejects names that are not kebab-case", () => {
    for (const name of [
      "Space Pinball",
      "space_pinball",
      "SpacePinball",
      "-space",
      "space-",
      "2048x",
    ]) {
      expect(() => createProject({ repoRoot: root, type: "web-game", name })).toThrow(
        /kebab-case/i,
      );
    }
  });

  it("accepts kebab-case names with digits after the first letter", () => {
    expect(() =>
      createProject({ repoRoot: root, type: "web-game", name: "connect-4" }),
    ).not.toThrow();
  });

  it("rejects a destination that already exists", () => {
    existingProject("games/web/solitaire");

    expect(() => createProject({ repoRoot: root, type: "web-game", name: "solitaire" })).toThrow(
      /already exists/i,
    );
  });

  it("rejects a slug already used by another stack in the same category", () => {
    existingProject("games/godot/runner");

    expect(() => createProject({ repoRoot: root, type: "web-game", name: "runner" })).toThrow(
      /games\/runner/,
    );
  });

  it("allows the same name in a different category", () => {
    existingProject("games/web/timeline", { name: "@ai-arcade/timeline" });

    expect(() =>
      createProject({ repoRoot: root, type: "web-app", name: "timeline" }),
    ).not.toThrow();
    expect(readJson("apps/web/timeline/package.json").name).toBe("@ai-arcade/timeline");
  });

  it("writes nothing when validation fails", () => {
    expect(() => createProject({ repoRoot: root, type: "web-game", name: "Bad Name" })).toThrow();
    expect(readdirSync(root)).toEqual([]);
  });
});

describe("TYPES", () => {
  it("maps each supported type to its destination tree", () => {
    expect(Object.keys(TYPES).sort()).toEqual(["node-app", "web-app", "web-game"]);
    expect(TYPES["web-game"].category).toBe("games");
    expect(TYPES["web-game"].stack).toBe("web");
    expect(TYPES["web-app"].category).toBe("apps");
    expect(TYPES["web-app"].stack).toBe("web");
    expect(TYPES["node-app"].category).toBe("apps");
    expect(TYPES["node-app"].stack).toBe("node");
  });
});

describe("main", () => {
  it("scaffolds from CLI arguments and reports success", () => {
    const out = [];

    const code = main(
      [
        "web-game",
        "space-pinball",
        "--title",
        "Space Pinball",
        "--emoji",
        "🕹️",
        "--description",
        "Flippers in orbit.",
        `--root=${root}`,
      ],
      { write: (text) => out.push(text) },
    );

    expect(code).toBe(0);
    expect(readJson("games/web/space-pinball/package.json").arcade.title).toBe("Space Pinball");

    const printed = out.join("");
    expect(printed).toContain("games/web/space-pinball");
    expect(printed).toContain("npm install");
    expect(printed).toContain("npm run dev -w games/web/space-pinball");
    expect(printed).toMatch(/test/i);
    expect(printed).toMatch(/hub card/i);
  });

  it("tailors the next steps to a headless node app", () => {
    const out = [];

    const code = main(["node-app", "link-checker", `--root=${root}`], {
      write: (text) => out.push(text),
    });

    expect(code).toBe(0);

    const printed = out.join("");
    expect(printed).toContain("npm install");
    expect(printed).toContain("node apps/node/link-checker/src/index.js");
    expect(printed).not.toMatch(/npm run dev/);
    expect(printed).not.toMatch(/hub card/i);
  });

  it("reports usage and fails when arguments are missing", () => {
    const errors = [];

    const code = main([`--root=${root}`], { fail: (text) => errors.push(text) });

    expect(code).toBe(1);
    expect(errors.join("")).toMatch(/usage/i);
  });

  it("fails with a message when validation rejects the request", () => {
    const errors = [];

    const code = main(["web-game", "Bad Name", `--root=${root}`], {
      fail: (text) => errors.push(text),
    });

    expect(code).toBe(1);
    expect(errors.join("")).toMatch(/kebab-case/i);
  });
});
