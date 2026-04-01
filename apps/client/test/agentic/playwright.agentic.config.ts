import { defineConfig, devices } from "@playwright/test"
import { config } from "dotenv"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "../../.env") })

const baseUseConfig = {
    ...devices["Desktop Chrome"],
    launchOptions: {
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
        headless: process.env.HEADED !== "true",
    },
}

/**
 * Playwright configuration for agentic tests.
 * Uses real authentication like functional tests.
 */
export default defineConfig({
    testDir: "./",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [["html", { outputFolder: "../../playwright-report-agentic" }]],
    timeout: 1000 * 60 * 10,
    expect: {
        timeout: 10000,
    },
    use: {
        ...baseUseConfig,
        baseURL: process.env.TEST_BASE_URL || "http://localhost:4173/hub/",
        trace: "on",
        screenshot: "on",
        video: "on",
    },
    projects: [
        // Auth setup projects
        {
            name: "auth-subscribed",
            testMatch: "**/auth.subscribed.setup.ts",
        },
        {
            name: "auth-unsubscribed",
            testMatch: "**/auth.unsubscribed.setup.ts",
        },

        // Subscribed user tests
        {
            name: "subscribed",
            testMatch: "**/subscribed.spec.ts",
            use: {
                ...baseUseConfig,
                storageState:
                    "./playwright-cache/.auth/agentic-subscribed.json",
            },
            dependencies: ["auth-subscribed"],
        },

        // Unsubscribed user tests
        {
            name: "unsubscribed",
            testMatch: "**/unsubscribed.spec.ts",
            use: {
                ...baseUseConfig,
                storageState:
                    "./playwright-cache/.auth/agentic-unsubscribed.json",
            },
            dependencies: ["auth-unsubscribed"],
        },
    ],
    ...(process.env.TEST_ENVIRONMENT !== "staging" &&
        !process.env.TEST_BASE_URL && {
            webServer: {
                command: "vite preview --base=/hub/ --port 4173 --strictPort",
                cwd: resolve(__dirname, "../.."),
                url: "http://localhost:4173/hub/",
                reuseExistingServer: !process.env.CI,
                timeout: 30000,
                stdout: "pipe",
                stderr: "pipe",
            },
        }),
})
