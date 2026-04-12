---
name: start-issue
description: Use BEFORE starting any new feature, bug fix, issue, or body of work. Pulls latest main and creates a clean feature branch. Must be run before any brainstorming, planning, or implementation.
allowed-tools: Bash(git *)
argument-hint: <branch-name>
---

# Start Working on a New Issue

Set up a clean feature branch from the latest main before doing any work.

1. Ensure working tree is clean (warn if there are uncommitted changes)
2. Switch to main and pull latest:
   ```
   git checkout main
   git pull origin main
   ```
3. Create and switch to a new feature branch named `feat/$ARGUMENTS`
4. Confirm the branch and status:
   ```
   git branch --show-current
   git status
   ```
