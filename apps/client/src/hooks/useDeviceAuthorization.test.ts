import { act, renderHook, waitFor } from "@testing-library/react"

import type { DeviceAuthorizationData } from "./useDeviceAuthorization"
import { useDeviceAuthorization } from "./useDeviceAuthorization"

const mockLoginWithQR = jest.fn()

jest.mock("@volley/platform-sdk/react", () => ({
    useAuth: jest.fn(),
    useAccount: jest.fn(),
}))

jest.mock("./useAnonymousId", () => ({
    useAnonymousId: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn(),
        startDurationVital: jest.fn(() => "mock-vital-ref"),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addTiming: jest.fn(),
        setGlobalContextProperty: jest.fn(),
    },
}))

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        init: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        },
    },
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getPlatform: (): string => "web",
}))

const { useAuth, useAccount } = require("@volley/platform-sdk/react") as {
    useAuth: jest.Mock
    useAccount: jest.Mock
}

const { useAnonymousId } = require("./useAnonymousId") as {
    useAnonymousId: jest.Mock
}

// Test constants
const MOCK_EXPIRES_IN_SECONDS = 600
const MOCK_INTERVAL_SECONDS = 5
const DEFAULT_EXPIRES_IN_MS = 60000
const DEFAULT_INTERVAL_MS = 5000

describe("useDeviceAuthorization", () => {
    const mockSuccessResponse = {
        deviceCode: "mock-device-code-123",
        userCode: "1234",
        verificationUri: "https://pair-dev.volley.tv",
        verificationUriComplete: "https://pair-dev.volley.tv?pairing=1234",
        expiresIn: MOCK_EXPIRES_IN_SECONDS,
        interval: MOCK_INTERVAL_SECONDS,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockLoginWithQR.mockClear()
        useAuth.mockReturnValue({
            authStatus: { authenticated: false, authInProgress: false },
            loginWithQR: mockLoginWithQR,
        })
        useAccount.mockReturnValue({
            account: null,
        })
        useAnonymousId.mockReturnValue(undefined)
    })

    describe("initial load", () => {
        it("should start with loading state and fetch device authorization", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            expect(result.current.isLoading).toBe(true)
            expect(result.current.data).toBe(null)
            expect(result.current.error).toBe(null)

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalledWith({
                cancellation: expect.any(AbortSignal),
                connectionId: "screen-123",
                sessionId: undefined,
            })
        })

        it("should successfully process device authorization response", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            const expectedData: DeviceAuthorizationData = {
                deviceCode: "mock-device-code-123",
                userCode: "1234",
                verificationUri: "https://pair-dev.volley.tv",
                verificationUriComplete:
                    "https://pair-dev.volley.tv?pairing=1234",
                expiresIn: MOCK_EXPIRES_IN_SECONDS,
                interval: MOCK_INTERVAL_SECONDS,
            }

            expect(result.current.data).toEqual(expectedData)
            expect(result.current.error).toBe(null)
            expect(result.current.isLoading).toBe(false)
        })

        it("should handle missing verification_uri_complete by using verification_uri", async () => {
            const responseWithoutComplete = {
                ...mockSuccessResponse,
                verificationUriComplete: undefined,
            }
            mockLoginWithQR.mockResolvedValue(responseWithoutComplete)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data?.verificationUriComplete).toBe(
                "https://pair-dev.volley.tv"
            )
        })

        it("should use default values for expires_in and interval", async () => {
            const responseWithoutTiming = {
                ...mockSuccessResponse,
                expiresIn: undefined,
                interval: undefined,
            }
            mockLoginWithQR.mockResolvedValue(responseWithoutTiming)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data?.expiresIn).toBe(DEFAULT_EXPIRES_IN_MS)
            expect(result.current.data?.interval).toBe(DEFAULT_INTERVAL_MS)
        })

        it("includes provided connectionId and sessionId in request headers", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const sessionId = "sess-456"
            const connectionId = "conn-789"

            const { result } = renderHook(() =>
                useDeviceAuthorization(sessionId)
            )

            act(() => {
                result.current.setConnectionId(connectionId)
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalledWith({
                cancellation: expect.any(AbortSignal),
                connectionId,
                sessionId,
            })
        })
    })

    describe("error handling", () => {
        it("should handle API error response", async () => {
            const error = new Error("Invalid request")
            mockLoginWithQR.mockRejectedValue(error)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data).toBe(null)
            expect(result.current.error).toBe("Invalid request")
        })

        it("should handle invalid response data missing required fields", async () => {
            const invalidResponse = {
                deviceCode: "mock-device-code-123",
            }
            mockLoginWithQR.mockResolvedValue(invalidResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.error).toBe(
                "Invalid response in useDeviceAuthorization: missing required fields"
            )
        })

        it("should handle network errors", async () => {
            const networkError = new Error("Network error")
            mockLoginWithQR.mockRejectedValue(networkError)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data).toBe(null)
            expect(result.current.error).toBe("Network error")
        })

        it("should handle unknown errors", async () => {
            mockLoginWithQR.mockRejectedValue("Unknown error type")

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.error).toBe("Unknown error occurred")
        })
    })

    describe("code reuse", () => {
        it("should maintain device code data across rerenders", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result, rerender } = renderHook(() =>
                useDeviceAuthorization()
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            const originalData = result.current.data
            expect(originalData).not.toBe(null)
            expect(originalData?.userCode).toBe("1234")

            // Rerender should maintain the same data
            rerender()

            expect(result.current.data).toEqual(originalData)
            expect(result.current.isLoading).toBe(false)
            expect(result.current.error).toBe(null)
        })
    })

    describe("enabled parameter", () => {
        it("should not fetch device authorization when enabled is false", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() =>
                useDeviceAuthorization(undefined, false)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            expect(result.current.isLoading).toBe(false)
            expect(result.current.data).toBe(null)
            expect(result.current.error).toBe(null)

            await waitFor(
                () => {
                    expect(mockLoginWithQR).not.toHaveBeenCalled()
                },
                { timeout: 500 }
            )
        })

        it("should fetch device authorization when enabled is true", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalled()
            expect(result.current.data).not.toBe(null)
        })

        it("should default to enabled when parameter is not provided", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalled()
            expect(result.current.data).not.toBe(null)
        })

        it("should abort ongoing request when enabled changes from true to false", async () => {
            let abortController: AbortController | null = null

            mockLoginWithQR.mockImplementationOnce(
                ({ cancellation }: { cancellation: AbortSignal }) => {
                    abortController = new AbortController()
                    Object.defineProperty(abortController, "signal", {
                        value: cancellation,
                    })
                    return new Promise(() => {
                        // Never resolve to simulate ongoing request
                    })
                }
            )

            const { result, rerender } = renderHook(
                ({ enabled }) => useDeviceAuthorization(undefined, enabled),
                { initialProps: { enabled: true } }
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalled()
            })

            const capturedSignal = mockLoginWithQR.mock.calls[0][0].cancellation
            expect(capturedSignal).toBeInstanceOf(AbortSignal)
            expect(capturedSignal.aborted).toBe(false)

            act(() => {
                rerender({ enabled: false })
            })

            await waitFor(() => {
                expect(capturedSignal.aborted).toBe(true)
            })

            expect(result.current.isLoading).toBe(false)
            expect(result.current.error).toBe(null)
        })

        it("should abort ongoing request when user becomes authenticated and subscribed", async () => {
            mockLoginWithQR.mockImplementationOnce(() => {
                return new Promise(() => {
                    // Never resolve to simulate ongoing request
                })
            })

            const { result, rerender } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalled()
            })

            const capturedSignal = mockLoginWithQR.mock.calls[0][0].cancellation
            expect(capturedSignal.aborted).toBe(false)

            act(() => {
                useAuth.mockReturnValue({
                    authStatus: {
                        authenticated: true,
                        authInProgress: false,
                    },
                    loginWithQR: mockLoginWithQR,
                })
                useAccount.mockReturnValue({
                    account: { isSubscribed: true },
                })
                rerender()
            })

            await waitFor(() => {
                expect(capturedSignal.aborted).toBe(true)
            })

            expect(result.current.isLoading).toBe(false)
        })
    })

    describe("retry", () => {
        it("should abort in-flight request and re-fetch on retry", async () => {
            mockLoginWithQR.mockImplementationOnce(() => new Promise(() => {}))
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
            })

            const firstSignal = mockLoginWithQR.mock.calls[0][0].cancellation

            const callCountBeforeRetry = mockLoginWithQR.mock.calls.length

            act(() => {
                result.current.retry()
            })

            expect(firstSignal.aborted).toBe(true)

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
                expect(result.current.data).toEqual(mockSuccessResponse)
            })

            expect(mockLoginWithQR.mock.calls.length).toBeGreaterThan(
                callCountBeforeRetry
            )
        })

        it("should work even when previous call left isLoading true", async () => {
            mockLoginWithQR.mockImplementationOnce(() => new Promise(() => {}))
            mockLoginWithQR.mockResolvedValueOnce(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(true)
            })

            act(() => {
                result.current.retry()
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data).toEqual(mockSuccessResponse)
            expect(result.current.error).toBe(null)
        })
    })

    describe("anonymousId handling", () => {
        it("should include anonymousId when not authenticated and anonymousId exists", async () => {
            const anonymousId = "anonymous-123"
            useAnonymousId.mockReturnValue(anonymousId)
            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })
            mockLoginWithQR.mockResolvedValueOnce(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())
            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalledWith({
                cancellation: expect.any(AbortSignal),
                connectionId: "screen-123",
                sessionId: undefined,
                anonymousId,
            })
        })
    })

    describe("subscription status handling", () => {
        it("should not fetch device authorization when user is authenticated and subscribed", async () => {
            useAccount.mockReturnValue({
                account: { isSubscribed: true },
            })
            useAuth.mockReturnValue({
                authStatus: { authenticated: true, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(
                () => {
                    expect(mockLoginWithQR).not.toHaveBeenCalled()
                },
                { timeout: 500 }
            )

            expect(result.current.isLoading).toBe(false)
            expect(result.current.data).toBe(null)
        })

        it("should fetch device authorization when user is authenticated but not subscribed", async () => {
            useAccount.mockReturnValue({
                account: { isSubscribed: false },
            })
            useAuth.mockReturnValue({
                authStatus: { authenticated: true, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalled()
            expect(result.current.data).not.toBe(null)
            expect(result.current.data?.userCode).toBe("1234")
        })

        it("should fetch device authorization when user is not authenticated and not subscribed", async () => {
            useAccount.mockReturnValue({
                account: { isSubscribed: false },
            })
            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalled()
            expect(result.current.data).not.toBe(null)
            expect(result.current.data?.userCode).toBe("1234")
        })

        it("should fetch device authorization when account is null (not loaded yet)", async () => {
            useAccount.mockReturnValue({
                account: null,
            })
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result } = renderHook(() => useDeviceAuthorization())

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(mockLoginWithQR).toHaveBeenCalled()
            expect(result.current.data).not.toBe(null)
        })
    })

    describe("race condition: state transition timing", () => {
        it("should fetch device auth when authInProgress transitions from true to false after connectionId is set", async () => {
            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: true },
                loginWithQR: mockLoginWithQR,
            })
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result, rerender } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            // authInProgress blocks the fetch
            expect(mockLoginWithQR).not.toHaveBeenCalled()

            // SDK auth completes
            act(() => {
                useAuth.mockReturnValue({
                    authStatus: {
                        authenticated: false,
                        authInProgress: false,
                    },
                    loginWithQR: mockLoginWithQR,
                })
                rerender()
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            expect(result.current.data?.userCode).toBe("1234")
        })

        it("should not re-fetch after a successful completion (callback stability)", async () => {
            // First call succeeds, any subsequent call hangs forever
            // so we can detect if a spurious re-trigger happens
            mockLoginWithQR
                .mockResolvedValueOnce(mockSuccessResponse)
                .mockImplementation(
                    () =>
                        new Promise(() => {
                            // never resolves — traps any duplicate fetch
                        })
                )

            const { result } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            // If isLoading in useCallback deps makes fetchDeviceAuthorization
            // unstable, the effect re-fires after isLoading goes true→false,
            // triggering a duplicate fetch.
            expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
        })

        it("should fetch when enabled becomes true after connectionId is already set", async () => {
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result, rerender } = renderHook(
                ({ enabled }) => useDeviceAuthorization(undefined, enabled),
                { initialProps: { enabled: false } }
            )

            // connectionId arrives while hook is disabled
            act(() => {
                result.current.setConnectionId("screen-123")
            })

            expect(mockLoginWithQR).not.toHaveBeenCalled()

            // enabled becomes true (simulates onModalOpenChange propagating)
            act(() => {
                rerender({ enabled: true })
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            expect(result.current.data?.userCode).toBe("1234")
        })

        it("should fetch when enabled arrives late AND authInProgress transitions during the window", async () => {
            // Initial state: SDK mid-auth, hook disabled (modal not propagated)
            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: true },
                loginWithQR: mockLoginWithQR,
            })
            mockLoginWithQR.mockResolvedValue(mockSuccessResponse)

            const { result, rerender } = renderHook(
                ({ enabled }) => useDeviceAuthorization(undefined, enabled),
                { initialProps: { enabled: false } }
            )

            // Step 1: connectionId set while disabled and authInProgress
            act(() => {
                result.current.setConnectionId("screen-123")
            })
            expect(mockLoginWithQR).not.toHaveBeenCalled()

            // Step 2: enabled becomes true, but authInProgress still blocks
            act(() => {
                rerender({ enabled: true })
            })
            expect(mockLoginWithQR).not.toHaveBeenCalled()

            // Step 3: auth completes — final gate opens
            act(() => {
                useAuth.mockReturnValue({
                    authStatus: {
                        authenticated: false,
                        authInProgress: false,
                    },
                    loginWithQR: mockLoginWithQR,
                })
                rerender({ enabled: true })
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            expect(result.current.data?.userCode).toBe("1234")
        })

        it("should bypass authInProgress guard when retry is active", async () => {
            // Initial fetch hangs, simulating the production bug
            mockLoginWithQR.mockImplementationOnce(() => new Promise(() => {}))

            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })

            const { result, rerender } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
            })

            // SDK sets authInProgress to true (e.g. loginWithQR internally)
            act(() => {
                useAuth.mockReturnValue({
                    authStatus: {
                        authenticated: false,
                        authInProgress: true,
                    },
                    loginWithQR: mockLoginWithQR,
                })
                rerender()
            })

            // Watchdog fires retry — should bypass authInProgress
            mockLoginWithQR.mockResolvedValueOnce(mockSuccessResponse)

            act(() => {
                result.current.retry()
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            expect(result.current.data?.userCode).toBe("1234")
        })

        it("should restore authInProgress guard after successful retry", async () => {
            // First call hangs
            mockLoginWithQR.mockImplementationOnce(() => new Promise(() => {}))

            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })

            const { result, rerender } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
            })

            // SDK sets authInProgress true
            act(() => {
                useAuth.mockReturnValue({
                    authStatus: {
                        authenticated: false,
                        authInProgress: true,
                    },
                    loginWithQR: mockLoginWithQR,
                })
                rerender()
            })

            // Retry succeeds
            mockLoginWithQR.mockResolvedValueOnce(mockSuccessResponse)
            act(() => {
                result.current.retry()
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            const callsAfterRetry = mockLoginWithQR.mock.calls.length

            // authInProgress is still true — but bypass should be cleared now
            // Trigger a rerender to re-run the effect
            act(() => {
                rerender()
            })

            // No additional fetch should have been made
            expect(mockLoginWithQR.mock.calls.length).toBe(callsAfterRetry)
        })

        it("should not duplicate fetch when retry succeeds", async () => {
            // First call hangs
            mockLoginWithQR.mockImplementationOnce(() => new Promise(() => {}))
            // Retry succeeds, any further call hangs (trap for duplicates)
            mockLoginWithQR
                .mockResolvedValueOnce(mockSuccessResponse)
                .mockImplementation(() => new Promise(() => {}))

            const { result } = renderHook(() =>
                useDeviceAuthorization(undefined, true)
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
            })

            act(() => {
                result.current.retry()
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            // Wait a tick to ensure no duplicate fetch fires
            await act(async () => {
                await new Promise((r) => setTimeout(r, 50))
            })

            // Should be exactly 2: original + retry (not 3 from duplicate)
            expect(mockLoginWithQR).toHaveBeenCalledTimes(2)
        })

        it("should reset retry bypass when modal closes and reopens", async () => {
            // Start with authInProgress false so initial fetch goes through
            useAuth.mockReturnValue({
                authStatus: { authenticated: false, authInProgress: false },
                loginWithQR: mockLoginWithQR,
            })
            // First call hangs
            mockLoginWithQR.mockImplementationOnce(() => new Promise(() => {}))

            const { result, rerender } = renderHook(
                ({ enabled }) => useDeviceAuthorization(undefined, enabled),
                { initialProps: { enabled: true } }
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
            })

            // SDK sets authInProgress true (loginWithQR internally)
            act(() => {
                useAuth.mockReturnValue({
                    authStatus: {
                        authenticated: false,
                        authInProgress: true,
                    },
                    loginWithQR: mockLoginWithQR,
                })
                rerender({ enabled: true })
            })

            // Retry activates the bypass, second call succeeds
            mockLoginWithQR.mockResolvedValueOnce(mockSuccessResponse)
            act(() => {
                result.current.retry()
            })

            await waitFor(() => {
                expect(result.current.data).not.toBe(null)
            })

            const callsAfterRetry = mockLoginWithQR.mock.calls.length

            // Modal closes (enabled = false) — should reset bypass
            act(() => {
                rerender({ enabled: false })
            })

            // Modal reopens (enabled = true) — authInProgress still true
            act(() => {
                rerender({ enabled: true })
            })

            // authInProgress should block again since bypass was reset
            expect(mockLoginWithQR.mock.calls.length).toBe(callsAfterRetry)
        })

        it("should re-fetch after enabled toggles false→true while a fetch is in-flight", async () => {
            // First call rejects with AbortError when signal fires (realistic production behavior)
            mockLoginWithQR
                .mockImplementationOnce(
                    ({ cancellation }: { cancellation: AbortSignal }) =>
                        new Promise((_resolve, reject) => {
                            cancellation.addEventListener("abort", () => {
                                reject(
                                    new DOMException(
                                        "The operation was aborted.",
                                        "AbortError"
                                    )
                                )
                            })
                        })
                )
                .mockResolvedValueOnce(mockSuccessResponse)

            const { result, rerender } = renderHook(
                ({ enabled }) => useDeviceAuthorization(undefined, enabled),
                { initialProps: { enabled: true } }
            )

            act(() => {
                result.current.setConnectionId("screen-123")
            })

            // First fetch is in-flight
            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(1)
            })

            // Disable — aborts the in-flight request, first call's finally fires
            act(() => {
                rerender({ enabled: false })
            })

            // Re-enable — should trigger a new fetch even though first call's
            // finally block runs (it shouldn't clobber the loading ref)
            act(() => {
                rerender({ enabled: true })
            })

            await waitFor(() => {
                expect(mockLoginWithQR).toHaveBeenCalledTimes(2)
            })

            await waitFor(() => {
                expect(result.current.data?.userCode).toBe("1234")
            })
        })
    })
})
