import { detectPng, pngDetector } from "./pngDetection"

describe("pngDetection", () => {
    describe("detectPng", () => {
        it("should return error message for PNG files", () => {
            const result = detectPng("https://example.com/image.png")
            expect(result).toBe(
                "Suboptimal image requested: https://example.com/image.png"
            )
        })

        it("should detect PNG files with uppercase extension", () => {
            const result = detectPng("https://example.com/image.PNG")
            expect(result).toBe(
                "Suboptimal image requested: https://example.com/image.PNG"
            )
        })

        it("should return null for WebP files", () => {
            const result = detectPng("https://example.com/image.webp")
            expect(result).toBeNull()
        })

        it("should return null for AVIF files", () => {
            const result = detectPng("https://example.com/image.avif")
            expect(result).toBeNull()
        })

        it("should return null for JPG files", () => {
            const result = detectPng("https://example.com/image.jpg")
            expect(result).toBeNull()
        })

        it("should return null for volley-favicon.png", () => {
            const result = detectPng("https://example.com/volley-favicon.png")
            expect(result).toBeNull()
        })

        it("should return null for path ending with /volley-favicon.png", () => {
            const result = detectPng(
                "https://example.com/assets/volley-favicon.png"
            )
            expect(result).toBeNull()
        })

        it("should return null for weekend-favicon-48x48.png", () => {
            const result = detectPng(
                "https://example.com/weekend-favicon-48x48.png"
            )
            expect(result).toBeNull()
        })

        it("should return null for weekend focus frame PNG", () => {
            const result = detectPng(
                "https://example.com/assets/images/ui/weekend-focus-frame.png"
            )
            expect(result).toBeNull()
        })

        it("should detect non-favicon PNG files", () => {
            const result = detectPng("https://example.com/my-favicon.png")
            expect(result).toBe(
                "Suboptimal image requested: https://example.com/my-favicon.png"
            )
        })
    })

    describe("pngDetector", () => {
        it("should export detector with correct name", () => {
            expect(pngDetector.name).toBe("png")
        })

        it("should export detector with detect function", () => {
            expect(typeof pngDetector.detect).toBe("function")
            expect(pngDetector.detect).toBe(detectPng)
        })
    })
})
