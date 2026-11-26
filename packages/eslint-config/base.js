import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"
import tseslint from "typescript-eslint"

export const baseRestrictedSyntax = [
  {
    selector: "TSAsExpression > TSUnknownKeyword",
    message:
      "Avoid `as unknown` type escapes; narrow or type the boundary properly instead.",
  },
]

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      turbo: turboPlugin,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "no-restricted-syntax": ["error", ...baseRestrictedSyntax],
    },
  },
  {
    ignores: ["dist/**"],
  },
]
