import { getWindowVar } from "../config/envconfig"

const getPlatformAuthApiUrl = (env: string): string => {
    const base = "auth"

    switch (env) {
        // TODO: remove this once we have more robust solution for CORS issues in local dev
        case "local":
            return `https://${base}-dev.volley.tv/`
        case "dev":
            return `https://${base}-dev.volley.tv/`
        case "staging":
            return `https://${base}-staging.volley.tv/`
        case "production":
            return `https://${base}.volley.tv/`
        default:
            return `https://${base}-staging.volley.tv/`
    }
}

/**
 * URL to use for platform API config, defaults to staging
 */
export const PLATFORM_AUTH_API_URL = getPlatformAuthApiUrl(
    getWindowVar("environment", "staging")
)
