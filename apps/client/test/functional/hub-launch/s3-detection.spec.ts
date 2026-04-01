import { expect, test } from "../fixtures"
import { TIMEOUTS, waitForBasicLoad } from "../testHelpers"

test.describe("S3 Detection", () => {
    test("should log error when S3 URL with amazonaws.com is requested", async ({
        page,
        mockExperiment,
    }) => {
        const consoleErrors: string[] = []

        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text())
            }
        })

        await page.route("**/bucket.s3.amazonaws.com/**", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "image/webp",
                body: Buffer.from([]),
            })
        })

        await mockExperiment({})

        await page.goto("./")
        await waitForBasicLoad(page)

        await page.evaluate(() => {
            const img = document.createElement("img")
            img.src = "https://bucket.s3.amazonaws.com/test-image.webp"
            document.body.appendChild(img)
        })

        await page.waitForTimeout(TIMEOUTS.longWait)

        const hasS3Error = consoleErrors.some(
            (log) =>
                log.includes("Direct S3 URL requested") &&
                log.includes("bucket.s3.amazonaws.com")
        )

        expect(hasS3Error).toBe(true)
    })

    test("should not log error for CloudFront URLs", async ({
        page,
        mockExperiment,
    }) => {
        const consoleErrors: string[] = []

        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text())
            }
        })

        await page.route("**/d123abc.cloudfront.net/**", (route) => {
            void route.fulfill({
                status: 200,
                contentType: "image/webp",
                body: Buffer.from([]),
            })
        })

        await mockExperiment({})

        await page.goto("./")
        await waitForBasicLoad(page)

        await page.evaluate(() => {
            const img = document.createElement("img")
            img.src = "https://d123abc.cloudfront.net/test-image.webp"
            document.body.appendChild(img)
        })

        await page.waitForTimeout(TIMEOUTS.longWait)

        const hasS3Error = consoleErrors.some((log) =>
            log.includes("Direct S3 URL requested")
        )

        expect(hasS3Error).toBe(false)
    })
})
