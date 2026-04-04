# Fresh Laptop Setup Guide

How to set up a clean macOS environment for development and experimentation.

---

## 1. Programs to Install

### Homebrew (install first — everything else flows from it)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### CLI Tools (via Homebrew)

```bash
brew install node python nmap
```

- **Node.js** — JavaScript runtime (currently v25.x, latest is fine)
- **Python** — currently 3.14.x via Homebrew
- **nmap** — network scanning tool

### GUI Apps (via Homebrew Cask)

```bash
brew install --cask visual-studio-code google-chrome docker
```

| App | Notes |
|-----|-------|
| **VS Code** | Primary editor |
| **Google Chrome** | Secondary browser |
| **Docker Desktop** | Container runtime |
| **Claude Desktop** | Download from [claude.ai/download](https://claude.ai/download) |

### Claude Code (CLI)

```bash
npm install -g @anthropic-ai/claude-code
```

### VS Code Extensions

```bash
code --install-extension anthropic.claude-code
code --install-extension ms-vscode-remote.remote-containers
```

### Shell Config (~/.zshrc)

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## 2. Credentials & Accounts

All credentials are stored in the **Apple Passwords** app (synced via iCloud).

### Accounts to sign into on a fresh install:

| Account | Where to sign in | Credential location |
|---------|-----------------|---------------------|
| **Apple ID / iCloud** | System Settings > Apple ID | Apple Passwords app (on phone or another device first) |
| **GitHub** | `gh auth login` or browser | Apple Passwords |
| **Google (Chrome)** | Chrome browser sign-in | Apple Passwords |
| **Docker Hub** | Docker Desktop or `docker login` | Apple Passwords |
| **Anthropic (Claude)** | Claude Desktop app + claude.ai | Apple Passwords |

### SSH Keys

You currently have **no SSH keys** set up. If you need them (e.g., for GitHub):

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
# Then add ~/.ssh/id_ed25519.pub to GitHub > Settings > SSH Keys
```

### Git Config

You currently have **no global git config**. Set it up:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

---

## 3. Going Back to a Clean State

### Option A: Full macOS Reinstall (nuclear option)

1. Back up anything you want to keep (see below)
2. System Settings > General > Transfer or Reset > Erase All Content and Settings
3. Follow the setup assistant
4. Run this guide from the top

**When to use:** You want a truly clean slate, or something is broken at the OS level.

### Option B: Dev Environment Reset (faster, recommended for experiments)

Reset your dev tools without reinstalling macOS:

```bash
# Remove all Homebrew packages
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"

# Remove Node/npm global state
rm -rf ~/.npm ~/.node-gyp /usr/local/lib/node_modules

# Remove Python user packages
rm -rf ~/.local/lib/python* ~/Library/Caches/pip

# Remove Docker containers, images, and volumes
docker system prune -a --volumes -f

# Remove VS Code extensions and settings
rm -rf ~/.vscode
rm -rf ~/Library/Application\ Support/Code

# Remove Claude Code config
rm -rf ~/.claude

# Remove git config
rm -f ~/.gitconfig

# Remove shell customizations
rm -f ~/.zshrc

# Then reinstall everything using this guide
```

**When to use:** You want a fresh dev environment but don't need to wipe the OS. Much faster (~15 min vs ~1 hour).

### Option C: Project-Only Reset (quickest)

Just wipe your project files and start over:

```bash
rm -rf ~/code/*
```

**When to use:** Your tools are fine, you just want to start fresh on code.

---

## 4. What About Backups?

You're currently not using Time Machine or any backup. **Recommendation:**

- **If your code is all on GitHub:** You probably don't need full backups. Your Apple Passwords sync via iCloud, and this guide gets you back up and running.
- **If you want safety:** Enable Time Machine with an external drive. It's zero-effort and lets you restore individual files or your entire machine.
- **Middle ground:** Just make sure all your repos are pushed to a remote before wiping.

---

## Quick Start Script

Run everything at once on a fresh machine (after Homebrew is installed):

```bash
# CLI tools
brew install node python nmap

# GUI apps
brew install --cask visual-studio-code google-chrome docker

# Claude Code
npm install -g @anthropic-ai/claude-code

# VS Code extensions
code --install-extension anthropic.claude-code
code --install-extension ms-vscode-remote.remote-containers

# Shell config
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Git config (update with your details)
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

echo "Done! Now sign into your accounts (see guide)."
```
