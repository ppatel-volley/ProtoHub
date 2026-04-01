import { getAsset } from "../config/branding"
import { IDENT_URL_OVERRIDE } from "../config/devOverrides"
import { BASE_URL } from "../config/envconfig"

export const getVideoIdent = (): string => {
    const override = IDENT_URL_OVERRIDE
    if (override && override.trim() !== "") {
        return override
    }
    return `${BASE_URL}${getAsset("videoIdent")}`
}
