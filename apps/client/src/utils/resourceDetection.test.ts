jest.mock("./logger", () => ({
    logger: {
        error: jest.fn(),
    },
}))

jest.mock("./datadog", () => ({
    safeDatadogRum: {
        startDurationVital: jest.fn(() => ({ __dd_vital_reference: true })),
        stopDurationVital: jest.fn(),
    },
}))

describe("resourceDetection", () => {
    let mockObserverInstance: {
        observe: jest.Mock
        disconnect: jest.Mock
    }
    let mockPerformanceObserver: jest.Mock & { _callback?: any }
    let originalPerformanceObserver: typeof PerformanceObserver | undefined

    beforeEach(() => {
        jest.resetModules()
        jest.clearAllMocks()

        originalPerformanceObserver =
            (global as any).PerformanceObserver || undefined

        mockObserverInstance = {
            observe: jest.fn(),
            disconnect: jest.fn(),
        }

        mockPerformanceObserver = jest.fn((callback) => {
            mockPerformanceObserver._callback = callback
            return mockObserverInstance
        }) as jest.Mock & { _callback?: any }
        ;(global as any).PerformanceObserver = mockPerformanceObserver
    })

    afterEach(() => {
        if (originalPerformanceObserver) {
            ;(global as any).PerformanceObserver = originalPerformanceObserver
        } else {
            delete (global as any).PerformanceObserver
        }
    })

    describe("initResourceDetection", () => {
        it("should initialize PerformanceObserver when available", async () => {
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            initResourceDetection([])

            expect(mockPerformanceObserver).toHaveBeenCalledWith(
                expect.any(Function)
            )
            expect(mockObserverInstance.observe).toHaveBeenCalledWith({
                entryTypes: ["resource"],
                buffered: true,
            })
        })

        it("should not throw when PerformanceObserver is undefined", async () => {
            delete (global as any).PerformanceObserver

            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            expect(() => initResourceDetection([])).not.toThrow()
        })

        it("should call detector and log error when detection returns message", async () => {
            const { logger } = await require("./logger")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            const mockDetector = {
                name: "test",
                detect: jest.fn((url: string) =>
                    url.includes("bad") ? `Bad resource: ${url}` : null
                ),
            }

            initResourceDetection([mockDetector])

            const mockEntries = [
                {
                    entryType: "resource",
                    name: "https://example.com/bad-resource.jpg",
                },
            ]

            const callback = mockPerformanceObserver._callback
            callback({
                getEntries: () => mockEntries,
            })

            expect(mockDetector.detect).toHaveBeenCalledWith(
                "https://example.com/bad-resource.jpg"
            )
            expect(logger.error).toHaveBeenCalledWith(
                "Bad resource: https://example.com/bad-resource.jpg"
            )
        })

        it("should not log when detector returns null", async () => {
            const { logger } = await require("./logger")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            const mockDetector = {
                name: "test",
                detect: jest.fn(() => null),
            }

            initResourceDetection([mockDetector])

            const mockEntries = [
                {
                    entryType: "resource",
                    name: "https://example.com/good-resource.jpg",
                },
            ]

            const callback = mockPerformanceObserver._callback
            callback({
                getEntries: () => mockEntries,
            })

            expect(mockDetector.detect).toHaveBeenCalled()
            expect(logger.error).not.toHaveBeenCalled()
        })

        it("should call all registered detectors", async () => {
            const { logger } = await require("./logger")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            const detector1 = {
                name: "detector1",
                detect: jest.fn(() => "Error from detector1"),
            }

            const detector2 = {
                name: "detector2",
                detect: jest.fn(() => "Error from detector2"),
            }

            initResourceDetection([detector1, detector2])

            const mockEntries = [
                {
                    entryType: "resource",
                    name: "https://example.com/resource.jpg",
                },
            ]

            const callback = mockPerformanceObserver._callback
            callback({
                getEntries: () => mockEntries,
            })

            expect(detector1.detect).toHaveBeenCalledWith(
                "https://example.com/resource.jpg"
            )
            expect(detector2.detect).toHaveBeenCalledWith(
                "https://example.com/resource.jpg"
            )
            expect(logger.error).toHaveBeenCalledTimes(2)
            expect(logger.error).toHaveBeenCalledWith("Error from detector1")
            expect(logger.error).toHaveBeenCalledWith("Error from detector2")
        })

        it("should only process resource entry types", async () => {
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            const mockDetector = {
                name: "test",
                detect: jest.fn(() => "Should not be called"),
            }

            initResourceDetection([mockDetector])

            const mockEntries = [
                {
                    entryType: "navigation",
                    name: "https://example.com/page.html",
                } as any,
                {
                    entryType: "paint",
                    name: "https://example.com/image.png",
                } as any,
            ]

            const callback = mockPerformanceObserver._callback
            callback({
                getEntries: () => mockEntries,
            })

            expect(mockDetector.detect).not.toHaveBeenCalled()
        })

        it("should start and stop init vital during initialization", async () => {
            const { safeDatadogRum } = await require("./datadog")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            initResourceDetection([])

            expect(safeDatadogRum.startDurationVital).toHaveBeenCalledWith(
                "resource_detection_init"
            )
            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                expect.objectContaining({ __dd_vital_reference: true })
            )
        })

        it("should start and stop process vital", async () => {
            const { safeDatadogRum } = await require("./datadog")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            const detector1 = {
                name: "png",
                detect: jest.fn(() => null),
            }

            const detector2 = {
                name: "s3",
                detect: jest.fn(() => null),
            }

            initResourceDetection([detector1, detector2])

            const mockEntries = [
                {
                    entryType: "resource",
                    name: "https://example.com/resource.jpg",
                },
            ]

            const callback = mockPerformanceObserver._callback
            callback({
                getEntries: () => mockEntries,
            })

            expect(safeDatadogRum.startDurationVital).toHaveBeenCalledWith(
                "resource_detection_process"
            )
            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledTimes(2) // init + 1 process vital
        })

        it("should stop init vital even when initialization fails", async () => {
            const { safeDatadogRum } = await require("./datadog")

            mockPerformanceObserver.mockImplementation(() => {
                throw new Error("Observer initialization failed")
            })

            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            initResourceDetection([])

            expect(safeDatadogRum.startDurationVital).toHaveBeenCalledWith(
                "resource_detection_init"
            )
            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                expect.objectContaining({ __dd_vital_reference: true })
            )
        })

        it("should stop process vital even if detector throws error", async () => {
            const { safeDatadogRum } = await require("./datadog")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            const throwingDetector = {
                name: "throwing",
                detect: jest.fn(() => {
                    throw new Error("Detector error")
                }),
            }

            initResourceDetection([throwingDetector])

            const mockEntries = [
                {
                    entryType: "resource",
                    name: "https://example.com/resource.jpg",
                },
            ]

            const callback = mockPerformanceObserver._callback

            expect(() => {
                callback({
                    getEntries: () => mockEntries,
                })
            }).not.toThrow()

            expect(safeDatadogRum.stopDurationVital).toHaveBeenCalledWith(
                expect.objectContaining({ __dd_vital_reference: true })
            )
        })

        it("should handle errors during initialization gracefully", async () => {
            const { logger } = await require("./logger")

            mockPerformanceObserver.mockImplementation(() => {
                throw new Error("Observer initialization failed")
            })

            const { initResourceDetection } = await import(
                "./resourceDetection"
            )

            expect(() => initResourceDetection([])).not.toThrow()
            expect(logger.error).toHaveBeenCalledWith(
                "Failed to initialize resource detection",
                expect.any(Error)
            )
        })

        it("should not log duplicate errors for the same URL / detector combination", async () => {
            const { logger } = await require("./logger")
            const { initResourceDetection } = await import(
                "./resourceDetection"
            )
            const { pngDetector } = await import("./pngDetection")
            const { s3Detector } = await import("./s3Detection")

            initResourceDetection([pngDetector, s3Detector])

            const mockEntries = [
                {
                    entryType: "resource",
                    name: "https://s3.amazonaws.com/bad-resource.png",
                },
            ]

            const callback = mockPerformanceObserver._callback

            callback({
                getEntries: () => mockEntries,
            })

            expect(logger.error).toHaveBeenCalledTimes(2)
            expect(logger.error).toHaveBeenCalledWith(
                "Suboptimal image requested: https://s3.amazonaws.com/bad-resource.png"
            )
            expect(logger.error).toHaveBeenCalledWith(
                "Direct S3 URL requested: https://s3.amazonaws.com/bad-resource.png"
            )

            callback({
                getEntries: () => mockEntries,
            })

            expect(logger.error).toHaveBeenCalledTimes(2)
        })
    })
})
