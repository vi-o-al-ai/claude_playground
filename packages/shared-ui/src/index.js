/**
 * @arcade/shared-ui — Shared UI component library for AI Games Arcade
 *
 * Provides reusable, vanilla-JS components that any game can opt into:
 *
 *   import { Modal, GameHeader, GameOver } from '@arcade/shared-ui';
 *
 * For theming, import the CSS file directly:
 *
 *   import '@arcade/shared-ui/theme';   // via bundler
 *   <link rel="stylesheet" href="…/packages/shared-ui/src/theme.css">
 */

export { Modal } from "./modal.js";
export { GameHeader } from "./game-header.js";
export { GameOver } from "./game-over.js";
