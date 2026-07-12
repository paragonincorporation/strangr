import eslint from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "public/**",
      "server/**",
      "test/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "no-console": "error",
    },
  },
  {
    files: [
      "apps/web/**/*.{ts,tsx}",
      "apps/admin/**/*.{ts,tsx}",
      "packages/ui/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat["recommended-latest"].rules,
      ...reactRefresh.configs.vite.rules,
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path", "child_process"],
              message: "Browser code cannot import Node/server-only modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/**/*.{ts,tsx}", "packages/database/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "Server code cannot use browser globals." },
        {
          name: "document",
          message: "Server code cannot use browser globals.",
        },
        {
          name: "navigator",
          message: "Server code cannot use browser globals.",
        },
        {
          name: "localStorage",
          message: "Server code cannot use browser globals.",
        },
      ],
    },
  },
  {
    files: ["apps/api/src/server.ts", "apps/api/src/worker.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.config.{ts,js}", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["apps/web/src/app.tsx", "apps/admin/src/app.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.js"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "no-console": "off",
    },
  },
);
