import type { ResourceDetector } from "./resourceDetection"

/**
 * Detects direct S3 URL requests to enforce the use of CloudFront CDN over direct S3 access.
 */
export function detectS3(url: string): string | null {
    if (url.toLowerCase().includes(".amazonaws.com")) {
        return `Direct S3 URL requested: ${url}`
    }
    return null
}

export const s3Detector: ResourceDetector = {
    name: "s3",
    detect: detectS3,
}
