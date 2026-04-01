import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "./test/functional",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI
        ? parseInt(process.env.PLAYWRIGHT_WORKERS || "4", 10)
        : undefined,
    reporter: "html",
    use: {
        baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "api",
            testMatch: /.*\.api\.spec\.ts/,
        },
    ],
    webServer: {
        command: "pnpm dev",
        url: process.env.TEST_BASE_URL || "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 10000,
    },
})
