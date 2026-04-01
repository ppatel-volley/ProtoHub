import eslint from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import eslintPluginSimpleImportSort from "eslint-plugin-simple-import-sort"
import eslintPluginUnusedImports from "eslint-plugin-unused-imports"
import typescriptEslint from "typescript-eslint"
import sortClassMembers from "eslint-plugin-sort-class-members"

/** @type {import("eslint").Linter.Config} */
export const baseConfig = typescriptEslint.config(
    {
        ignores: ["node_modules", "dist", "coverage", "eslint.config.mjs"],
    },
    /* Configs */
    eslint.configs.recommended,
    eslintConfigPrettier,
    ...typescriptEslint.configs.recommendedTypeChecked,
    {
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/consistent-type-exports": "error",
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                {
                    accessibility: "explicit",
                    overrides: {
                        constructors: "no-public",
                    },
                },
            ],
            "lines-between-class-members": [
                "error",
                "always",
                {
                    exceptAfterSingleLine: false,
                },
            ],
        },
    },
    /* Plugins */
    eslintPluginPrettierRecommended,
    {
        plugins: {
            "simple-import-sort": eslintPluginSimpleImportSort,
        },
        rules: {
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },
    {
        plugins: {
            "unused-imports": eslintPluginUnusedImports,
        },
        rules: {
            "unused-imports/no-unused-imports": "error",
        },
    },
    {
        plugins: {
            "sort-class-members": sortClassMembers,
        },
        rules: {
            "sort-class-members/sort-class-members": [
                "error",
                {
                    order: [
                        "[properties]",
                        "[accessor-pairs]",
                        "[getters]",
                        "[setters]",
                        "[public-methods]",
                        "[protected-methods]",
                        "[private-methods]",
                        "[public-static-methods]",
                        "[everything-else]",
                    ],
                    groups: {
                        properties: [
                            {
                                type: "property",
                                sort: "alphabetical",
                            },
                        ],
                        getters: [
                            {
                                type: "method",
                                sort: "alphabetical",
                                kind: "get",
                            },
                        ],
                        setters: [
                            {
                                type: "method",
                                sort: "alphabetical",
                                kind: "set",
                            },
                        ],
                        "public-methods": [
                            {
                                type: "method",
                                accessibility: "public",
                                kind: "nonAccessor",
                            },
                        ],
                        "protected-methods": [
                            {
                                type: "method",
                                accessibility: "protected",
                                kind: "nonAccessor",
                            },
                        ],
                        "private-methods": [
                            {
                                type: "method",
                                accessibility: "private",
                                kind: "nonAccessor",
                            },
                        ],
                        "public-static-methods": [
                            {
                                type: "method",
                                accessibility: "public",
                                kind: "nonAccessor",
                                static: true,
                            },
                        ],
                    },
                    accessorPairPositioning: "getThenSet",
                },
            ],
        },
    }
)
