import { renderHook } from "@testing-library/react"

import { useDatadogIdentity } from "./useDatadogIdentity"

const mockSetUser = jest.fn()
jest.mock("../utils/datadog", () => ({
    safeDatadogRum: {
        setUser: (...args: unknown[]): unknown => mockSetUser(...args),
    },
}))

const mockDatadogSetUser = jest.fn()
const mockDatadogSetAccount = jest.fn()
const mockDatadogSetGlobalContextProperty = jest.fn()
jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        setUser: (...args: unknown[]): unknown => mockDatadogSetUser(...args),
        setAccount: (...args: unknown[]): unknown =>
            mockDatadogSetAccount(...args),
        setGlobalContextProperty: (...args: unknown[]): unknown =>
            mockDatadogSetGlobalContextProperty(...args),
    },
}))

const mockGetAppVersion = jest.fn()
jest.mock("@volley/platform-sdk/lib", () => ({
    getAppVersion: (): unknown => mockGetAppVersion(),
}))

const mockUseAccountId = jest.fn()
jest.mock("./useAccountId", () => ({
    useAccountId: (): unknown => mockUseAccountId(),
}))

const mockUsePlatformReadiness = jest.fn()
jest.mock("./usePlatformReadiness", () => ({
    usePlatformReadiness: (): unknown => mockUsePlatformReadiness(),
}))

const mockUseSessionId = jest.fn()
jest.mock("@volley/platform-sdk/react", () => ({
    useSessionId: (): unknown => mockUseSessionId(),
}))

describe("useDatadogIdentity", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUseAccountId.mockReturnValue(undefined)
        mockUsePlatformReadiness.mockReturnValue(false)
        mockUseSessionId.mockReturnValue(undefined)
        mockGetAppVersion.mockReturnValue(null)
    })

    it("does not set user when accountId is not available", () => {
        mockUsePlatformReadiness.mockReturnValue(true)

        renderHook(() => useDatadogIdentity())

        expect(mockSetUser).not.toHaveBeenCalled()
        expect(mockDatadogSetUser).not.toHaveBeenCalled()
    })

    it("does not set user when platform is not ready", () => {
        mockUseAccountId.mockReturnValue("account-123")

        renderHook(() => useDatadogIdentity())

        expect(mockSetUser).not.toHaveBeenCalled()
    })

    it("sets user identity when accountId and platform are ready", () => {
        mockUseAccountId.mockReturnValue("account-123")
        mockUsePlatformReadiness.mockReturnValue(true)

        renderHook(() => useDatadogIdentity())

        expect(mockSetUser).toHaveBeenCalledWith({ id: "account-123" })
        expect(mockDatadogSetUser).toHaveBeenCalledWith({
            id: "account-123",
        })
        expect(mockDatadogSetAccount).toHaveBeenCalledWith({
            id: "account-123",
        })
    })

    it("only sets user once on re-renders with same accountId", () => {
        mockUseAccountId.mockReturnValue("account-123")
        mockUsePlatformReadiness.mockReturnValue(true)

        const { rerender } = renderHook(() => useDatadogIdentity())

        expect(mockSetUser).toHaveBeenCalledTimes(1)

        mockSetUser.mockClear()
        rerender()
        rerender()

        expect(mockSetUser).not.toHaveBeenCalled()
    })

    it("updates user identity when accountId changes", () => {
        mockUseAccountId.mockReturnValue("account-123")
        mockUsePlatformReadiness.mockReturnValue(true)

        const { rerender } = renderHook(() => useDatadogIdentity())

        expect(mockSetUser).toHaveBeenCalledWith({ id: "account-123" })

        mockSetUser.mockClear()
        mockDatadogSetUser.mockClear()
        mockDatadogSetAccount.mockClear()
        mockUseAccountId.mockReturnValue("account-456")
        rerender()

        expect(mockSetUser).toHaveBeenCalledWith({ id: "account-456" })
        expect(mockDatadogSetUser).toHaveBeenCalledWith({ id: "account-456" })
        expect(mockDatadogSetAccount).toHaveBeenCalledWith({
            id: "account-456",
        })
    })

    it("sets session ID when available", () => {
        mockUseSessionId.mockReturnValue("session-456")

        renderHook(() => useDatadogIdentity())

        expect(mockDatadogSetGlobalContextProperty).toHaveBeenCalledWith(
            "hubSessionId",
            "session-456"
        )
    })

    it("does not set session ID when not available", () => {
        mockUseSessionId.mockReturnValue(undefined)

        renderHook(() => useDatadogIdentity())

        expect(mockDatadogSetGlobalContextProperty).not.toHaveBeenCalled()
    })

    it("sets shellVersion when platform is ready and version exists", () => {
        mockUsePlatformReadiness.mockReturnValue(true)
        mockGetAppVersion.mockReturnValue("2.5.0")

        renderHook(() => useDatadogIdentity())

        expect(mockGetAppVersion).toHaveBeenCalled()
        expect(mockDatadogSetGlobalContextProperty).toHaveBeenCalledWith(
            "shellVersion",
            "2.5.0"
        )
    })

    it("does not set shellVersion when getAppVersion returns null", () => {
        mockUsePlatformReadiness.mockReturnValue(true)
        mockGetAppVersion.mockReturnValue(null)

        renderHook(() => useDatadogIdentity())

        expect(mockDatadogSetGlobalContextProperty).not.toHaveBeenCalled()
    })

    it("does not set shellVersion when platform is not ready", () => {
        mockGetAppVersion.mockReturnValue("2.5.0")

        renderHook(() => useDatadogIdentity())

        expect(mockDatadogSetGlobalContextProperty).not.toHaveBeenCalled()
    })
})
