import { OverridenGameOrchestration } from "./OverridenGameOrchestration"

jest.mock("@volley/platform-sdk/lib", () => ({
    getPlatform: jest.fn(() => "test-platform"),
}))

describe("OverridenGameOrchestration", () => {
    let orchestration: OverridenGameOrchestration
    const hubSessionId = "test-hub-session-id"

    beforeEach(() => {
        orchestration = new OverridenGameOrchestration(hubSessionId)
        delete (window as any).location
        window.location = { search: "" } as any
    })

    describe("launchGame", () => {
        it("should launch game with encoded URL from query params", async () => {
            const gameId = "test-game"
            const gameUrl = "https://game.example.com/play?param=value"
            const encodedUrl = encodeURIComponent(gameUrl)

            window.location.search = `?${gameId}=${encodedUrl}`

            const result = await orchestration.launchGame(gameId)

            expect(result.url).toContain("https://game.example.com/play")
            expect(result.url).toContain("param=value")
            expect(result.url).toContain("volley_platform=test-platform")
            expect(result.url).toContain(
                `volley_hub_session_id=${hubSessionId}`
            )
        })

        it("should add volley params to URL without existing query params", async () => {
            const gameId = "simple-game"
            const gameUrl = "https://game.example.com/play"
            const encodedUrl = encodeURIComponent(gameUrl)

            window.location.search = `?${gameId}=${encodedUrl}`

            const result = await orchestration.launchGame(gameId)

            const url = new URL(result.url)
            expect(url.searchParams.get("volley_platform")).toBe(
                "test-platform"
            )
            expect(url.searchParams.get("volley_hub_session_id")).toBe(
                hubSessionId
            )
        })

        it("should preserve existing query params when adding volley params", async () => {
            const gameId = "game-with-params"
            const gameUrl =
                "https://game.example.com/play?level=1&mode=hard&score=100"
            const encodedUrl = encodeURIComponent(gameUrl)

            window.location.search = `?${gameId}=${encodedUrl}`

            const result = await orchestration.launchGame(gameId)

            const url = new URL(result.url)
            expect(url.searchParams.get("level")).toBe("1")
            expect(url.searchParams.get("mode")).toBe("hard")
            expect(url.searchParams.get("score")).toBe("100")
            expect(url.searchParams.get("volley_platform")).toBe(
                "test-platform"
            )
            expect(url.searchParams.get("volley_hub_session_id")).toBe(
                hubSessionId
            )
        })

        it("should throw error when game URL is not found in query params", () => {
            const gameId = "non-existent-game"
            window.location.search = "?other-game=https://example.com"

            expect(() => orchestration.launchGame(gameId)).toThrow(
                "Encoded URL not found for non-existent-game"
            )
        })

        it("should handle multiple games in query params", async () => {
            const gameId1 = "game1"
            const gameId2 = "game2"
            const gameUrl1 = "https://game1.example.com/play"
            const gameUrl2 = "https://game2.example.com/play"

            window.location.search = `?${gameId1}=${encodeURIComponent(gameUrl1)}&${gameId2}=${encodeURIComponent(gameUrl2)}`

            const result1 = await orchestration.launchGame(gameId1)
            const result2 = await orchestration.launchGame(gameId2)

            expect(result1.url).toContain("game1.example.com")
            expect(result2.url).toContain("game2.example.com")
        })

        it("should handle special characters in URL params", async () => {
            const gameId = "special-game"
            const gameUrl =
                "https://game.example.com/play?name=Test%20Game&price=$99"
            const encodedUrl = encodeURIComponent(gameUrl)

            window.location.search = `?${gameId}=${encodedUrl}`

            const result = await orchestration.launchGame(gameId)

            const url = new URL(result.url)
            expect(url.searchParams.get("name")).toBe("Test Game")
            expect(url.searchParams.get("price")).toBe("$99")
            expect(url.searchParams.get("volley_platform")).toBe(
                "test-platform"
            )
        })

        it("should handle URL with fragment identifier", async () => {
            const gameId = "fragment-game"
            const gameUrl = "https://game.example.com/play#section"
            const encodedUrl = encodeURIComponent(gameUrl)

            window.location.search = `?${gameId}=${encodedUrl}`

            const result = await orchestration.launchGame(gameId)

            expect(result.url).toContain("#section")
            expect(result.url).toContain("volley_platform=test-platform")
        })

        it("should override existing volley params if present in original URL", async () => {
            const gameId = "override-game"
            const gameUrl =
                "https://game.example.com/play?volley_platform=old-platform&volley_hub_session_id=old-session"
            const encodedUrl = encodeURIComponent(gameUrl)

            window.location.search = `?${gameId}=${encodedUrl}`

            const result = await orchestration.launchGame(gameId)

            const url = new URL(result.url)
            expect(url.searchParams.get("volley_platform")).toBe(
                "test-platform"
            )
            expect(url.searchParams.get("volley_hub_session_id")).toBe(
                hubSessionId
            )
        })
    })

    describe("exitGame", () => {
        it("should return success response", async () => {
            const result = await orchestration.exitGame()

            expect(result).toEqual({ success: true })
        })

        it("should always succeed as a no-op", async () => {
            const results = await Promise.all([
                orchestration.exitGame(),
                orchestration.exitGame(),
                orchestration.exitGame(),
            ])

            results.forEach((result) => {
                expect(result.success).toBe(true)
            })
        })
    })
})
