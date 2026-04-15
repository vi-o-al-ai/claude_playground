import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "../..");

const exampleConfig = JSON.parse(readFileSync(resolve(appRoot, "sources.example.json"), "utf8"));
const schema = JSON.parse(readFileSync(resolve(appRoot, "sources.schema.json"), "utf8"));

const SUPPORTED_TYPES = new Set(["reddit", "hackernews"]);
const REDDIT_TIME_WINDOWS = new Set(["hour", "day", "week", "month", "year", "all"]);
const HN_LISTS = new Set(["topstories", "newstories", "beststories"]);

describe("sources.schema.json", () => {
  it("is a valid JSON Schema document with the expected root shape", () => {
    expect(schema.$schema).toMatch(/json-schema\.org/);
    expect(schema.type).toBe("object");
    expect(schema.properties.sources).toBeDefined();
    expect(schema.required).toContain("sources");
  });

  it("defines the reddit and hackernews source variants", () => {
    expect(schema.definitions.redditSource).toBeDefined();
    expect(schema.definitions.hackernewsSource).toBeDefined();
  });
});

describe("sources.example.json", () => {
  it("has a non-empty sources array", () => {
    expect(Array.isArray(exampleConfig.sources)).toBe(true);
    expect(exampleConfig.sources.length).toBeGreaterThan(0);
  });

  it("uses only supported source types", () => {
    for (const source of exampleConfig.sources) {
      expect(SUPPORTED_TYPES.has(source.type)).toBe(true);
    }
  });

  it("has valid reddit sources when present", () => {
    const reddit = exampleConfig.sources.filter((s) => s.type === "reddit");
    for (const source of reddit) {
      expect(typeof source.subreddit).toBe("string");
      expect(source.subreddit).toMatch(/^[A-Za-z0-9_]+$/);
      if (source.timeWindow !== undefined) {
        expect(REDDIT_TIME_WINDOWS.has(source.timeWindow)).toBe(true);
      }
    }
  });

  it("has valid hackernews sources when present", () => {
    const hn = exampleConfig.sources.filter((s) => s.type === "hackernews");
    for (const source of hn) {
      if (source.list !== undefined) {
        expect(HN_LISTS.has(source.list)).toBe(true);
      }
    }
  });

  it("respects topN bounds at root and per source", () => {
    const check = (n) => {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(20);
    };
    if (exampleConfig.topN !== undefined) check(exampleConfig.topN);
    for (const source of exampleConfig.sources) {
      if (source.topN !== undefined) check(source.topN);
    }
  });
});
