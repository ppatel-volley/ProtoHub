import { renderHook } from "@testing-library/react"

import { BASE_URL } from "../config/envconfig"
import { AudioManager, useSuccessAudio } from "./AudioManager"

jest.mock("./logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("../hooks/useNativeFocus", () => ({
    useNativeFocus: jest.fn(),
}))

jest.mock("../config/envconfig", () => ({
    BASE_URL: "/",
}))

const mockIsSamsungTV = jest.fn().mockReturnValue(false)
const mockIsFireTV = jest.fn().mockReturnValue(false)
jest.mock("../config/platformDetection", () => ({
    isSamsungTV: (...args: unknown[]): boolean => mockIsSamsungTV(...args),
    isFireTV: (...args: unknown[]): boolean => mockIsFireTV(...args),
}))

jest.mock("howler", () => ({
    Howl: jest.fn().mockImplementation(() => ({
        play: jest.fn(),
        pause: jest.fn(),
        stop: jest.fn(),
        mute: jest.fn(),
        loop: jest.fn(),
        volume: jest.fn(),
    })),
    Howler: {
        usingWebAudio: true,
    },
}))

const mockAudio = {
    play: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentTime: 0,
    src: "",
    preload: "",
}

Object.defineProperty(window, "Audio", {
    writable: true,
    value: jest.fn().mockImplementation(() => mockAudio),
})

describe("AudioManager", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        AudioManager.clearCache()
        mockAudio.currentTime = 0
    })

    describe("clearCache", () => {
        it("should clear the audio cache", () => {
            expect(() => AudioManager.clearCache()).not.toThrow()
        })
    })

    describe("useSuccessAudio", () => {
        beforeAll(() => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            })
        })

        it("should return an AudioPlayerCompatible object", () => {
            const { result } = renderHook(() => useSuccessAudio())

            expect(result.current).toHaveProperty("play")
            expect(result.current).toHaveProperty("pause")
            expect(result.current).toHaveProperty("stop")
            expect(result.current).toHaveProperty("mute")
            expect(result.current).toHaveProperty("loop")
            expect(result.current).toHaveProperty("volume")

            expect(typeof result.current.play).toBe("function")
            expect(typeof result.current.pause).toBe("function")
            expect(typeof result.current.stop).toBe("function")
        })

        it("should use HTML5 Audio on Android devices", () => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                value: "Mozilla/5.0 (Linux; Android 10; SM-G973F)",
            })

            const { result } = renderHook(() => useSuccessAudio())

            expect(result.current).toHaveProperty("play")
            expect(typeof result.current.play).toBe("function")
        })

        it("should use Howler.js on non-Android devices", () => {
            Object.defineProperty(navigator, "userAgent", {
                writable: true,
                value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            })

            const { Howl } = require("howler")

            const { result } = renderHook(() => useSuccessAudio())

            expect(Howl).toHaveBeenCalledWith({
                src: [`${BASE_URL}assets/sfx/success.m4a`],
                html5: false,
            })
            expect(result.current).toHaveProperty("play")
        })
    })
})
