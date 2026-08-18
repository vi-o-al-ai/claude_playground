import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import html from "eslint-plugin-html";
import globals from "globals";

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
      "games/godot/runner/",
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
    rules: sharedRules,
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: globals.browser,
    },
    rules: {
      ...sharedRules,
      // Inline <script> handlers are referenced from `onclick="..."` (and
      // similar) attributes in the surrounding markup, which ESLint does not
      // parse. Every such function looks unused, so the rule is off for HTML.
      "no-unused-vars": "off",
    },
  },
  {
    // Service worker files — use service worker globals
    files: ["**/sw.js"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    // Repo tooling scripts run under Node, not the browser
    files: ["scripts/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: sharedRules,
  },
];
