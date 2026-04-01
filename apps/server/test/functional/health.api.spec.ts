import { expect, test } from "@playwright/test"

test.describe("API Health Check", () => {
    test("should return 200 OK for health check endpoint", async ({
        request,
    }) => {
        const response = await request.get("/health")
        expect(response.status()).toBe(200)
        const body = await response.json()
        expect(body).toHaveProperty("status", "OK")
        expect(body).toHaveProperty("timestamp")
        expect(body).toHaveProperty("redis")
        expect(body).toHaveProperty("uptime")
        expect(body).toHaveProperty("memory")
        expect(body).toHaveProperty("environment")
        expect(body).toHaveProperty("system")
        expect(body).toHaveProperty("server")
    })
})
