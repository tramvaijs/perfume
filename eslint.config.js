import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "@typescript-eslint/eslint-plugin";

export default defineConfig([
  globalIgnores(["dist/", ".yarn/"]),

  {
    files: ["src/**/*.ts"],
    extends: [...tseslint.configs["flat/recommended-type-checked"]],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      import: importPlugin,
      jsdoc,
    },
    rules: {
      // @typescript-eslint
      "@typescript-eslint/adjacent-overload-signatures": "error",
      "@typescript-eslint/array-type": [
        "error",
        {
          default: "array-simple",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "no-public",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/member-ordering": "error",
      "@typescript-eslint/naming-convention": [
        "off",
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
      ],
      "@typescript-eslint/no-array-constructor": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-shadow": [
        "error",
        {
          hoist: "all",
        },
      ],
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
        },
      ],
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-namespace-keyword": "error",
      "@typescript-eslint/triple-slash-reference": [
        "error",
        {
          path: "always",
          types: "prefer-import",
          lib: "always",
        },
      ],
      "@typescript-eslint/unified-signatures": "error",

      // import
      "import/order": "error",

      // jsdoc
      "jsdoc/check-alignment": "error",

      // заменённые правила из удалённого плагина @typescript-eslint/tslint
      "no-else-return": [
        "error",
        {
          allowElseIf: true,
        },
      ],
      "no-new-func": "error",
      "no-plusplus": "error",
      "prefer-arrow-callback": "error",

      // базовые правила
      "arrow-body-style": "error",
      "constructor-super": "error",
      curly: ["error", "multi-line"],
      eqeqeq: ["error", "smart"],
      "guard-for-in": "error",
      "id-denylist": "error",
      "id-match": "error",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-cond-assign": "error",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-eval": "error",
      "no-new-wrappers": "error",
      "no-param-reassign": "error",
      "no-throw-literal": "error",
      "no-undef-init": "error",
      "no-unsafe-finally": "error",
      "no-unused-labels": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "one-var": ["error", "never"],
      "prefer-const": "error",
      "prefer-template": "error",
      radix: "error",
      "spaced-comment": [
        "error",
        "always",
        {
          markers: ["/"],
        },
      ],
      "use-isnan": "error",
    },
  },
]);
