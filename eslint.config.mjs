import js from "@eslint/js";
import globals from "globals";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import json from "@eslint/json";
import css from "@eslint/css";

export default [
  {
    ignores: [
      ".claude/**",
      ".agents/**",
      ".github/**",
      ".idx/**",
      "dist/**",
      "dist-electron/**",
      "release/**",
      "node_modules/**",
      "temp/**",
      "reports/**",
      "scripts/**",
      "renderer/**",
      "skills-lock.json",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {
      ...tseslintPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },

  {
    files: ["**/*.json"],
    ignores: ["**/tsconfig*.json", "package-lock.json", "package.json"],
    plugins: { json },
    rules: { ...json.configs.recommended.rules },
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    rules: { ...json.configs.recommended.rules },
  },
  {
    ignores: ["**/*.md"],
  },
  {
    files: ["**/*.css"],
    ignores: ["src/index.css"],
    plugins: { css },
    rules: {
      ...css.configs.recommended.rules,
      "css/no-invalid-at-rules": "off",
    },
  },
];
