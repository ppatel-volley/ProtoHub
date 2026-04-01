import { ENVIRONMENT } from "../../config/envconfig"
import { Environment } from "../../config/environment"

/**
 * Get the Volley Identity API base URL based on the environment
 */
const getIdentityApiUrl = (env: Environment): string => {
    switch (env) {
        case Environment.LOCAL:
            return "https://auth-dev.volley.tv"
        case Environment.DEVELOPMENT:
            return "https://auth-dev.volley.tv"
        case Environment.STAGING:
            return "https://auth-staging.volley.tv"
        case Environment.PRODUCTION:
            return "https://auth.volley.tv"
        default:
            return "https://auth-dev.volley.tv"
    }
}

/**
 * Identity API base URL - dynamically configured based on environment
 */
export const IDENTITY_API_BASE_URL = getIdentityApiUrl(ENVIRONMENT)
