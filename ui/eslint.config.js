// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-unused-vars": "warn", 
      "@typescript-eslint/no-explicit-any": "off", 
      "@typescript-eslint/no-inferrable-types": "off", // Allow explicit type annotations
      "@typescript-eslint/no-empty-function": "off", 
      "@typescript-eslint/array-type": "off", 
      "@typescript-eslint/consistent-type-definitions": "off", 
      "@typescript-eslint/consistent-generic-constructors": "off", 
      "@typescript-eslint/consistent-indexed-object-style": "off", 
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-unused-expressions": "off", 
      "@typescript-eslint/no-empty-object-type": "off", 
      "prefer-const": "off", 
      "no-prototype-builtins": "off",
      "no-case-declarations": "off", 
      "no-useless-escape": "off", 
      "no-unsafe-optional-chaining": "warn", 
      "no-empty": "off", 
      
      // Angular specific rules 
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "off",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      "@angular-eslint/no-input-rename": "off", 
      "@angular-eslint/no-output-rename": "off", 
      "@angular-eslint/no-output-on-prefix": "off", 
      "@angular-eslint/no-output-native": "warn",
      "@angular-eslint/prefer-inject": "off", 
      "@angular-eslint/use-lifecycle-interface": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
    ],
    rules: {
      "@angular-eslint/template/eqeqeq": "warn", 
      "@angular-eslint/template/label-has-associated-control": "off", 
      "@angular-eslint/template/click-events-have-key-events": "off", 
      "@angular-eslint/template/interactive-supports-focus": "off",
    },
  }
);
