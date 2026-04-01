import type { JestConfigWithTsJest } from "ts-jest"

const config: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/test/**/*"],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    testPathIgnorePatterns: ["/node_modules/", "/test/functional/"],
}

export default config
