import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import html from "eslint-plugin-html";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  localStorage: "readonly",
  setTimeout: "readonly",
  setInterval: "readonly",
  clearTimeout: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  alert: "readonly",
  confirm: "readonly",
  prompt: "readonly",
  navigator: "readonly",
  fetch: "readonly",
  Image: "readonly",
  Audio: "readonly",
  Blob: "readonly",
  File: "readonly",
  FileReader: "readonly",
  HTMLElement: "readonly",
  Node: "readonly",
  KeyboardEvent: "readonly",
  MouseEvent: "readonly",
  Event: "readonly",
  CustomEvent: "readonly",
  URLSearchParams: "readonly",
  URL: "readonly",
  location: "readonly",
  history: "readonly",
  performance: "readonly",
  crypto: "readonly",
  structuredClone: "readonly",
  ClipboardEvent: "readonly",
  Clipboard: "readonly",
  btoa: "readonly",
  atob: "readonly",
  Peer: "readonly",
};

const sharedRules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  "no-console": "off",
  eqeqeq: ["error", "always"],
  curly: ["error", "multi-line"],
  "no-var": "error",
  "prefer-const": "warn",
};

export default [
  {
    // Global ignores — non-JS packages, build output, configs
    ignores: [
      "node_modules/",
      "**/node_modules/",
      "**/dist/",
      "**/*.config.js",
      // Non-JS game packages
      "games/runner/",
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: sharedRules,
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      ...sharedRules,
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern:
            "^(startGame|toggleMode|startLocalGame|createRoom|joinRoom|sendChatMsg|resetTimeline|exportData|importData|startOnlineGame|copyRoomCode|confirmAction|confirmGemReturn|showChat|hideChat|elapsedInterval)$",
        },
      ],
    },
  },
  {
    // Service worker files — use service worker globals
    files: ["**/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        clients: "readonly",
      },
    },
  },
  {
    // Legacy non-module game scripts (not in src/)
    files: ["games/sudoku/sudoku.js", "games/sudoku/game.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        Sudoku: "writable",
        Game: "writable",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^(Sudoku|Game)$" }],
      "no-redeclare": "off",
    },
  },
];
