import { type Brand, getActiveBrand } from "../../config/branding"
import type { Environment } from "../../config/environment"

export const BACK_BUTTON_TEXT = "Press BACK to see all games"
export const VISIBILITY_DELAY_MS = 50
export const PAYMENT_SUCCESS_TRANSITION_DELAY_MS = 400

export enum PaymentState {
    SHOWING_QR = "showing_qr",
    PAYMENT_SUCCESS = "payment_success",
    TRANSITIONING = "transitioning",
}

const brandedActivationUrls: Record<Brand, Record<Environment, string>> = {
    volley: {
        local: "pair-dev.volley.tv",
        dev: "pair-dev.volley.tv",
        staging: "pair-staging.volley.tv",
        production: "pair.volley.tv",
    },
    weekend: {
        local: "pair-dev.weekend.com",
        dev: "pair-dev.weekend.com",
        staging: "pair-staging.weekend.com",
        production: "pair.weekend.com",
    },
}

export function getActivationUrl(environment: Environment): string {
    return brandedActivationUrls[getActiveBrand()][environment]
}
