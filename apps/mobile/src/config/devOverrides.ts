import { ENVIRONMENT } from "./envconfig"
import { Environment } from "./environment"
import { isFireTV } from "./platformDetection"

const isNamedNonProductionEnvironment =
    ENVIRONMENT === Environment.LOCAL ||
    ENVIRONMENT === Environment.DEVELOPMENT ||
    ENVIRONMENT === Environment.STAGING

const searchParams = new URLSearchParams(window.location.search)

function createDevOverride(param: string, matchValue = "true"): boolean {
    return (
        searchParams.get(param) === matchValue &&
        isNamedNonProductionEnvironment
    )
}

export const SHOULD_USE_DEV_UPSELL =
    createDevOverride("dev-upsell") && !isFireTV()

export const SHOULD_FORCE_WEB_CHECKOUT = createDevOverride("force-web-checkout")

export const SHOULD_FORCE_PLATFORM_ERROR = createDevOverride(
    "force-platform-error"
)

export const SHOULD_FORCE_CHUNK_LOAD_ERROR =
    createDevOverride("force-chunk-error")

export const SHOULD_USE_IDENTITY_API_OVERRIDE = createDevOverride(
    "identity-api-override"
)

export const SHOULD_SKIP_VIDEO = createDevOverride("skip-video")

export const SHOULD_SIMULATE_LG = createDevOverride("simulateLG")

export const SHOULD_SIMULATE_SAMSUNG = createDevOverride("simulateSamsung")

export const SHOULD_FORCE_IDENT_AUTOPLAY_FAIL = createDevOverride(
    "identAutoplay",
    "fail"
)

export const IDENT_URL_OVERRIDE: string = ((): string => {
    if (!isNamedNonProductionEnvironment) return ""
    const override = searchParams.get("identUrl")
    return typeof override === "string" ? override : ""
})()

export const SHOULD_FORCE_WEEKEND_REBRAND = createDevOverride(
    "force-weekend-rebrand"
)

export const SHOULD_FORCE_UNSUBSCRIBED = createDevOverride("force-unsubscribed")

export const SHOULD_FORCE_WEEKEND_REBRAND_MODAL = createDevOverride(
    "force-weekend-modal"
)

export const SHOULD_FORCE_APP_DOWNLOAD_PAGE: boolean = createDevOverride(
    "forceAppDownloadPage"
)

export const EXPERIMENT_VARIANT_OVERRIDES: Record<string, string> = ((): Record<
    string,
    string
> => {
    if (!isNamedNonProductionEnvironment) return {}
    const overrides: Record<string, string> = {}
    const raw = searchParams.get("experiment-override")
    if (raw) {
        for (const pair of raw.split(",")) {
            const [flag, value] = pair.split(":")
            if (flag && value) overrides[flag] = value
        }
    }
    return overrides
})()
