import { isShortURL, lengthenURL, URL_SHORTENING_API } from "./urlShortener"

global.fetch = jest.fn()

describe("urlShortener", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe("URL_SHORTENING_API", () => {
        it("should export the correct API URL", () => {
            expect(URL_SHORTENING_API).toBe("https://vly.gg")
        })
    })

    describe("isShortURL", () => {
        it("should return true for valid short URLs", () => {
            expect(isShortURL("https://vly.gg/abc123")).toBe(true)
            expect(isShortURL("https://vly.gg/")).toBe(true)
            expect(isShortURL("https://vly.gg/short-link")).toBe(true)
        })

        it("should return false for non-short URLs", () => {
            expect(isShortURL("https://google.com")).toBe(false)
            expect(isShortURL("https://example.com/abc123")).toBe(false)
            expect(isShortURL("https://vly.com/abc123")).toBe(false)
            expect(isShortURL("http://vly.gg/abc123")).toBe(false) // Different protocol
        })

        it("should return false for invalid URLs", () => {
            expect(isShortURL("not-a-url")).toBe(false)
            expect(isShortURL("")).toBe(false)
            expect(isShortURL("invalid://url")).toBe(false)
        })
    })

    describe("lengthenURL", () => {
        const mockFetch = fetch as jest.MockedFunction<typeof fetch>

        it("should successfully lengthen a short URL", async () => {
            const mockResponse = {
                url: "example.com/full-url",
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response)

            const result = await lengthenURL("https://vly.gg/abc123")

            expect(result).toBe("https://vly.gg/example.com/full-url")
            expect(mockFetch).toHaveBeenCalledWith(
                "https://vly.gg/lengthen?short_link=abc123"
            )
        })

        it("should handle URLs with complex paths", async () => {
            const mockResponse = {
                url: "example.com/path/to/resource?param=value",
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response)

            const result = await lengthenURL("https://vly.gg/complex-path")

            expect(result).toBe(
                "https://vly.gg/example.com/path/to/resource?param=value"
            )
            expect(mockFetch).toHaveBeenCalledWith(
                "https://vly.gg/lengthen?short_link=complex-path"
            )
        })

        it("should throw an error when the API request fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: "Not Found",
            } as Response)

            await expect(lengthenURL("https://vly.gg/invalid")).rejects.toThrow(
                "Failed to lengthen URL: Not Found"
            )
        })

        it("should throw an error when fetch throws", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"))

            await expect(lengthenURL("https://vly.gg/abc123")).rejects.toThrow(
                "Network error"
            )
        })

        it("should handle URLs with special characters in the path", async () => {
            const mockResponse = {
                url: "example.com/path-with-special-chars",
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response)

            const result = await lengthenURL(
                "https://vly.gg/path%20with%20spaces"
            )

            expect(result).toBe(
                "https://vly.gg/example.com/path-with-special-chars"
            )
            expect(mockFetch).toHaveBeenCalledWith(
                "https://vly.gg/lengthen?short_link=path%2520with%2520spaces"
            )
        })

        it("should extract the correct slug from the URL path", async () => {
            const mockResponse = {
                url: "example.com/target",
            }

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse),
                } as Response)

            await lengthenURL("https://vly.gg/slug123")
            expect(mockFetch).toHaveBeenNthCalledWith(
                1,
                "https://vly.gg/lengthen?short_link=slug123"
            )

            await lengthenURL("https://vly.gg/")
            expect(mockFetch).toHaveBeenNthCalledWith(
                2,
                "https://vly.gg/lengthen?short_link="
            )
        })
    })
})
