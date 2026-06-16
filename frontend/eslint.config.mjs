import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  {
    files: ["app.js.tpl"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly",
        fetch: "readonly"
      }
    }
  },
  {
    files: ["eslint.config.mjs", "scripts/**/*.mjs", "test/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        URL: "readonly"
      }
    }
  }
];
