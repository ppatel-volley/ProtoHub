import { IDENTITY_API_BASE_URL } from "../apis/identity-api"
import { PAYMENT_SUCCESS_SESSION_KEY } from "../constants"
import { logoutAndReload } from "./logoutAndReload"

jest.mock("./logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

const mockReload = jest.fn()
const mockSessionStorageRemoveItem = jest.fn()

Object.defineProperty(window, "location", {
    writable: true,
    value: { reload: mockReload },
})

Object.defineProperty(window, "sessionStorage", {
    writable: true,
    value: {
        removeItem: mockSessionStorageRemoveItem,
    },
})

global.fetch = jest.fn()

describe("logoutAndReload", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should call logout API and reload on 204 response", async () => {
        ;(global.fetch as jest.Mock).mockResolvedValue({
            status: 204,
            ok: true,
        })

        await logoutAndReload()

        const { logger } = require("./logger")

        expect(global.fetch).toHaveBeenCalledWith(
            `${IDENTITY_API_BASE_URL}/api/v1/auth/web/logout`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        )
        expect(logger.info).toHaveBeenCalledWith(
            "Initiating logout and reload..."
        )
        expect(logger.info).toHaveBeenCalledWith(
            "Logout successful, reloading application..."
        )
        expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it("should reload on successful response", async () => {
        const { logger } = require("./logger")
        ;(global.fetch as jest.Mock).mockResolvedValue({
            status: 200,
            ok: true,
        })

        await logoutAndReload()

        expect(logger.info).toHaveBeenCalledWith(
            "Logout successful, reloading application..."
        )
        expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it("should reload anyway on failed logout response", async () => {
        const { logger } = require("./logger")
        ;(global.fetch as jest.Mock).mockResolvedValue({
            status: 500,
            ok: false,
        })

        await logoutAndReload()

        expect(logger.error).toHaveBeenCalledWith(
            "Logout failed with status 500, reloading anyway..."
        )
        expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it("should handle network error and reload", async () => {
        const { logger } = require("./logger")
        const networkError = new Error("Network error")
        ;(global.fetch as jest.Mock).mockRejectedValue(networkError)

        await logoutAndReload()

        expect(logger.error).toHaveBeenCalledWith(
            "Error during logout",
            networkError
        )
        expect(logger.info).toHaveBeenCalledWith(
            "Reloading application despite error..."
        )
        expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it("should handle non-Error exception and reload", async () => {
        const { logger } = require("./logger")
        ;(global.fetch as jest.Mock).mockRejectedValue("String error")

        await logoutAndReload()

        expect(logger.error).toHaveBeenCalledWith(
            "Error during logout",
            expect.any(Error)
        )
        expect(logger.info).toHaveBeenCalledWith(
            "Reloading application despite error..."
        )
        expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it("should always reload regardless of outcome", async () => {
        const testCases = [
            { status: 204, ok: true },
            { status: 200, ok: true },
            { status: 400, ok: false },
            { status: 500, ok: false },
        ]

        for (const testCase of testCases) {
            mockReload.mockClear()
            ;(global.fetch as jest.Mock).mockResolvedValue(testCase)

            await logoutAndReload()

            expect(mockReload).toHaveBeenCalledTimes(1)
        }
    })

    it("should clear payment session cache before logout", async () => {
        const { logger } = require("./logger")
        ;(global.fetch as jest.Mock).mockResolvedValue({
            status: 204,
            ok: true,
        })

        await logoutAndReload()

        expect(mockSessionStorageRemoveItem).toHaveBeenCalledWith(
            PAYMENT_SUCCESS_SESSION_KEY
        )
        expect(logger.info).toHaveBeenCalledWith(
            "Cleared payment session cache"
        )
    })

    it("should handle sessionStorage errors gracefully", async () => {
        const { logger } = require("./logger")
        const storageError = new Error("Storage unavailable")
        mockSessionStorageRemoveItem.mockImplementation(() => {
            throw storageError
        })
        ;(global.fetch as jest.Mock).mockResolvedValue({
            status: 204,
            ok: true,
        })

        await logoutAndReload()

        expect(logger.warn).toHaveBeenCalledWith(
            "Failed to clear session storage",
            {
                error: storageError.message,
                name: storageError.name,
            }
        )
        expect(mockReload).toHaveBeenCalledTimes(1)
    })
})
