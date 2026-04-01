import * as branding from "../../config/branding"
import { Environment } from "../../config/environment"
import { getActivationUrl } from "./webCheckoutModalConstants"

jest.mock("../../config/branding", () => ({
    ...jest.requireActual("../../config/branding"),
    getActiveBrand: jest.fn(),
}))

describe("webCheckoutModalConstants", () => {
    describe("getActivationUrl", () => {
        it("returns volley activation URL when brand is volley", () => {
            ;(branding.getActiveBrand as jest.Mock).mockReturnValue("volley")

            expect(getActivationUrl(Environment.LOCAL)).toBe(
                "pair-dev.volley.tv"
            )
            expect(getActivationUrl(Environment.DEVELOPMENT)).toBe(
                "pair-dev.volley.tv"
            )
            expect(getActivationUrl(Environment.STAGING)).toBe(
                "pair-staging.volley.tv"
            )
            expect(getActivationUrl(Environment.PRODUCTION)).toBe(
                "pair.volley.tv"
            )
        })

        it("returns weekend activation URL when brand is weekend", () => {
            ;(branding.getActiveBrand as jest.Mock).mockReturnValue("weekend")

            expect(getActivationUrl(Environment.LOCAL)).toBe(
                "pair-dev.weekend.com"
            )
            expect(getActivationUrl(Environment.DEVELOPMENT)).toBe(
                "pair-dev.weekend.com"
            )
            expect(getActivationUrl(Environment.STAGING)).toBe(
                "pair-staging.weekend.com"
            )
            expect(getActivationUrl(Environment.PRODUCTION)).toBe(
                "pair.weekend.com"
            )
        })
    })
})
