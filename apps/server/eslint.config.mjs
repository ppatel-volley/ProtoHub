import { baseConfig } from "@hub/eslint-config/base"

/** @type {import("eslint").Linter.Config} */
export default [
    {
        ignores: ["**/*.mjs"],
    },
    ...baseConfig,
    {
        languageOptions: {
            globals: {
                process: true,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./tsconfig.json",
            },
        },
    },
    {
        files: ["**/*.test.ts", "**/*.spec.ts"],
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-require-imports": "off",
        }
    }
]
