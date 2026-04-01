const mockImage = {
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    src: "",
}

const originalImage = global.Image

jest.unmock("./imageFormatFallback")

beforeEach(() => {
    jest.resetModules()
    global.Image = jest.fn(() => mockImage) as any
})

afterEach(() => {
    global.Image = originalImage
    jest.clearAllMocks()
})

describe("supportsAVIF", () => {
    it("should return true when AVIF is supported", async () => {
        const { supportsAVIF } = await import("./imageFormatFallback")
        const promise = supportsAVIF()

        if (mockImage.onload) {
            mockImage.onload()
        }

        const result = await promise
        expect(result).toBe(true)
        expect(global.Image).toHaveBeenCalled()
    })

    it("should return false when AVIF is not supported", async () => {
        const { supportsAVIF } = await import("./imageFormatFallback")
        const promise = supportsAVIF()

        if (mockImage.onerror) {
            mockImage.onerror()
        }

        const result = await promise
        expect(result).toBe(false)
    })
})

describe("supportsWebP", () => {
    it("should return true when WebP is supported", async () => {
        const { supportsWebP } = await import("./imageFormatFallback")
        const promise = supportsWebP()

        if (mockImage.onload) {
            mockImage.onload()
        }

        const result = await promise
        expect(result).toBe(true)
    })

    it("should return false when WebP is not supported", async () => {
        const { supportsWebP } = await import("./imageFormatFallback")
        const promise = supportsWebP()

        if (mockImage.onerror) {
            mockImage.onerror()
        }

        const result = await promise
        expect(result).toBe(false)
    })
})

describe("getImageWithFallback", () => {
    it("should return original URL for non-AVIF images", async () => {
        const { getImageWithFallback } = await import("./imageFormatFallback")
        const result = await getImageWithFallback("/test.png")
        expect(result).toBe("/test.png")
    })
})

describe("getCSSBackgroundWithFallback", () => {
    it("should return CSS url() format", async () => {
        const { getCSSBackgroundWithFallback } = await import(
            "./imageFormatFallback"
        )
        const result = await getCSSBackgroundWithFallback("/test.png")
        expect(result).toBe('url("/test.png")')
    })
})

describe("format detection timeout", () => {
    beforeEach(() => {
        jest.resetModules()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
        global.Image = originalImage
    })

    it("should timeout AVIF detection after 5 seconds if image never loads", async () => {
        global.Image = jest.fn(
            () =>
                ({
                    onload: null,
                    onerror: null,
                    src: "",
                }) as any
        ) as any

        const { supportsAVIF, SUPPORT_TIMEOUT_MS } = await import(
            "./imageFormatFallback"
        )
        const promise = supportsAVIF()

        jest.advanceTimersByTime(SUPPORT_TIMEOUT_MS)

        const result = await promise
        expect(result).toBe(false)
    })

    it("should timeout WebP detection after 5 seconds if image never loads", async () => {
        global.Image = jest.fn(
            () =>
                ({
                    onload: null,
                    onerror: null,
                    src: "",
                }) as any
        ) as any

        const { supportsWebP, SUPPORT_TIMEOUT_MS } = await import(
            "./imageFormatFallback"
        )
        const promise = supportsWebP()

        jest.advanceTimersByTime(SUPPORT_TIMEOUT_MS)

        const result = await promise
        expect(result).toBe(false)
    })

    it("should clear timeout when AVIF loads successfully", async () => {
        const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
        let imageInstance: any

        global.Image = jest.fn(() => {
            imageInstance = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }
            return imageInstance
        }) as any

        const { supportsAVIF } = await import("./imageFormatFallback")
        const promise = supportsAVIF()

        if (imageInstance?.onload) {
            imageInstance.onload()
        }

        const result = await promise
        expect(result).toBe(true)
        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
    })

    it("should clear timeout when WebP loads successfully", async () => {
        const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
        let imageInstance: any

        global.Image = jest.fn(() => {
            imageInstance = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }
            return imageInstance
        }) as any

        const { supportsWebP } = await import("./imageFormatFallback")
        const promise = supportsWebP()

        if (imageInstance?.onload) {
            imageInstance.onload()
        }

        const result = await promise
        expect(result).toBe(true)
        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
    })

    it("should clear timeout when AVIF errors", async () => {
        const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
        let imageInstance: any

        global.Image = jest.fn(() => {
            imageInstance = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }
            return imageInstance
        }) as any

        const { supportsAVIF } = await import("./imageFormatFallback")
        const promise = supportsAVIF()

        if (imageInstance?.onerror) {
            imageInstance.onerror()
        }

        const result = await promise
        expect(result).toBe(false)
        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
    })

    it("should clear timeout when WebP errors", async () => {
        const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
        let imageInstance: any

        global.Image = jest.fn(() => {
            imageInstance = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }
            return imageInstance
        }) as any

        const { supportsWebP } = await import("./imageFormatFallback")
        const promise = supportsWebP()

        if (imageInstance?.onerror) {
            imageInstance.onerror()
        }

        const result = await promise
        expect(result).toBe(false)
        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
    })
})
