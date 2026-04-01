/* eslint-disable @typescript-eslint/unbound-method */
import { attemptVideoAutoplay } from "./attemptVideoAutoplay"
import { logger } from "./logger"

jest.mock("./logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("./platformVideoOptimizations", () => {
    return {
        applyPlatformVideoOptimizations: jest.fn(),
        waitForPlatformVideoReady: jest.fn().mockResolvedValue(undefined),
    }
})

jest.useFakeTimers()

describe("attemptVideoAutoplay", () => {
    let mockVideoElement: HTMLVideoElement

    beforeEach(() => {
        jest.clearAllMocks()
        jest.clearAllTimers()
        mockVideoElement = {
            play: jest.fn(),
            src: "https://example.com/video.mp4",
        } as unknown as HTMLVideoElement
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
    })

    it("should return true when video plays successfully on first attempt", async () => {
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockResolvedValue(undefined)

        const result = await attemptVideoAutoplay(mockVideoElement)

        expect(result).toBe(true)
        expect(mockPlay).toHaveBeenCalledTimes(1)
        expect(logger.info).toHaveBeenCalledWith("Autoplay successful", {
            video: {
                url: mockVideoElement.src,
                id: expect.any(String),
                playback: {
                    action: "attempt_success",
                    attempt: 0,
                    success: true,
                },
            },
        })
    })

    it("should return false immediately for permanent errors without retrying", async () => {
        const notAllowedError = new Error("User gesture required")
        notAllowedError.name = "NotAllowedError"
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockRejectedValue(notAllowedError)

        const result = await attemptVideoAutoplay(mockVideoElement)

        expect(result).toBe(false)
        expect(mockPlay).toHaveBeenCalledTimes(1)
        expect(logger.info).toHaveBeenCalledWith(
            `Autoplay permanently blocked for ${mockVideoElement.src} - ${notAllowedError.message}`,
            {
                video: {
                    url: mockVideoElement.src,
                    id: expect.any(String),
                    playback: {
                        action: "blocked_permanently",
                        success: false,
                    },
                },
            }
        )
    })

    it("should retry transient errors with exponential backoff", async () => {
        const transientError = new Error("Network error")
        transientError.name = "NetworkError"
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay
            .mockRejectedValueOnce(transientError)
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce(undefined)

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 3,
            initialDelay: 100,
        })

        // Fast-forward through the delays
        await jest.advanceTimersToNextTimerAsync()
        await jest.advanceTimersToNextTimerAsync()

        const result = await promise

        expect(result).toBe(true)
        expect(mockPlay).toHaveBeenCalledTimes(3)
        expect(logger.info).toHaveBeenCalledWith(
            "Autoplay successful after 2 retries",
            {
                video: {
                    url: mockVideoElement.src,
                    id: expect.any(String),
                    playback: {
                        action: "attempt_success",
                        attempt: 2,
                        success: true,
                    },
                },
            }
        )
    })

    it("should fail after max retries are exhausted", async () => {
        const transientError = new Error("Network error")
        transientError.name = "NetworkError"
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockRejectedValue(transientError)

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 2,
            initialDelay: 50,
        })

        // Fast-forward through all retry delays
        await jest.advanceTimersToNextTimerAsync()
        await jest.advanceTimersToNextTimerAsync()

        const result = await promise

        expect(result).toBe(false)
        expect(mockPlay).toHaveBeenCalledTimes(3) // Initial + 2 retries
        expect(logger.info).toHaveBeenCalledWith(
            `Autoplay blocked for ${mockVideoElement.src} after 2 retries - ${transientError.message}`,
            {
                video: {
                    url: mockVideoElement.src,
                    id: expect.any(String),
                    playback: {
                        action: "blocked_after_max_retries",
                        attempt: 2,
                        success: false,
                    },
                },
            }
        )
    })

    it("should respect custom retry options", async () => {
        const transientError = new Error("Temporary error")
        transientError.name = "NetworkError"
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockRejectedValue(transientError)

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 1,
            initialDelay: 200,
        })

        await jest.advanceTimersToNextTimerAsync()

        const result = await promise

        expect(result).toBe(false)
        expect(mockPlay).toHaveBeenCalledTimes(2) // Initial + 1 retry
    })

    it("should handle non-Error objects thrown during play", async () => {
        const nonErrorObject = "Some string error"
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockRejectedValue(nonErrorObject)

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 1,
        })
        await jest.advanceTimersToNextTimerAsync()
        const result = await promise

        expect(result).toBe(false)
        expect(mockPlay).toHaveBeenCalledTimes(2)
    })

    it("should handle video elements without src", async () => {
        const mockPlayWithoutSrc = jest
            .fn()
            .mockRejectedValue(new Error("No source"))
        const mockVideoWithoutSrc = {
            play: mockPlayWithoutSrc,
            src: "",
        } as unknown as HTMLVideoElement

        const promise = attemptVideoAutoplay(mockVideoWithoutSrc, {
            maxRetries: 1,
        })
        await jest.advanceTimersToNextTimerAsync()
        const result = await promise

        expect(result).toBe(false)
        expect(logger.info).toHaveBeenLastCalledWith(
            "Autoplay blocked for  after 1 retries - No source",
            {
                video: {
                    url: mockVideoWithoutSrc.src,
                    id: expect.any(String),
                    playback: {
                        action: "blocked_after_max_retries",
                        attempt: 1,
                        success: false,
                    },
                },
            }
        )
    })

    it("should use exponential backoff with max delay", async () => {
        const transientError = new Error("Network error")
        transientError.name = "NetworkError"
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockRejectedValue(transientError)

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 2,
            initialDelay: 100,
            maxDelay: 150,
            backoffMultiplier: 3,
        })

        // Should retry with delays: 100ms, then 150ms (capped at maxDelay)
        await jest.advanceTimersToNextTimerAsync()
        await jest.advanceTimersToNextTimerAsync()

        const result = await promise
        expect(result).toBe(false)
    })

    it("should give up immediately on timeout without retrying", async () => {
        const mockPlay = mockVideoElement.play as jest.Mock

        mockPlay.mockImplementation(() => new Promise(() => {}))

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 2,
            timeoutMs: 500,
        })

        await jest.runAllTimersAsync()

        const result = await promise
        expect(result).toBe(false)
        // play() should only be called once - timeouts are not retried
        expect(mockPlay).toHaveBeenCalledTimes(1)
        expect(logger.info).toHaveBeenCalledWith(
            `Autoplay timed out for ${mockVideoElement.src}`,
            {
                video: {
                    url: mockVideoElement.src,
                    id: expect.any(String),
                    playback: {
                        action: "blocked_timeout",
                        success: false,
                    },
                },
            }
        )
    })

    it("should call onVideoComplete when timeout gives up", async () => {
        const mockPlay = mockVideoElement.play as jest.Mock
        const onVideoComplete = jest.fn()
        mockPlay.mockImplementation(() => new Promise(() => {}))

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 2,
            timeoutMs: 500,
            onVideoComplete,
        })

        await jest.runAllTimersAsync()

        const result = await promise
        expect(result).toBe(false)
        expect(onVideoComplete).toHaveBeenCalledTimes(1)
    })

    it("should use custom timeout from options", async () => {
        const mockPlay = mockVideoElement.play as jest.Mock
        mockPlay.mockImplementation(() => new Promise(() => {}))

        const promise = attemptVideoAutoplay(mockVideoElement, {
            maxRetries: 0,
            timeoutMs: 2000,
        })

        await jest.runAllTimersAsync()

        const result = await promise
        expect(result).toBe(false)
    })

    describe("video completion callbacks", () => {
        beforeEach(() => {
            mockVideoElement.addEventListener = jest.fn()
            mockVideoElement.removeEventListener = jest.fn()
            mockVideoElement.dispatchEvent = jest.fn()
        })

        it("should call onVideoComplete when video ends naturally after successful autoplay", async () => {
            const mockPlay = mockVideoElement.play as jest.Mock
            const onVideoComplete = jest.fn()
            mockPlay.mockResolvedValue(undefined)
            Object.defineProperty(mockVideoElement, "duration", {
                value: 5,
                writable: true,
            })

            const result = await attemptVideoAutoplay(mockVideoElement, {
                onVideoComplete,
                completionTimeoutBuffer: 500,
            })

            expect(result).toBe(true)
            expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
                "ended",
                expect.any(Function),
                { once: true }
            )

            const addEventListenerCall = (
                mockVideoElement.addEventListener as jest.Mock
            ).mock.calls[0]
            const endHandler = addEventListenerCall[1]
            endHandler()

            expect(onVideoComplete).toHaveBeenCalledTimes(1)
        })

        it("should call onVideoComplete via fallback timer if ended event doesn't fire", async () => {
            const mockPlay = mockVideoElement.play as jest.Mock
            const onVideoComplete = jest.fn()
            mockPlay.mockResolvedValue(undefined)
            Object.defineProperty(mockVideoElement, "duration", {
                value: 2,
                writable: true,
            })

            const result = await attemptVideoAutoplay(mockVideoElement, {
                onVideoComplete,
                completionTimeoutBuffer: 500,
            })

            expect(result).toBe(true)

            jest.advanceTimersByTime(2500) // 2s video + 500ms buffer

            expect(onVideoComplete).toHaveBeenCalledTimes(1)
            expect(logger.warn).toHaveBeenCalledWith(
                "Video fallback timer triggered - video may not have played properly",
                {
                    video: {
                        url: mockVideoElement.src,
                        id: expect.any(String),
                        playback: { action: "fallback", success: false },
                    },
                }
            )
        })

        it("should call onVideoComplete immediately when autoplay fails permanently", async () => {
            const notAllowedError = new Error("User gesture required")
            notAllowedError.name = "NotAllowedError"
            const mockPlay = mockVideoElement.play as jest.Mock
            const onVideoComplete = jest.fn()
            mockPlay.mockRejectedValue(notAllowedError)

            const result = await attemptVideoAutoplay(mockVideoElement, {
                onVideoComplete,
            })

            expect(result).toBe(false)
            expect(onVideoComplete).toHaveBeenCalledTimes(1)
        })

        it("should call onVideoComplete when max retries are exhausted", async () => {
            const transientError = new Error("Network error")
            transientError.name = "NetworkError"
            const mockPlay = mockVideoElement.play as jest.Mock
            const onVideoComplete = jest.fn()
            mockPlay.mockRejectedValue(transientError)

            const promise = attemptVideoAutoplay(mockVideoElement, {
                maxRetries: 1,
                onVideoComplete,
            })

            await jest.advanceTimersToNextTimerAsync()

            const result = await promise
            expect(result).toBe(false)
            expect(onVideoComplete).toHaveBeenCalledTimes(1)
        })

        it("should not set up completion tracking if no callback provided", async () => {
            const mockPlay = mockVideoElement.play as jest.Mock
            mockPlay.mockResolvedValue(undefined)

            const result = await attemptVideoAutoplay(mockVideoElement)

            expect(result).toBe(true)

            expect(mockVideoElement.addEventListener).not.toHaveBeenCalled()
        })
    })

    describe("onAutoplayStarted callback", () => {
        it("should call onAutoplayStarted when autoplay succeeds on first attempt", async () => {
            const mockPlay = mockVideoElement.play as jest.Mock
            const onAutoplayStarted = jest.fn()
            mockPlay.mockResolvedValue(undefined)

            const result = await attemptVideoAutoplay(mockVideoElement, {
                onAutoplayStarted,
            })

            expect(result).toBe(true)
            expect(onAutoplayStarted).toHaveBeenCalledTimes(1)
        })

        it("should call onAutoplayStarted when autoplay succeeds after retries", async () => {
            const transientError = new Error("Network error")
            transientError.name = "NetworkError"
            const mockPlay = mockVideoElement.play as jest.Mock
            const onAutoplayStarted = jest.fn()
            const onAutoplayNotStarted = jest.fn()
            mockPlay
                .mockRejectedValueOnce(transientError)
                .mockResolvedValueOnce(undefined)

            const promise = attemptVideoAutoplay(mockVideoElement, {
                maxRetries: 2,
                initialDelay: 100,
                onAutoplayStarted,
                onAutoplayNotStarted,
            })

            await jest.advanceTimersToNextTimerAsync()

            const result = await promise

            expect(result).toBe(true)
            expect(onAutoplayNotStarted).toHaveBeenCalledTimes(1)
            expect(onAutoplayStarted).toHaveBeenCalledTimes(1)
        })

        it("should not call onAutoplayStarted when autoplay fails permanently", async () => {
            const notAllowedError = new Error("User gesture required")
            notAllowedError.name = "NotAllowedError"
            const mockPlay = mockVideoElement.play as jest.Mock
            const onAutoplayStarted = jest.fn()
            mockPlay.mockRejectedValue(notAllowedError)

            const result = await attemptVideoAutoplay(mockVideoElement, {
                onAutoplayStarted,
            })

            expect(result).toBe(false)
            expect(onAutoplayStarted).not.toHaveBeenCalled()
        })

        it("should not call onAutoplayStarted when max retries are exhausted", async () => {
            const transientError = new Error("Network error")
            transientError.name = "NetworkError"
            const mockPlay = mockVideoElement.play as jest.Mock
            const onAutoplayStarted = jest.fn()
            mockPlay.mockRejectedValue(transientError)

            const promise = attemptVideoAutoplay(mockVideoElement, {
                maxRetries: 1,
                onAutoplayStarted,
            })

            await jest.advanceTimersToNextTimerAsync()

            const result = await promise

            expect(result).toBe(false)
            expect(onAutoplayStarted).not.toHaveBeenCalled()
        })

        it("should call onAutoplayStarted before setting up video completion tracking", async () => {
            const mockPlay = mockVideoElement.play as jest.Mock
            mockPlay.mockResolvedValue(undefined)
            mockVideoElement.addEventListener = jest.fn()

            const callOrder: string[] = []
            const onAutoplayStarted = jest.fn(() => {
                callOrder.push("onAutoplayStarted")
            })
            const onVideoComplete = jest.fn()

            const originalAddEventListener =
                mockVideoElement.addEventListener as jest.Mock
            originalAddEventListener.mockImplementation(() => {
                callOrder.push("addEventListener")
            })

            await attemptVideoAutoplay(mockVideoElement, {
                onAutoplayStarted,
                onVideoComplete,
            })

            expect(callOrder).toEqual(["onAutoplayStarted", "addEventListener"])
        })
    })
})
