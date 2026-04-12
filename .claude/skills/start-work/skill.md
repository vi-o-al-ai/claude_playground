---
name: start-work
description: Use BEFORE starting any new feature, bug fix, or body of work. Creates a GitHub issue, then sets up a clean feature branch. Must be run before any brainstorming, planning, or implementation.
allowed-tools: Bash(gh *), Bash(git *)
argument-hint: <short description of the work>
---

# Start Work

Create a GitHub issue for the proposed work, then set up a clean feature branch.

## Step 1: Create an issue

Create a new issue with a clear title and brief description derived from `$ARGUMENTS`:

```
gh issue create --title "<title>" --body "<description>"
```

Keep the body to 1-2 sentences describing the goal.

## Step 2: Set up feature branch

Run the `/start-issue` skill with a branch name derived from the issue:

```
/start-issue <issue-number>-<short-slug>
```

For example, issue #42 about "add dark mode" becomes: `/start-issue 42-add-dark-mode`
