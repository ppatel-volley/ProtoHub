import { isSamsungTV } from "../config/platformDetection"
import {
    applyPlatformVideoOptimizations,
    getPlatformVideoAttributes,
    hidePlatformVideo,
    PLATFORM_VIDEO_READY_TIMEOUT_MS,
    waitForPlatformVideoReady,
} from "./platformVideoOptimizations"

jest.mock("../config/platformDetection", () => ({
    isSamsungTV: jest.fn(),
}))

jest.mock("./logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

const mockIsSamsungTV = isSamsungTV as jest.MockedFunction<typeof isSamsungTV>

describe("platformVideoOptimizations", () => {
    let mockVideoElement: {
        style: Record<string, string | undefined>
        offsetHeight: number
        readyState: number
        addEventListener: jest.Mock
        removeEventListener: jest.Mock
        poster?: string
        load: jest.Mock
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockVideoElement = {
            style: {},
            offsetHeight: 100,
            readyState: 0,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            load: jest.fn(),
        }
    })

    describe("applyPlatformVideoOptimizations", () => {
        it("should apply video optimizations when on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)

            applyPlatformVideoOptimizations(
                mockVideoElement as unknown as HTMLVideoElement
            )

            expect(mockVideoElement.style.transform).toBe("translateZ(0)")
            expect(mockVideoElement.style.backfaceVisibility).toBe("hidden")
            expect(mockVideoElement.style.webkitBackfaceVisibility).toBe(
                "hidden"
            )
        })

        it("should load video if poster exists and video not loaded on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)
            mockVideoElement.poster = "poster.jpg"
            mockVideoElement.readyState = 0

            applyPlatformVideoOptimizations(
                mockVideoElement as unknown as HTMLVideoElement
            )

            expect(mockVideoElement.load).toHaveBeenCalled()
        })

        it("should not load video if no poster on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)
            mockVideoElement.readyState = 0

            applyPlatformVideoOptimizations(
                mockVideoElement as unknown as HTMLVideoElement
            )

            expect(mockVideoElement.load).not.toHaveBeenCalled()
        })

        it("should not apply video optimizations when not on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(false)

            applyPlatformVideoOptimizations(
                mockVideoElement as unknown as HTMLVideoElement
            )

            expect(mockVideoElement.style.transform).toBeUndefined()
            expect(mockVideoElement.style.backfaceVisibility).toBeUndefined()
        })
    })

    describe("hidePlatformVideo", () => {
        it("should hide video and release GPU layer when on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)

            hidePlatformVideo(mockVideoElement as unknown as HTMLVideoElement)

            expect(mockVideoElement.style.opacity).toBe("0")
            expect(mockVideoElement.style.visibility).toBe("hidden")
            expect(mockVideoElement.style.willChange).toBe("auto")
        })

        it("should be no-op when not on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(false)
            const stylesBefore = { ...mockVideoElement.style }

            hidePlatformVideo(mockVideoElement as unknown as HTMLVideoElement)

            expect(mockVideoElement.style).toEqual(stylesBefore)
        })
    })

    describe("getPlatformVideoAttributes", () => {
        it("should return Samsung-specific attributes when on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)

            const attributes = getPlatformVideoAttributes()

            expect(attributes).toEqual({
                preload: "metadata",
            })
        })

        it("should return empty object when not on Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(false)

            const attributes = getPlatformVideoAttributes()

            expect(attributes).toEqual({})
        })
    })

    describe("waitForPlatformVideoReady", () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        it("should resolve immediately when not on Samsung TV", async () => {
            mockIsSamsungTV.mockReturnValue(false)

            const promise = waitForPlatformVideoReady(
                mockVideoElement as unknown as HTMLVideoElement
            )

            await expect(promise).resolves.toBeUndefined()
        })

        it("should resolve immediately when video is already ready on Samsung TV", async () => {
            mockIsSamsungTV.mockReturnValue(true)
            mockVideoElement.readyState = 4

            const promise = waitForPlatformVideoReady(
                mockVideoElement as unknown as HTMLVideoElement
            )

            await expect(promise).resolves.toBeUndefined()
        })

        it("should wait for canplaythrough event and cleanup listeners when video is not ready on Samsung TV", async () => {
            mockIsSamsungTV.mockReturnValue(true)
            mockVideoElement.readyState = 2

            let canPlayThroughHandler: (() => void) | undefined
            mockVideoElement.addEventListener.mockImplementation(
                (event: string, handler: () => void) => {
                    if (event === "canplaythrough") {
                        canPlayThroughHandler = handler
                    }
                }
            )

            const promise = waitForPlatformVideoReady(
                mockVideoElement as unknown as HTMLVideoElement
            )

            expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
                "canplaythrough",
                expect.any(Function)
            )

            if (canPlayThroughHandler) {
                canPlayThroughHandler()
            }

            await expect(promise).resolves.toBeUndefined()
            expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith(
                "canplaythrough",
                expect.any(Function)
            )
        })

        it("should reject after timeout if canplaythrough never fires on Samsung TV", async () => {
            mockIsSamsungTV.mockReturnValue(true)
            mockVideoElement.readyState = 2

            const promise = waitForPlatformVideoReady(
                mockVideoElement as unknown as HTMLVideoElement
            )

            jest.advanceTimersByTime(PLATFORM_VIDEO_READY_TIMEOUT_MS)

            await expect(promise).rejects.toThrow("Samsung video ready timeout")
            expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith(
                "canplaythrough",
                expect.any(Function)
            )
        })
    })
})
