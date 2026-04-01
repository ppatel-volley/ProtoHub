import { act, renderHook } from "@testing-library/react"

import { BASE_URL } from "../config/envconfig"
import {
    isLGOrSamsungTV,
    isLGTV,
    isSamsungTV,
    shouldUseWebCheckout,
} from "../config/platformDetection"
import { GameStatus, PaywallType } from "../constants/game"
import { getExperimentManager } from "../experiments/ExperimentManager"
import type { Game } from "./useGames"
import { GameId, useGames } from "./useGames"
jest.mock("../experiments/ExperimentManager")
jest.mock("../config/envconfig", () => ({
    BASE_URL: "https://assets.volley.tv/",
    ENVIRONMENT: "dev",
    getWindowVar: jest.fn(),
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useDeviceInfo: jest.fn(() => ({
        getOSVersion: jest.fn(() => "OS 7.0"),
    })),
}))

jest.mock("../config/platformDetection", () => ({
    shouldUseWebCheckout: jest.fn(() => false),
    isLGOrSamsungTV: jest.fn(() => false),
    isLGTV: jest.fn(() => false),
    isSamsungTV: jest.fn(() => false),
    getCachedPlatform: jest.fn(() => "WEB"),
}))

describe("useGames", () => {
    const mockExperimentManager = {
        getVariant: jest.fn(),
        onInitialized: jest.fn().mockReturnValue(() => {}),
    }

    const waitForPromises = async (callback?: () => void): Promise<void> => {
        await act(async () => {
            if (callback) callback()
            await new Promise((resolve) => setTimeout(resolve, 0))
        })
    }

    const initializeHook = async (): Promise<{ current: Game[] }> => {
        const { result } = renderHook(() => useGames())

        await waitForPromises()
        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) throw new Error("Callback not found")

        await waitForPromises(callback)
        return result
    }

    const createMockImage = (options?: {
        failUrls?: string[]
        onSrcSet?: (url: string) => void
    }): typeof Image => {
        return class MockImage {
            private _src = ""

            public addEventListener = jest.fn(
                (event: string, callback: () => void) => {
                    if (event === "load") {
                        this.loadCallback = callback
                    } else if (event === "error") {
                        this.errorCallback = callback
                    }
                }
            )

            private errorCallback: (() => void) | null = null

            private loadCallback: (() => void) | null = null

            public onerror: (() => void) | null = null

            public onload: (() => void) | null = null

            public removeEventListener = jest.fn()

            public get src(): string {
                return this._src
            }

            public set src(value: string) {
                this._src = value
                options?.onSrcSet?.(value)

                const shouldFail = options?.failUrls?.some(
                    (failUrl) => value === failUrl
                )

                if (shouldFail && this.errorCallback) {
                    this.errorCallback()
                } else if (!shouldFail && value && this.loadCallback) {
                    this.loadCallback()
                }
            }
        } as unknown as typeof Image
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )
        ;(shouldUseWebCheckout as jest.Mock).mockReturnValue(false)
        ;(isLGTV as jest.Mock).mockReturnValue(false)
        ;(isSamsungTV as jest.Mock).mockReturnValue(false)
        global.fetch = jest.fn().mockResolvedValue({ ok: true })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe("experiment initialization", () => {
        it("returns empty array when experiments are not initialized", async () => {
            mockExperimentManager.getVariant.mockImplementation(() => {
                throw new Error("Not initialized")
            })

            const { result } = renderHook(() => useGames())
            await waitForPromises()
            expect(result.current).toEqual([])
        })

        it("updates games when experiments are initialized", async () => {
            mockExperimentManager.getVariant.mockImplementation(() => {
                throw new Error("Not initialized")
            })

            const { result } = renderHook(() => useGames())
            await waitForPromises()
            expect(result.current).toEqual([])

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "reorder-mp-tiles") {
                    return {
                        value: "treatment",
                        payload: ["song-quiz", "jeopardy", "wheel-of-fortune"],
                    }
                }
                return { value: "control" }
            })

            const calls = mockExperimentManager.onInitialized.mock.calls as [
                () => void,
            ][]
            const callback = calls[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            expect(result.current).toEqual([
                expect.objectContaining({ id: "song-quiz" }),
                expect.objectContaining({ id: "jeopardy" }),
                expect.objectContaining({ id: "wheel-of-fortune" }),
            ])
        })

        it("cleans up onInitialized subscription on unmount", async () => {
            const cleanup = jest.fn()
            mockExperimentManager.onInitialized.mockReturnValue(cleanup)

            const { unmount } = renderHook(() => useGames())

            await waitForPromises()

            unmount()

            expect(cleanup).toHaveBeenCalledTimes(1)
        })
    })

    it("should return default games when no experiments are active", async () => {
        mockExperimentManager.getVariant.mockImplementation(
            (_name: string) => ({
                value: "control",
                payload: null,
            })
        )

        const { result } = renderHook(() => useGames())

        await waitForPromises()

        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) {
            throw new Error("Callback not found")
        }

        await waitForPromises(callback)

        expect(result.current).toHaveLength(5)
        expect(result.current[0]?.id).toBe(GameId.Jeopardy)
        expect(result.current[1]?.id).toBe(GameId.SongQuiz)
        expect(result.current[2]?.id).toBe(GameId.CoComelon)
        expect(result.current[3]?.id).toBe(GameId.WheelOfFortune)
        expect(result.current[4]?.id).toBe(GameId.WitsEnd)
    })

    it("should reorder games based on experiment payload", async () => {
        mockExperimentManager.getVariant.mockImplementation((name: string) => {
            if (name === "reorder-mp-tiles") {
                return {
                    value: "test",
                    payload: ["wheel-of-fortune", "jeopardy", "song-quiz"],
                }
            }
            return { value: "control", payload: null }
        })

        const { result } = renderHook(() => useGames())

        await waitForPromises()

        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) {
            throw new Error("Callback not found")
        }

        await waitForPromises(callback)

        expect(result.current).toHaveLength(3)
        expect(result.current[0]?.id).toBe(GameId.WheelOfFortune)
        expect(result.current[1]?.id).toBe(GameId.Jeopardy)
        expect(result.current[2]?.id).toBe(GameId.SongQuiz)
    })

    it("should override game payload when experiment is active and valid", async () => {
        const customJeopardyPayload = {
            id: GameId.Jeopardy,
            trackingId: "jeopardy",
            title: "Custom Jeopardy",
            tileImageUrl: "custom-image.avif",
            heroImageUrl: "custom-hero.avif",
            animationUri:
                "https://assets.volley.tv/assets/animations/jeopardy_tile_animation.riv",
            paywallType: PaywallType.Soft,
        }

        mockExperimentManager.getVariant.mockImplementation((name: string) => {
            if (name === "jeopardy-payload-swap") {
                return {
                    value: "test",
                    payload: customJeopardyPayload,
                }
            }
            return { value: "control", payload: null }
        })

        const { result } = renderHook(() => useGames())

        await waitForPromises()

        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) {
            throw new Error("Callback not found")
        }

        await waitForPromises(callback)

        expect(result.current[0]).toEqual(customJeopardyPayload)
    })

    it("should fall back to default when payload validation fails", async () => {
        mockExperimentManager.getVariant.mockImplementation((name: string) => {
            if (name === "jeopardy-payload-swap") {
                return {
                    value: "test",
                    payload: {
                        id: GameId.Jeopardy,
                        // Missing required fields
                    },
                }
            }
            return { value: "control", payload: null }
        })

        const { result } = renderHook(() => useGames())

        await waitForPromises()

        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) {
            throw new Error("Callback not found")
        }

        await waitForPromises(callback)

        expect(result.current[0]).toEqual(
            expect.objectContaining({
                id: GameId.Jeopardy,
                title: "Jeopardy",
                tileImageUrl: `${BASE_URL}assets/images/games/tiles/jeopardy.avif`,
            })
        )
    })

    it("should handle multiple game payload overrides", async () => {
        const customJeopardyPayload = {
            id: GameId.Jeopardy,
            trackingId: "jeopardy",
            title: "Custom Jeopardy",
            tileImageUrl: "custom-image.avif",
            heroImageUrl: "custom-hero.avif",
            animationUri:
                "https://assets.volley.tv/assets/animations/jeopardy_tile_animation.riv",
            paywallType: PaywallType.Soft,
        }

        const customSongQuizPayload = {
            id: GameId.SongQuiz,
            trackingId: "song-quiz",
            title: "Custom Song Quiz",
            tileImageUrl: "custom-song-quiz.avif",
            heroImageUrl: "custom-song-quiz-hero.avif",
            animationUri:
                "https://assets.volley.tv/assets/animations/song_quiz_tile_animation.riv",
            paywallType: PaywallType.Soft,
        }

        mockExperimentManager.getVariant.mockImplementation((name: string) => {
            if (name === "jeopardy-payload-swap") {
                return {
                    value: "test",
                    payload: customJeopardyPayload,
                }
            }
            if (name === "song-quiz-payload-swap") {
                return {
                    value: "test",
                    payload: customSongQuizPayload,
                }
            }
            return { value: "control", payload: null }
        })

        const { result } = renderHook(() => useGames())

        await waitForPromises()

        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) {
            throw new Error("Callback not found")
        }

        await waitForPromises(callback)

        expect(result.current[0]).toEqual(customJeopardyPayload)
        expect(result.current[1]).toEqual(customSongQuizPayload)
        expect(result.current[2]?.id).toBe(GameId.CoComelon)
        expect(result.current[3]?.id).toBe(GameId.WheelOfFortune)
        expect(result.current[4]?.id).toBe(GameId.WitsEnd)
    })

    it("includes game status in returned data", async () => {
        const { result } = renderHook(() => useGames())

        await waitForPromises()

        expect(result.current).toEqual([])

        const callback = (
            mockExperimentManager.onInitialized.mock.calls as [() => void][]
        )[0]?.[0]
        if (!callback) {
            throw new Error("Callback not found")
        }

        await waitForPromises(callback)

        const jeopardy = result.current.find(
            (game: Game) => game.id === GameId.Jeopardy
        )
        const songQuiz = result.current.find(
            (game: Game) => game.id === GameId.SongQuiz
        )
        const cocomelon = result.current.find(
            (game: Game) => game.id === GameId.CoComelon
        )
        const wof = result.current.find(
            (game: Game) => game.id === GameId.WheelOfFortune
        )
        const witsEnd = result.current.find(
            (game: Game) => game.id === GameId.WitsEnd
        )
        expect(jeopardy?.status).toBeUndefined()
        expect(songQuiz?.status).toBeUndefined()
        expect(cocomelon?.status).toBeUndefined()
        expect(wof?.status).toBe("coming-soon")
        expect(witsEnd?.status).toBe("beta")
    })

    describe("image validation", () => {
        beforeEach(() => {
            global.fetch = jest.fn().mockResolvedValue({ ok: true })
            jest.spyOn(console, "error").mockImplementation(() => {})
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it("optimistically uses new images before validation", async () => {
            const newImage = "https://example.com/new-image.avif"
            const newHeroImage = "https://example.com/new-hero.avif"

            mockExperimentManager.getVariant.mockImplementation(() => {
                throw new Error("Not initialized")
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            expect(result.current).toEqual([])

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            tileImageUrl: newImage,
                            heroImageUrl: newHeroImage,
                        },
                    }
                }
                return { value: "control" }
            })

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const finalGame = result.current[0]
            expect(finalGame?.tileImageUrl).toBe(newImage)
            expect(finalGame?.heroImageUrl).toBe(newHeroImage)
        })

        it("falls back to default images when validation fails", async () => {
            const newImage = "https://example.com/new-image.avif"
            const newHeroImage = "https://example.com/new-hero.avif"
            const defaultImage = `${BASE_URL}assets/images/games/tiles/jeopardy.avif`
            const defaultHeroImage = `${BASE_URL}assets/images/games/heroes/jeopardy.avif`

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            tileImageUrl: newImage,
                            heroImageUrl: newHeroImage,
                        },
                    }
                }
                return { value: "control" }
            })

            const originalImage = global.Image
            global.Image = createMockImage({
                failUrls: [newImage, newHeroImage],
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const finalGame = result.current[0]
            expect(finalGame?.tileImageUrl).toBe(defaultImage)
            expect(finalGame?.heroImageUrl).toBe(defaultHeroImage)

            global.Image = originalImage
        })

        it("falls back to default images when network errors occur", async () => {
            const newImage = "https://example.com/new-image.avif"
            const defaultImage = `${BASE_URL}assets/images/games/tiles/jeopardy.avif`

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            tileImageUrl: newImage,
                        },
                    }
                }
                return { value: "control" }
            })

            const originalImage = global.Image
            global.Image = createMockImage({
                failUrls: [newImage],
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const finalGame = result.current[0]
            expect(finalGame?.tileImageUrl).toBe(defaultImage)

            global.Image = originalImage
        })

        it("validates images when not aborted", async () => {
            const newImage = "https://example.com/new-image.avif"

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            tileImageUrl: newImage,
                        },
                    }
                }
                return { value: "control" }
            })

            let imageValidationAttempted = false
            const originalImage = global.Image
            global.Image = createMockImage({
                onSrcSet: () => {
                    imageValidationAttempted = true
                },
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            expect(imageValidationAttempted).toBe(true)
            expect(result.current[0]?.tileImageUrl).toBe(newImage)

            global.Image = originalImage
        })

        it("falls back to default images when Image loading fails", async () => {
            const newImage = "https://example.com/new-image.avif"
            const newHeroImage = "https://example.com/new-hero.avif"
            const defaultImage = `${BASE_URL}assets/images/games/tiles/jeopardy.avif`
            const defaultHeroImage = `${BASE_URL}assets/images/games/heroes/jeopardy.avif`

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            tileImageUrl: newImage,
                            heroImageUrl: newHeroImage,
                        },
                    }
                }
                return { value: "control" }
            })
            const originalImage = global.Image
            global.Image = createMockImage({
                failUrls: [newImage, newHeroImage],
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const finalGame = result.current[0]
            expect(finalGame?.tileImageUrl).toBe(defaultImage)
            expect(finalGame?.heroImageUrl).toBe(defaultHeroImage)

            // Restore original Image
            global.Image = originalImage
        })
    })

    describe("video validation", () => {
        beforeEach(() => {
            global.fetch = jest.fn().mockResolvedValue({ ok: true })
            jest.spyOn(console, "error").mockImplementation(() => {})
        })

        afterEach(() => {
            jest.restoreAllMocks()
        })

        it("should validate video URLs using fetch only (no Image loading)", async () => {
            const videoUrl = "https://example.com/video.mp4"
            const fetchMock = global.fetch as jest.Mock

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            videoUrl: videoUrl,
                        },
                    }
                }
                return { value: "control" }
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const gameBeforeValidation = result.current[0]
            expect(gameBeforeValidation?.videoUrl).toBe(videoUrl)

            expect(fetchMock).toHaveBeenCalledWith(
                videoUrl,
                expect.objectContaining({
                    method: "HEAD",
                    mode: "no-cors",
                })
            )

            const originalImage = global.Image
            const mockImageConstructor = jest.fn()
            global.Image = mockImageConstructor as any

            await waitForPromises()

            expect(mockImageConstructor).not.toHaveBeenCalled()

            global.Image = originalImage
        })

        it("should keep video URL when fetch succeeds", async () => {
            const videoUrl = "https://example.com/video.mp4"
            ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            videoUrl: videoUrl,
                        },
                    }
                }
                return { value: "control" }
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const finalGame = result.current[0]
            expect(finalGame?.videoUrl).toBe(videoUrl)
        })

        it("should remove video URL when validation fails and no default exists", async () => {
            const newVideoUrl = "https://example.com/invalid-video.mp4"
            const defaultVideoUrl = undefined

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            videoUrl: newVideoUrl,
                        },
                    }
                }
                return { value: "control" }
            })
            ;(global.fetch as jest.Mock).mockRejectedValue(
                new Error("Network error")
            )

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            await waitForPromises()

            const finalGame = result.current[0]
            expect(finalGame?.videoUrl).toBe(defaultVideoUrl)
        })

        it("should handle video and image URLs independently", async () => {
            const newImage = "https://example.com/image.avif"
            const newVideoUrl = "https://example.com/video.mp4"

            const originalImage = global.Image
            global.Image = createMockImage({
                failUrls: [newImage],
            })

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            heroImageUrl: newImage,
                            videoUrl: newVideoUrl,
                        },
                    }
                }
                return { value: "control" }
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const finalGame = result.current[0]

            expect(finalGame?.heroImageUrl).toBe(
                `${BASE_URL}assets/images/games/heroes/jeopardy.avif`
            )

            expect(finalGame?.videoUrl).toBe(newVideoUrl)

            global.Image = originalImage
        })

        it("should handle abort signals for video validation", async () => {
            const videoUrl = "https://example.com/video.mp4"
            let videoFetchAborted = false

            ;(global.fetch as jest.Mock).mockImplementation(
                (url, options: { signal?: AbortSignal }) => {
                    if (url === videoUrl && options?.signal) {
                        options.signal.addEventListener("abort", () => {
                            videoFetchAborted = true
                        })
                    }
                    return new Promise(() => {})
                }
            )

            mockExperimentManager.getVariant.mockImplementation((flag) => {
                if (flag === "jeopardy-payload-swap") {
                    return {
                        value: "treatment",
                        payload: {
                            id: GameId.Jeopardy,
                            videoUrl: videoUrl,
                        },
                    }
                }
                return { value: "control" }
            })

            const { unmount } = renderHook(() => useGames())

            await waitForPromises()

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            unmount()

            expect(videoFetchAborted).toBe(true)
        })
    })

    describe("payload override field handling", () => {
        it("should keep default values for omitted fields", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (name: string) => {
                    if (name === "reorder-mp-tiles") {
                        return {
                            value: "test",
                            payload: [
                                "wheel-of-fortune",
                                "jeopardy",
                                "song-quiz",
                            ],
                        }
                    }
                    if (name === "wheel-of-fortune-payload-swap") {
                        return {
                            value: "test",
                            payload: {
                                id: GameId.WheelOfFortune,
                            },
                        }
                    }
                    return { value: "control", payload: null }
                }
            )

            const result = await initializeHook()

            expect(result.current[0]).toEqual(
                expect.objectContaining({
                    id: GameId.WheelOfFortune,
                    status: GameStatus.ComingSoon,
                })
            )
        })

        it("should remove optional fields when set to false (backwards compatibility)", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (name: string) => {
                    if (name === "reorder-mp-tiles") {
                        return {
                            value: "test",
                            payload: [
                                "song-quiz",
                                "jeopardy",
                                "wheel-of-fortune",
                            ],
                        }
                    }
                    if (name === "song-quiz-payload-swap") {
                        return {
                            value: "test",
                            payload: {
                                id: GameId.SongQuiz,
                                status: false,
                            },
                        }
                    }
                    return { value: "control", payload: null }
                }
            )

            const result = await initializeHook()

            expect(result.current[0]).toEqual(
                expect.objectContaining({
                    id: GameId.SongQuiz,
                    status: undefined,
                })
            )
        })

        it("should remove optional fields when set to 'none'", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (name: string) => {
                    if (name === "reorder-mp-tiles") {
                        return {
                            value: "test",
                            payload: [
                                "song-quiz",
                                "jeopardy",
                                "wheel-of-fortune",
                            ],
                        }
                    }
                    if (name === "song-quiz-payload-swap") {
                        return {
                            value: "test",
                            payload: {
                                id: GameId.SongQuiz,
                                status: "none",
                            },
                        }
                    }
                    return { value: "control", payload: null }
                }
            )

            const result = await initializeHook()

            expect(result.current[0]).toEqual(
                expect.objectContaining({
                    id: GameId.SongQuiz,
                    status: undefined,
                })
            )
        })

        it("should preserve paywallType 'none' as a valid value (not convert to undefined)", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (name: string) => {
                    if (name === "jeopardy-payload-swap") {
                        return {
                            value: "test",
                            payload: {
                                id: GameId.Jeopardy,
                                paywallType: "none",
                            },
                        }
                    }
                    return { value: "control", payload: null }
                }
            )

            const result = await initializeHook()

            expect(result.current[0]).toEqual(
                expect.objectContaining({
                    id: GameId.Jeopardy,
                    paywallType: "none",
                })
            )
        })

        it("should handle mixed 'none' values correctly (paywallType preserved, others converted)", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (name: string) => {
                    if (name === "jeopardy-payload-swap") {
                        return {
                            value: "test",
                            payload: {
                                id: GameId.Jeopardy,
                                paywallType: "none",
                                status: "none",
                                videoUrl: "none",
                            },
                        }
                    }
                    return { value: "control", payload: null }
                }
            )

            const result = await initializeHook()

            expect(result.current[0]).toEqual(
                expect.objectContaining({
                    id: GameId.Jeopardy,
                    paywallType: "none",
                    status: undefined,
                    videoUrl: undefined,
                })
            )
        })

        it("should update optional fields with new values", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (name: string) => {
                    if (name === "reorder-mp-tiles") {
                        return {
                            value: "test",
                            payload: [
                                "song-quiz",
                                "jeopardy",
                                "wheel-of-fortune",
                            ],
                        }
                    }
                    if (name === "song-quiz-payload-swap") {
                        return {
                            value: "test",
                            payload: {
                                id: GameId.SongQuiz,
                                status: GameStatus.Beta,
                            },
                        }
                    }
                    return { value: "control", payload: null }
                }
            )

            const result = await initializeHook()

            expect(result.current[0]).toEqual(
                expect.objectContaining({
                    id: GameId.SongQuiz,
                    status: GameStatus.Beta,
                })
            )
        })
    })

    describe("game status behavior", () => {
        it("should show coming-soon status for WOF and beta for Wit's End", async () => {
            mockExperimentManager.getVariant.mockImplementation(() => {
                throw new Error("Not initialized")
            })

            const { result } = renderHook(() => useGames())

            await waitForPromises()

            expect(result.current).toEqual([])

            mockExperimentManager.getVariant.mockImplementation(
                (_name: string) => ({
                    value: "control",
                    payload: null,
                })
            )

            const callback = (
                mockExperimentManager.onInitialized.mock.calls as [() => void][]
            )[0]?.[0]
            if (!callback) {
                throw new Error("Callback not found")
            }

            await waitForPromises(callback)

            const jeopardy = result.current.find(
                (game: Game) => game.id === GameId.Jeopardy
            )
            const songQuiz = result.current.find(
                (game: Game) => game.id === GameId.SongQuiz
            )
            const cocomelon = result.current.find(
                (game: Game) => game.id === GameId.CoComelon
            )
            const wheelOfFortune = result.current.find(
                (game: Game) => game.id === GameId.WheelOfFortune
            )
            const witsEnd = result.current.find(
                (game: Game) => game.id === GameId.WitsEnd
            )

            expect(jeopardy?.status).toBeUndefined()
            expect(songQuiz?.status).toBeUndefined()
            expect(cocomelon?.status).toBeUndefined()
            expect(wheelOfFortune?.status).toBe("coming-soon")
            expect(witsEnd?.status).toBe("beta")
        })
    })

    describe("paywall type based on shouldUseWebCheckout", () => {
        const mockShouldUseWebCheckout = shouldUseWebCheckout as jest.Mock

        beforeEach(() => {
            mockShouldUseWebCheckout.mockReturnValue(false)
        })

        it("should keep Wit's End and CCM as hard paywalls when shouldUseWebCheckout returns false", async () => {
            mockShouldUseWebCheckout.mockReturnValue(false)
            mockExperimentManager.getVariant.mockImplementation(
                (_name: string) => ({
                    value: "control",
                    payload: null,
                })
            )

            const result = await initializeHook()

            expect(result.current).toHaveLength(5)
            const jeopardy = result.current.find(
                (game) => game.id === GameId.Jeopardy
            )
            const songQuiz = result.current.find(
                (game) => game.id === GameId.SongQuiz
            )
            const cocomelon = result.current.find(
                (game) => game.id === GameId.CoComelon
            )
            const wof = result.current.find(
                (game) => game.id === GameId.WheelOfFortune
            )
            const witsEnd = result.current.find(
                (game) => game.id === GameId.WitsEnd
            )
            expect(jeopardy?.paywallType).toBe("soft")
            expect(songQuiz?.paywallType).toBe("soft")
            expect(cocomelon?.paywallType).toBe("hard")
            expect(wof?.paywallType).toBe("soft")
            expect(witsEnd?.paywallType).toBe("hard")
        })

        it("should use hard paywalls for all games when shouldUseWebCheckout returns true", async () => {
            mockShouldUseWebCheckout.mockReturnValue(true)
            mockExperimentManager.getVariant.mockImplementation(
                (_name: string) => ({
                    value: "control",
                    payload: null,
                })
            )

            const result = await initializeHook()

            expect(result.current).toHaveLength(5)
            result.current.forEach((game) => {
                expect(game.paywallType).toBe("hard")
            })
        })
    })

    describe("LG/Samsung platform specific behavior", () => {
        const mockIsLGOrSamsungTV = isLGOrSamsungTV as jest.Mock
        const mockIsLGTV = isLGTV as jest.Mock
        const mockIsSamsungTV = isSamsungTV as jest.Mock

        beforeEach(() => {
            mockIsLGOrSamsungTV.mockReturnValue(false)
            mockIsLGTV.mockReturnValue(false)
            mockIsSamsungTV.mockReturnValue(false)
        })

        it("should return LG/Samsung game order and status on LG TV", async () => {
            mockIsLGOrSamsungTV.mockReturnValue(true)
            mockIsLGTV.mockReturnValue(true)
            mockExperimentManager.getVariant.mockImplementation(
                (_name: string) => ({
                    value: "control",
                    payload: null,
                })
            )

            const result = await initializeHook()

            expect(result.current).toHaveLength(5)
            expect(result.current[0]?.id).toBe(GameId.SongQuiz)
            expect(result.current[1]?.id).toBe(GameId.Jeopardy)
            expect(result.current[2]?.id).toBe(GameId.CoComelon)
            expect(result.current[3]?.id).toBe(GameId.WheelOfFortune)
            expect(result.current[4]?.id).toBe(GameId.WitsEnd)

            expect(result.current[0]?.status).toBeUndefined()
            expect(result.current[1]?.status).toBeUndefined()
            expect(result.current[2]?.status).toBeUndefined()
            expect(result.current[3]?.status).toBe("coming-soon")
            expect(result.current[4]?.status).toBe("beta")
        })

        it("should return LG/Samsung game order and status on Samsung TV", async () => {
            mockIsLGOrSamsungTV.mockReturnValue(true)
            mockIsSamsungTV.mockReturnValue(true)
            mockExperimentManager.getVariant.mockImplementation(
                (_name: string) => ({
                    value: "control",
                    payload: null,
                })
            )

            const result = await initializeHook()

            expect(result.current).toHaveLength(5)
            expect(result.current[0]?.id).toBe(GameId.SongQuiz)
            expect(result.current[1]?.id).toBe(GameId.Jeopardy)
            expect(result.current[2]?.id).toBe(GameId.CoComelon)
            expect(result.current[3]?.id).toBe(GameId.WheelOfFortune)
            expect(result.current[4]?.id).toBe(GameId.WitsEnd)

            expect(result.current[0]?.status).toBeUndefined()
            expect(result.current[1]?.status).toBeUndefined()
            expect(result.current[2]?.status).toBeUndefined()
            expect(result.current[3]?.status).toBe("coming-soon")
            expect(result.current[4]?.status).toBe("beta")
        })

        it("should return default behavior for non-LG/Samsung platforms", async () => {
            mockExperimentManager.getVariant.mockImplementation(
                (_name: string) => ({
                    value: "control",
                    payload: null,
                })
            )

            const result = await initializeHook()

            expect(result.current).toHaveLength(5)
            expect(result.current[0]?.id).toBe(GameId.Jeopardy)
            expect(result.current[1]?.id).toBe(GameId.SongQuiz)
            expect(result.current[2]?.id).toBe(GameId.CoComelon)
            expect(result.current[3]?.id).toBe(GameId.WheelOfFortune)
            expect(result.current[4]?.id).toBe(GameId.WitsEnd)

            expect(result.current[0]?.status).toBeUndefined()
            expect(result.current[1]?.status).toBeUndefined()
            expect(result.current[2]?.status).toBeUndefined()
            expect(result.current[3]?.status).toBe("coming-soon")
            expect(result.current[4]?.status).toBe("beta")
        })
    })
})

describe("getDefaultGameOrder", () => {
    const { getDefaultGameOrder } = require("./useGames") as {
        getDefaultGameOrder: (
            osVersion?: string,
            environment?: string
        ) => GameId[]
    }
    const { Environment } = require("../config/environment") as {
        Environment: {
            DEVELOPMENT: string
            STAGING: string
            PRODUCTION: string
            LOCAL: string
        }
    }

    it("should include Wit's End by default", () => {
        const result = getDefaultGameOrder("7.0", Environment.PRODUCTION)

        expect(result).toContain(GameId.WitsEnd)
    })

    describe("platform-based filtering", () => {
        const mockIsSamsungTV = isSamsungTV as jest.Mock
        const mockIsLGTV = isLGTV as jest.Mock

        afterEach(() => {
            mockIsSamsungTV.mockReturnValue(false)
            mockIsLGTV.mockReturnValue(false)
        })

        it("should exclude CoComelon on legacy Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)

            const result = getDefaultGameOrder("5.5", Environment.DEVELOPMENT)

            expect(result).not.toContain(GameId.CoComelon)
        })

        it("should include CoComelon on modern Samsung TV", () => {
            mockIsSamsungTV.mockReturnValue(true)

            const result = getDefaultGameOrder("7.0", Environment.DEVELOPMENT)

            expect(result).toContain(GameId.CoComelon)
        })

        it("should exclude CoComelon on LG webOS 6", () => {
            mockIsLGTV.mockReturnValue(true)

            const result = getDefaultGameOrder("6.0", Environment.DEVELOPMENT)

            expect(result).not.toContain(GameId.CoComelon)
        })

        it("should include CoComelon on modern LG webOS", () => {
            mockIsLGTV.mockReturnValue(true)

            const result = getDefaultGameOrder("7.0", Environment.DEVELOPMENT)

            expect(result).toContain(GameId.CoComelon)
        })
    })
})
