import { includeIgnoreFile } from "@eslint/compat"
import { reactConfig } from "@hub/eslint-config/react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import globals from "globals"
import noAbsoluteGoto from "./test/functional/eslint-rules/no-absolute-goto.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, "../../.gitignore")

/**
 * ABOUTME: ESLint configuration for the Hub client application
 * ABOUTME: Uses separate tsconfig files for source, functional tests, and unit tests to prevent type conflicts
 *
 * Separate tsconfig files prevent Jest and Playwright's conflicting `expect()` types
 * from causing TypeScript errors while still linting all files.
 */

/** @type {import("eslint").Linter.Config} */
export default [
    includeIgnoreFile(gitignorePath),
    ...reactConfig,
    // Source files use the main tsconfig
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
    // Functional tests use Playwright-specific tsconfig to avoid type conflicts with Jest
    {
        files: ["test/functional/**/*.ts"],
        ignores: ["test/functional/eslint-rules/**"],
        languageOptions: {
            globals: {
                process: true,
                ...globals.node,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./test/functional/tsconfig.json",
            },
        },
        plugins: {
            "hub-functional-tests": {
                rules: {
                    "no-absolute-goto": noAbsoluteGoto,
                },
            },
        },
        rules: {
            "hub-functional-tests/no-absolute-goto": "warn",
        },
    },
    // Unit tests use Jest-specific tsconfig to avoid type conflicts with Playwright
    {
        files: ["test/unit/**/*.ts", "test/unit/**/*.tsx"],
        languageOptions: {
            globals: {
                process: true,
                ...globals.node,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./test/unit/tsconfig.json",
            },
        },
    },
    // Agentic tests use Playwright-specific tsconfig
    {
        files: ["test/agentic/**/*.ts"],
        languageOptions: {
            globals: {
                process: true,
                ...globals.node,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./test/agentic/tsconfig.json",
            },
        },
    },
    {
        ignores: [
            "**/*.d.ts",
            "public/config.js",
            "scripts/build-env-config.js",
            "test/functional/eslint-rules/**",
            "playwright-report-agentic/**",
            "public/assets/videos/stream/**",
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
