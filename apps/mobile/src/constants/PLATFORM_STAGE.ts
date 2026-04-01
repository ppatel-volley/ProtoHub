import { getWindowVar } from "../config/envconfig"

type PlatformStage = "local" | "test" | "dev" | "staging" | "production"

/**
 * Map env string to valid platformn stage value
 */
const mapEnvironmentToStage = (env: string): PlatformStage => {
    switch (env) {
        case "local":
        case "test":
        case "dev":
        case "staging":
        case "production":
            return env as PlatformStage
        default:
            return "staging"
    }
}

/**
 * Platform stage to use for SDK config, defaults to staging
 */
export const PLATFORM_STAGE = mapEnvironmentToStage(
    getWindowVar("environment", "staging")
)
