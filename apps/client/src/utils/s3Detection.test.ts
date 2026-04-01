import { detectS3, s3Detector } from "./s3Detection"

describe("s3Detection", () => {
    describe("detectS3", () => {
        it("should return error message for amazonaws.com URLs", () => {
            const url = "https://my-bucket.s3.amazonaws.com/image.webp"
            const result = detectS3(url)
            expect(result).toBe(`Direct S3 URL requested: ${url}`)
        })

        it("should detect S3 URL with s3. prefix", () => {
            const url = "https://s3.us-east-1.amazonaws.com/bucket/file.jpg"
            const result = detectS3(url)
            expect(result).toBe(`Direct S3 URL requested: ${url}`)
        })

        it("should detect S3 URL with .s3. infix", () => {
            const url = "https://bucket.s3.us-west-2.amazonaws.com/asset.mp4"
            const result = detectS3(url)
            expect(result).toBe(`Direct S3 URL requested: ${url}`)
        })

        it("should return null for CloudFront URLs", () => {
            const result = detectS3("https://d123456.cloudfront.net/image.webp")
            expect(result).toBeNull()
        })

        it("should return null for non-S3 URLs", () => {
            const result = detectS3("https://example.com/image.webp")
            expect(result).toBeNull()
        })

        it("should return null for CDN URLs", () => {
            const result = detectS3("https://cdn.example.com/asset.jpg")
            expect(result).toBeNull()
        })

        it("should detect any URL containing amazonaws.com", () => {
            const url = "https://test.amazonaws.com/path/to/resource"
            const result = detectS3(url)
            expect(result).toBe(`Direct S3 URL requested: ${url}`)
        })
    })

    describe("s3Detector", () => {
        it("should export detector with correct name", () => {
            expect(s3Detector.name).toBe("s3")
        })

        it("should export detector with detect function", () => {
            expect(typeof s3Detector.detect).toBe("function")
            expect(s3Detector.detect).toBe(detectS3)
        })
    })
})
