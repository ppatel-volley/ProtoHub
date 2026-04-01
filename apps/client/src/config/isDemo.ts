import { getQueryParam } from "@volley/platform-sdk/lib"

export function isDemo(): boolean {
    return getQueryParam("demo") === "true"
}
