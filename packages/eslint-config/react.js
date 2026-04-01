import { baseConfig } from "./base.js"
import eslintPluginReact from "eslint-plugin-react"
import eslintPluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"

/** @type {import("eslint").Linter.Config} */
export const reactConfig = [
    ...baseConfig,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    },
    {
        plugins: {
            react: eslintPluginReact,
            "react-hooks": eslintPluginReactHooks,
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            // React Hooks rules
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            
            // React specific rules
            "react/jsx-uses-react": "error",
            "react/jsx-uses-vars": "error",
            "react/no-unescaped-entities": "error",
            "react/self-closing-comp": "error",
            "react/jsx-boolean-value": ["error", "never"],
            "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],
            "react/jsx-fragments": ["error", "syntax"],
            "react/jsx-no-useless-fragment": "error",
            "react/jsx-pascal-case": "error",
            "react/no-array-index-key": "warn",
            "react/no-danger": "warn",
            "react/no-deprecated": "error",
            "react/no-direct-mutation-state": "error",
            "react/no-find-dom-node": "error",
            "react/no-is-mounted": "error",
            "react/no-render-return-value": "error",
            "react/no-string-refs": "error",
            "react/no-unknown-property": "error",
            "react/prefer-es6-class": "error",
            "react/prefer-stateless-function": "warn",
            "react/require-render-return": "error",
            "react/void-dom-elements-no-children": "error",
        },
    },
    {
        files: ["**/*.test.tsx", "**/*.spec.tsx", "**/*.test.ts", "**/*.spec.ts"],
        rules: {
            // Relax rules for test files
            "react-hooks/exhaustive-deps": "off",
            "react/no-array-index-key": "off",
        },
    },
]
