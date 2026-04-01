import { defineConfig, devices } from "@playwright/test"

const isStaging = process.env.TEST_ENVIRONMENT === "staging"
const useMocks = process.env.USE_MOCKS === "true"
const timeoutMultiplier = isStaging ? 3 : 1

const baseUseConfig = {
    ...devices["Desktop Chrome"],
    launchOptions: {
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
        headless: true,
    },
}

const config = defineConfig({
    testDir: "./test/functional",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI
        ? parseInt(process.env.PLAYWRIGHT_WORKERS || "4", 10)
        : undefined,
    reporter: "html",
    timeout: 30000 * timeoutMultiplier,
    expect: {
        timeout: 5000 * timeoutMultiplier,
    },
    use: {
        ...baseUseConfig,
        baseURL: process.env.TEST_BASE_URL || "http://localhost:4173/hub/",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        actionTimeout: 5000 * timeoutMultiplier,
        navigationTimeout: 5000 * timeoutMultiplier,
    },
    projects: useMocks
        ? [
              {
                  name: "chromium",
                  use: baseUseConfig,
              },
          ]
        : [
              {
                  name: "auth-subscribed",
                  testMatch: /auth\.subscribed\.setup\.ts/,
              },
              {
                  name: "auth-unsubscribed",
                  testMatch: /auth\.unsubscribed\.setup\.ts/,
              },

              {
                  name: "subscribed",
                  testMatch: [
                      /hub-home\/(?!.*\.mocked).+\.spec\.ts/,
                      /hub-launch\/(?!.*\.mocked).+\.spec\.ts/,
                      /game-launch\/(?!.*\.mocked).+\.spec\.ts/,
                      /web-checkout\/subscribed-bypass\.spec\.ts/,
                      /web-checkout\/subscription-persistence-subscribed\.spec\.ts/,
                  ],
                  use: {
                      ...baseUseConfig,
                      storageState: "./playwright-cache/.auth/subscribed.json",
                  },
                  dependencies: ["auth-subscribed"],
              },

              {
                  name: "unsubscribed",
                  testMatch: [
                      /web-checkout\/upsell-ui\.spec\.ts/,
                      /web-checkout\/game-selection-ui\.spec\.ts/,
                      /web-checkout\/subscription-persistence-unsubscribed\.spec\.ts/,
                      /tracking\/tracking-flows\.spec\.ts/,
                  ],
                  use: {
                      ...baseUseConfig,
                      storageState:
                          "./playwright-cache/.auth/unsubscribed.json",
                  },
                  dependencies: ["auth-unsubscribed"],
              },

              {
                  name: "mocked",
                  testMatch: /\.mocked\.spec\.ts/,
                  use: baseUseConfig,
              },

              {
                  name: "examples",
                  testMatch: /examples\/.+\.spec\.ts/,
                  use: baseUseConfig,
              },
          ],
    ...(process.env.TEST_ENVIRONMENT !== "staging" &&
        !process.env.TEST_BASE_URL && {
            webServer: {
                command: "vite preview --base=/hub/ --port 4173 --strictPort",
                url: "http://localhost:4173/hub/",
                reuseExistingServer: !process.env.CI,
                timeout: 30000,
                stdout: "pipe",
                stderr: "pipe",
            },
        }),
})

export default config
