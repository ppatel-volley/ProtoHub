import { expect, test } from "../fixtures"
import { TIMEOUTS, waitForBasicLoad } from "../testHelpers"

test.describe("PNG Detection", () => {
    test("should log error when PNG image is requested", async ({
        page,
        mockExperiment,
    }) => {
        const consoleErrors: string[] = []

        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text())
            }
        })

        await page.route("**/test-image.png", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "image/png",
                body: Buffer.from([]),
            })
        })

        await mockExperiment({})

        await page.goto("./")
        await waitForBasicLoad(page)

        await page.evaluate(() => {
            const img = document.createElement("img")
            img.src = "/test-image.png"
            document.body.appendChild(img)
        })

        await page.waitForTimeout(TIMEOUTS.longWait)

        const hasPngError = consoleErrors.some(
            (log) =>
                log.includes("Suboptimal image requested") &&
                log.includes("test-image.png")
        )

        expect(hasPngError).toBe(true)
    })

    test("should not log error for WebP images", async ({
        page,
        mockExperiment,
    }) => {
        const consoleErrors: string[] = []

        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text())
            }
        })

        await page.route("**/test-image.webp", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "image/webp",
                body: Buffer.from([]),
            })
        })

        await mockExperiment({})

        await page.addInitScript(() => {
            setTimeout(() => {
                const img = document.createElement("img")
                img.src = "/test-image.webp"
                document.body.appendChild(img)
            }, 500)
        })

        await page.goto("./")
        await waitForBasicLoad(page)
        await page.waitForTimeout(TIMEOUTS.longWait)

        const hasPngError = consoleErrors.some((log) =>
            log.includes("Suboptimal image requested")
        )

        expect(hasPngError).toBe(false)
    })

    test("should not log error for volley-favicon.png", async ({
        page,
        mockExperiment,
    }) => {
        const consoleErrors: string[] = []

        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text())
            }
        })

        await page.route("**/volley-favicon.png", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "image/png",
                body: Buffer.from([]),
            })
        })

        await mockExperiment({})

        await page.addInitScript(() => {
            setTimeout(() => {
                const img = document.createElement("img")
                img.src = "/volley-favicon.png"
                document.body.appendChild(img)
            }, 500)
        })

        await page.goto("./")
        await waitForBasicLoad(page)
        await page.waitForTimeout(TIMEOUTS.longWait)

        const hasPngError = consoleErrors.some(
            (log) =>
                log.includes("Suboptimal image requested") &&
                log.includes("volley-favicon.png")
        )

        expect(hasPngError).toBe(false)
    })
})
