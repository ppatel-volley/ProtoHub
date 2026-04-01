import type { Config } from "jest"

const config: Config = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "jest-environment-jsdom",
    testEnvironmentOptions: {
        customExportConditions: ["node", "jest"],
        html: "<!DOCTYPE html><html><head></head><body></body></html>",
    },
    globals: {
        __APP_VERSION__: "1.0.0-test",
    },
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(svg|png|jpg|jpeg|gif)$": "<rootDir>/src/__mocks__/fileMock.ts",
        "^@/(.*)$": "<rootDir>/src/$1",
        "^canvas$": "<rootDir>/src/__mocks__/empty.ts",
        "^@rive-app/canvas$": "<rootDir>/src/__mocks__/empty.ts",
        "^@rive-app/react-canvas$": "<rootDir>/src/__mocks__/rive.ts",
        "^@volley/platform-sdk/lib$": "<rootDir>/src/__mocks__/platform-sdk.ts",
        "^@volley/tracking/lib$":
            "<rootDir>/src/__mocks__/volley-tracking-lib.ts",
        "^@volley/tracking/schemas$":
            "<rootDir>/src/__mocks__/volley-tracking-schemas.ts",
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    setupFilesAfterEnv: ["<rootDir>/test/unit/jest.setup.ts"],
    transform: {
        "^.+\\.(t|j)sx?$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: {
                    jsx: "react-jsx",
                },
            },
        ],
    },
    transformIgnorePatterns: [
        "/node_modules/(?!.*@volley/(platform-sdk|tracking|browser-ipc))",
    ],
    extensionsToTreatAsEsm: [".ts", ".tsx", ".mts"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testMatch: [
        "**/*.spec.tsx",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.test.ts",
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/test/functional",
        "/test/agentic",
    ],
}

export default config
