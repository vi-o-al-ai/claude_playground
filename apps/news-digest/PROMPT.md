# News Digest — Agent Instructions

You are running inside a scheduled GitHub Actions workflow. Your job is to produce a daily news digest by reading a sources config, fetching items from each source, summarizing them, and writing a markdown file that is committed back to the repository.

Follow these steps **in order**. Do not skip steps. Do not invent sources that aren't in the config.

## Inputs and outputs

- **Config path:** `./data/sources.json` (relative to the workflow working directory)
- **Schema (reference only):** `./engine/apps/news-digest/sources.schema.json`
- **Output path:** `./data/digests/YYYY-MM-DD.md`, where `YYYY-MM-DD` is today's UTC date
- **Commit message:** `digest: YYYY-MM-DD`
- **Working directory:** the root of the private data repo (`./data` in CI), with the engine available at `./engine`

If `./data/digests/` does not exist, create it.
If a digest file for today already exists, **overwrite** it (do not append).

## Step 1: Read and interpret config

Read `./data/sources.json`. Validate that:

1. It is valid JSON
2. It has a non-empty `sources` array
3. Each source has a `type` that is either `reddit` or `hackernews`

If any validation fails, abort with a clear error message and do not commit.

Determine the effective `topN` for each source: per-source `topN` overrides the root-level `topN`, which defaults to `5` if unset.

Determine today's date in UTC as `YYYY-MM-DD` — this is the output filename and heading date. Use the current system date at run time; do not hardcode.

Read `digestTitle` from the config; default to `News Digest` if unset.

## Step 2: Fetch items per source type

Process sources **in the order they appear in the config**. For each source, use the `WebFetch` tool with the instructions below.

### Type: `reddit`

- **URL:** `https://www.reddit.com/r/{subreddit}/top.json?limit={topN}&t={timeWindow}`
  - `timeWindow` defaults to `day` if unset
- **Request requirement:** Reddit blocks default `User-Agent` strings. If `WebFetch` allows header customization in this environment, send `User-Agent: news-digest-bot/1.0 (github.com/vi-o-al-ai/claude_playground)`. If not, attempt the fetch anyway — Reddit sometimes responds to tool-based user agents.
- **Extract for each post** (`data.children[].data`):
  - `title` (post title)
  - `url` (the outbound article URL — may equal the Reddit permalink for self posts)
  - `permalink` (Reddit comment thread path; prepend `https://reddit.com` for a full URL)
  - `selftext` (body of self posts, may be empty)
  - `score`, `num_comments` (optional, for display)
  - `is_self` (true if it's a text post with no outbound link)
- **Section heading:** use the source's `label` if set, otherwise `r/{subreddit}`.

### Type: `hackernews`

- **Step 1 — list fetch:** `https://hacker-news.firebaseio.com/v0/{list}.json`
  - `list` defaults to `topstories` if unset
  - Take the first `topN` item IDs
- **Step 2 — per-item fetch:** `https://hacker-news.firebaseio.com/v0/item/{id}.json` for each ID
- **Extract per item:**
  - `title`
  - `url` (the outbound article URL — may be absent for `ask`/`show` posts)
  - `by` (author)
  - `score`, `descendants` (comment count)
  - `id` (used to build the HN thread URL: `https://news.ycombinator.com/item?id={id}`)
  - `text` (present on Ask HN / Show HN / text posts)
- **Section heading:** use the source's `label` if set, otherwise `Hacker News ({list})`.

## Step 3: Summarize each item

For each item you fetched, write a **1–2 sentence neutral summary** (no editorializing, no marketing language, no exclamation points).

**Grounding the summary:**

- If the item has a linkable outbound article URL, try `WebFetch` on that URL to read the article and summarize its actual content.
- If the article fetch fails, times out, or returns an error, fall back to summarizing from the title plus any available text (`selftext` for Reddit, `text` for HN). Do **not** abort the whole run for a single failed fetch — skip that item's deep-fetch and summarize from title alone as a last resort.
- If an item has no title and no body at all, skip it entirely (do not emit an empty bullet).

Keep each summary self-contained. A reader should understand what the story is about without clicking the link.

## Step 4: Write the digest markdown

Emit the output file at `./data/digests/YYYY-MM-DD.md` with this exact structure:

```md
# {digestTitle} — YYYY-MM-DD

## {section heading for source 1}

- **[Item title](https://primary-link)** — 1–2 sentence summary. [Discussion](https://secondary-link)
- **[Item title](https://primary-link)** — 1–2 sentence summary. [Discussion](https://secondary-link)

## {section heading for source 2}

- ...
```

**Link conventions:**

- **Primary link** (on the bolded title): the outbound article URL. For Reddit self-posts where `is_self` is true or there is no outbound URL, use the full permalink URL instead. For HN text posts (no `url`), use the HN thread URL as the primary link.
- **Secondary link** (labeled "Discussion" or "HN thread"): the comment thread — `https://reddit.com{permalink}` for Reddit, `https://news.ycombinator.com/item?id={id}` for Hacker News. Omit the secondary link only if it would duplicate the primary link.

Use one blank line between sections. Do not add a table of contents, a footer, or any other boilerplate.

## Step 5: Commit and push

From the `./data` directory:

```bash
git add digests/
git -c user.name="news-digest-bot" -c user.email="news-digest-bot@users.noreply.github.com" \
    commit -m "digest: YYYY-MM-DD" || echo "no changes to commit"
git push
```

If there are no changes (the file is byte-identical to yesterday's run, which should be rare), the commit is skipped and the workflow still succeeds.

## Error handling summary

| Failure mode                             | Behavior                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Malformed `sources.json`                 | Abort, no commit                                                                                    |
| A single source's list-fetch fails       | Log it, emit a section with a one-line "no items available today" note, continue with other sources |
| A single item's article fetch fails      | Skip deep-fetch, summarize from title/body, continue                                                |
| Push is rejected (race with another run) | Pull --rebase once, then push again                                                                 |

## Extending with new source types

When adding a new source type (e.g., `rss`, `github_releases`), the recipe is:

1. Add a discriminated variant to `sources.schema.json`
2. Add a new `### Type: {name}` section to this file with the fetch URL pattern, fields to extract, and section heading convention
3. Add an example entry to `sources.example.json`
4. Update the shape test in `src/__tests__/config.test.js` to recognize the new type

No code needs to change — the next scheduled run picks up the new type automatically.
