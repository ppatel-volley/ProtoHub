import { Environment } from "../../config/environment"

let mockEnvironmentValue = Environment.LOCAL

jest.mock("../../config/envconfig", () => ({
    get ENVIRONMENT(): Environment {
        return mockEnvironmentValue
    },
}))

jest.mock("../../config/environment", () => ({
    Environment: {
        LOCAL: "local",
        DEVELOPMENT: "dev",
        STAGING: "staging",
        PRODUCTION: "production",
    },
}))

describe("identity-api config", () => {
    beforeEach(() => {
        jest.resetModules()
    })

    describe("IDENTITY_API_BASE_URL", () => {
        it("returns ngrok URL for dev environment", () => {
            mockEnvironmentValue = Environment.DEVELOPMENT

            const { IDENTITY_API_BASE_URL } = require("./config")
            expect(IDENTITY_API_BASE_URL).toBe("https://auth-dev.volley.tv")
        })
    })
})
