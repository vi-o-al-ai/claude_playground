# Splendor

Board game engine with multiplayer support. Most complex game in the arcade.

## Source Files

- `engine.js` -- game rules and state management.
- `network.js` -- WebRTC P2P networking via PeerJS (loaded from CDN).
- `asset-store.js` / `asset-ui.js` -- custom art bundle system.
- `ui.js` -- DOM rendering.
- `presets/` -- game preset configurations.

## Multiplayer

Uses PeerJS for WebRTC peer-to-peer connections. Players create/join rooms with lobby system.
