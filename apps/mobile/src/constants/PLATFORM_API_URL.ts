import { getWindowVar } from "../config/envconfig"

const getPlatformApiUrl = (env: string): string => {
    const base = "platform"

    switch (env) {
        // TODO: remove this once we have more robust solution for CORS issues in local dev
        case "local":
            return "https://platform-dev.volley-services.net/"
        case "dev":
            return `https://${base}-dev.volley-services.net/`
        case "staging":
            return `https://${base}-staging.volley-services.net/`
        case "production":
            return `https://${base}.volley-services.net/`
        default:
            return `https://${base}-staging.volley-services.net/`
    }
}

/**
 * URL to use for platform API config, defaults to staging
 */
export const PLATFORM_API_URL = getPlatformApiUrl(
    getWindowVar("environment", "staging")
)
