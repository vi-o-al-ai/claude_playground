# News Digest — Agent Instructions

You are running inside a scheduled GitHub Actions workflow. Your job is to produce a daily news digest by reading a sources config, fetching items from each source, summarizing them, and writing a markdown file that is committed back to the repository.

Follow these steps **in order**. Do not skip steps. Do not invent sources that aren't in the config.

## Inputs and outputs

- **Config path:** `./data/sources.json` (relative to the workflow working directory)
- **Schema (reference only):** `./engine/apps/node/news-digest/sources.schema.json`
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

Reddit gated the anonymous `.json` API in late 2025 (403 to all anonymous clients regardless of IP/UA), but the RSS/Atom feed at `/r/{sub}/top.rss` is still ungated. The workflow **pre-fetches** the Atom XML in a shell step (with a polite UA + retry) before the agent runs. The agent reads the cached XML from disk — **do not call `WebFetch` on Reddit URLs**, it will return 403.

- **Source:** `./data/.fetched/reddit/{subreddit}.xml` — read with the `Read` tool.
- **If the file is missing** for a configured Reddit source, the pre-fetch failed for that subreddit. Per the error-handling table below, emit a section heading with a one-line "no items available today" note and continue.
- **Format:** Atom XML. Each post is an `<entry>` element. Per entry, extract:
  - **Title:** inner text of `<title>`.
  - **Comment thread URL:** entry-level `<link href="…">` (Reddit's comments page for the post).
  - **Author:** `<author><name>` (e.g. `/u/jkmonger`).
  - **Published time:** `<published>` (ISO 8601 timestamp — used for the relative-time field, see Step 4).
  - **Outbound article URL — explicit extraction procedure** (this is the part agents get wrong, follow it literally):
    1. Read the `<content type="html">` text. Reddit double-escapes the inner HTML; after one pass of un-escaping (`&lt;` → `<`, `&quot;` → `"`, `&amp;` → `&`) you'll see normal HTML containing two anchors: one with the visible text `[link]` and one with the visible text `[comments]`.
    2. Find the anchor whose **visible text is exactly `[link]`** (usually wrapped in `<span>…</span>`, sibling to the `[comments]` anchor). Read its `href`. That's the outbound URL.
    3. **Self-post test** — the entry is a self-post if **any** of the following is true:
       - The `[link]` anchor cannot be found.
       - The `[link]` `href` equals the entry's `<link href>` (the comment-thread URL).
       - The `[link]` `href`'s host is exactly `reddit.com` or `www.reddit.com`.
    4. If self-post → use the comment-thread URL as the primary link and **omit** the Discussion link.
       If link post → use the `[link]` `href` as the primary link and the comment-thread URL as the Discussion link.
  - **Self-post body** (when present): the markdown body appears inside `<div class="md">…</div>` within `<content>`. Strip HTML tags before using it as summary input.
- **Not available in RSS:** `score`, `num_comments`. Omit those from the bullet.
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

- **[Item title](https://primary-link)** — 1–2 sentence summary. [Discussion](https://secondary-link) _(2h ago)_
- **[Item title](https://primary-link)** — 1–2 sentence summary. [Discussion](https://secondary-link) _(1d ago)_

## {section heading for source 2}

- ...
```

**Link conventions:**

- **Primary link** (on the bolded title): the outbound article URL. For Reddit self-posts (decided by the procedure in the Reddit section above), use the comment-thread URL as the primary link instead. For HN text posts (no `url`), use the HN thread URL as the primary link.
- **Secondary link** (labeled "Discussion" or "HN thread"): the comment thread — the entry-level `<link href>` for Reddit, `https://news.ycombinator.com/item?id={id}` for Hacker News. Omit the secondary link only if it would duplicate the primary link.

**Posted-time field** (the `*(Xh ago)*` italic at the end of each bullet):

- Source: `<published>` for Reddit (ISO 8601), `time` (Unix epoch seconds) for HN.
- Compute the elapsed time between the post's published time and the current UTC time (use the `date` Bash tool if you need to confirm "now").
- Format:
  - Under 1 hour → `(just now)`
  - 1–23 hours → `(Xh ago)`
  - 1–6 days → `(Xd ago)`
  - 7+ days → use the absolute date: `(May 22)` (the source rarely surfaces posts this old, but render gracefully if it happens).
- Place the field after the Discussion link, with one space, wrapped in `*(…)*`. If there is no Discussion link (self-post), place it after the summary period: `… summary. *(2h ago)*`.

Use one blank line between sections. Do not add a table of contents, a footer, or any other boilerplate.

## Step 5: Commit and push

The data repo is checked out at `./data`. Run each git command as a **separate Bash tool call** using the `git -C ./data <subcommand>` form — do **not** chain with `&&` or use `cd ./data && git ...`, both are blocked by built-in safety checks. The workflow has already configured the bot's `user.name` and `user.email`.

Issue these three Bash calls in order:

1. `git -C ./data add digests/`
2. `git -C ./data commit -m "digest: YYYY-MM-DD"`
3. `git -C ./data push`

If the commit step fails because the file is byte-identical to yesterday's digest (rare), the workflow's verification step will fail the job — that is the desired behavior. Don't try to suppress the commit error.

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
