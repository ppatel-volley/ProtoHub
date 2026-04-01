import { includeIgnoreFile } from "@eslint/compat"
import { reactConfig } from "@hub/eslint-config/react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import globals from "globals"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, "../../.gitignore")

/** @type {import("eslint").Linter.Config} */
export default [
    includeIgnoreFile(gitignorePath),
    ...reactConfig,
    {
        files: ["src/**/*.ts", "src/**/*.tsx", "*.ts", "*.tsx", "*.mjs"],
        languageOptions: {
            globals: {
                process: true,
                ...globals.node,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./tsconfig.json",
            },
        },
    },
    // Test files need separate tsconfig handling
    {
        files: ["test/**/*.ts", "test/**/*.tsx"],
        languageOptions: {
            globals: {
                process: true,
                ...globals.node,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./tsconfig.json",
            },
        },
    },
    {
        ignores: [
            "**/*.d.ts",
            "public/config.js",
            "scripts/build-env-config.js",
        ],
    },
    {
        files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
        rules: {
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-require-imports": "off",
        },
    },
]
