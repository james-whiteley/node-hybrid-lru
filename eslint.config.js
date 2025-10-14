import eslint from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import security from "eslint-plugin-security";
import rushstackSecurity from "@rushstack/eslint-plugin-security";
import globals from "globals";

export default [
  eslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.config.js"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      security,
      "@rushstack/security": rushstackSecurity,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...security.configs.recommended.rules,
      "security/detect-object-injection": "off",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "no-undef": "off",
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
  },
];

