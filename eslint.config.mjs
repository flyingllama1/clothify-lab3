import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["frontend/**", "coverage/**", "test-results/**", "playwright-report/**", "release/**"] },
  {
    ...js.configs.recommended,
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: { globals: globals.node },
  },
];
