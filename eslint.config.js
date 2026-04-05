import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import html from "eslint-plugin-html";

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
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
        HTMLElement: "readonly",
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
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      eqeqeq: ["error", "always"],
      curly: ["error", "multi-line"],
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    files: ["ai_games/**/*.js"],
    languageOptions: {
      sourceType: "script",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^Sudoku$" }],
    },
  },
  {
    files: ["ai_games/sudoku/game.js"],
    languageOptions: {
      globals: {
        Sudoku: "readonly",
      },
    },
  },
  {
    files: ["**/*.html"],
    plugins: { html },
  },
  {
    ignores: ["node_modules/", "dist/", "*.config.js"],
  },
];
