import { BRANDED_COPY } from "../../config/branding"
import { PaywallType } from "../../constants/game"
import { UpsellEventSubCategory } from "../../constants/tracking"
import { getExperimentManager } from "../../experiments/ExperimentManager"
import { ExperimentFlag } from "../../experiments/experimentSchemata"
import type { Game } from "../../hooks/useGames"
import { GameId } from "../../hooks/useGames"
import {
    ALL_GAMES_VIDEO_PATH,
    type ExtendedSubscribeOptions,
    getWebCheckoutModalContent,
    JEOPARDY_VIDEO_PATH,
    ModalText,
    SONGQUIZ_VIDEO_PATH,
    type UpsellContext,
} from "./webCheckoutModalConfig"

jest.mock("../../experiments/ExperimentManager", () => ({
    getExperimentManager: jest.fn(),
}))

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/",
    getWindowVar: jest.fn(),
}))

jest.mock("../../config/branding", () => ({
    ...jest.requireActual("../../config/branding"),
    getCopy: jest.fn((key: string) => {
        const copy = jest.requireActual("../../config/branding").BRANDED_COPY
        return copy[key]?.volley ?? key
    }),
}))

const mockGame: Game = {
    id: GameId.Jeopardy,
    trackingId: "jeopardy" as any,
    title: "Jeopardy",
    tileImageUrl: "/tile.avif",
    heroImageUrl: "/hero_jeopardy.avif",
    paywallType: PaywallType.Soft,
}

describe("webCheckoutModalConfig", () => {
    const mockExperimentManager = {
        getVariant: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockExperimentManager.getVariant.mockReset()
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )
    })

    describe("getWebCheckoutModalContent", () => {
        describe("without experiment configuration", () => {
            beforeEach(() => {
                mockExperimentManager.getVariant.mockReturnValue(undefined)
            })

            it("should return immediate upsell content for immediate context", () => {
                const context: UpsellContext = { type: "immediate" }

                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: ALL_GAMES_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: BRANDED_COPY.defaultModalHeading.volley,
                    subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 57.76,
                    },
                })
            })

            it("should return game-specific content for game-selection context with Jeopardy", () => {
                const jeopardyGame = {
                    ...mockGame,
                    id: GameId.Jeopardy,
                    title: "Jeopardy",
                }
                const context: UpsellContext = {
                    type: "game-selection",
                    game: jeopardyGame,
                }

                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: JEOPARDY_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/jeopardy.webp",
                    mainHeading: ModalText.JeopardyMainHeading,
                    subtitle: BRANDED_COPY.jeopardyModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 67,
                    },
                })
            })

            it("should return game-specific content for game-selection context with Song Quiz", () => {
                const songQuizGame = {
                    ...mockGame,
                    id: GameId.SongQuiz,
                    title: "Song Quiz",
                    heroImageUrl: "/hero_song_quiz.avif",
                }
                const context: UpsellContext = {
                    type: "game-selection",
                    game: songQuizGame,
                }

                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: SONGQUIZ_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/song-quiz.webp",
                    mainHeading: ModalText.SongQuizMainHeading,
                    subtitle: BRANDED_COPY.songQuizModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 62.27,
                    },
                })
            })
        })

        describe("with experiment configuration", () => {
            it("should apply immediate upsell experiment config", () => {
                const experimentPayload = {
                    "immediate-upsell": {
                        mainHeading: "Experiment Header",
                        subtitle: "Experiment Subtitle",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc:
                        "/assets/videos/VOLLEY_HUB-UPSELL_MAIN_FINAL_1080p_compressed.mp4",
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: "Experiment Header",
                    subtitle: "Experiment Subtitle",
                    videoSegments: {
                        loopStart: 57.76,
                    },
                })
            })

            it("should apply game-specific experiment config", () => {
                const experimentPayload = {
                    [GameId.Jeopardy]: {
                        mainHeading: "Jeopardy Experiment Header",
                        subtitle: "Jeopardy Experiment Subtitle",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = {
                    type: "game-selection",
                    game: {
                        ...mockGame,
                        id: GameId.Jeopardy,
                        heroImageUrl: "/default-hero.avif",
                    },
                }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc:
                        "/assets/videos/VOLLEY_HUB_PAYWALL_JEOPARDY_FINAL_1080p_compressed.mp4",
                    posterSrc: "/assets/images/games/posters/jeopardy.webp",
                    mainHeading: "Jeopardy Experiment Header",
                    subtitle: "Jeopardy Experiment Subtitle",
                    videoSegments: {
                        loopStart: 67,
                    },
                })
            })

            it("should support partial configuration (only header override)", () => {
                const experimentPayload = {
                    "immediate-upsell": {
                        mainHeading: "Only Header Changed",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: ALL_GAMES_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: "Only Header Changed",
                    subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 57.76,
                    },
                })
            })

            it("should fall back to default when experiment config is not available for context", () => {
                const experimentPayload = {
                    [GameId.SongQuiz]: {
                        mainHeading: "Song Quiz Header",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: ALL_GAMES_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: BRANDED_COPY.defaultModalHeading.volley,
                    subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 57.76,
                    },
                })
            })

            it("should handle experiment manager errors gracefully", () => {
                mockExperimentManager.getVariant.mockImplementation(() => {
                    throw new Error("Experiment manager error")
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: ALL_GAMES_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: BRANDED_COPY.defaultModalHeading.volley,
                    subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 57.76,
                    },
                })
            })

            it("should call experiment manager with correct flag", () => {
                const context: UpsellContext = { type: "immediate" }
                getWebCheckoutModalContent(context)

                expect(mockExperimentManager.getVariant).toHaveBeenCalledWith(
                    ExperimentFlag.QrModalConfig
                )
            })

            it("should apply full video configuration with new fields", () => {
                const experimentPayload = {
                    "immediate-upsell": {
                        videoUrl: "/custom-video.mp4",
                        loopStart: 5.5,
                        loopEnd: 15.2,
                        mainHeading: "Custom Header",
                        subtitle: "Custom Subtitle",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: "/custom-video.mp4",
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: "Custom Header",
                    subtitle: "Custom Subtitle",
                    videoSegments: {
                        loopStart: 5.5,
                        loopEnd: 15.2,
                    },
                })
            })

            it("should support partial video segment configuration", () => {
                const experimentPayload = {
                    [GameId.Jeopardy]: {
                        loopStart: 4.0,
                        mainHeading: "Updated Jeopardy Header",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = {
                    type: "game-selection",
                    game: {
                        ...mockGame,
                        id: GameId.Jeopardy,
                    },
                }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: JEOPARDY_VIDEO_PATH,
                    posterSrc: "/assets/images/games/posters/jeopardy.webp",
                    mainHeading: "Updated Jeopardy Header",
                    subtitle: BRANDED_COPY.jeopardyModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 4.0,
                    },
                })
            })

            it("should apply video configuration with multiple fields", () => {
                const experimentPayload = {
                    "immediate-upsell": {
                        videoUrl: "/custom-video.mp4",
                        loopStart: 5.5,
                        mainHeading: "Mixed Config Header",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: "/custom-video.mp4",
                    posterSrc: "/assets/images/games/posters/generic.webp",
                    mainHeading: "Mixed Config Header",
                    subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 5.5,
                    },
                })
            })

            it("should support posterSrc override via experiment config", () => {
                const experimentPayload = {
                    "immediate-upsell": {
                        posterSrc: "/experiment-custom-poster.webp",
                        mainHeading: "Custom Poster Experiment",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                expect(result).toEqual({
                    videoSrc: ALL_GAMES_VIDEO_PATH,
                    posterSrc: "/experiment-custom-poster.webp",
                    mainHeading: "Custom Poster Experiment",
                    subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                    videoSegments: {
                        loopStart: 57.76,
                    },
                })
            })

            it("should provide experimental overrides for tracking text", () => {
                const experimentPayload = {
                    "immediate-upsell": {
                        mainHeading: "Experiment Heading",
                        subtitle: "Experiment Subtitle",
                    },
                }

                mockExperimentManager.getVariant.mockReturnValue({
                    value: "variant-a",
                    payload: experimentPayload,
                })

                const context: UpsellContext = { type: "immediate" }
                const result = getWebCheckoutModalContent(context)

                const trackingText = `${result.mainHeading} ${result.subtitle}`
                expect(trackingText).toBe(
                    "Experiment Heading Experiment Subtitle"
                )
            })
        })
    })

    describe("with SuppressImmediateUpsell treatment", () => {
        it("should return generic content for game-selection when immediate upsell is suppressed", () => {
            mockExperimentManager.getVariant.mockImplementation(
                (flag: ExperimentFlag) => {
                    if (flag === ExperimentFlag.SuppressImmediateUpsell) {
                        return { value: "on" }
                    }
                    return undefined
                }
            )

            const context: UpsellContext = {
                type: "game-selection",
                game: {
                    ...mockGame,
                    id: GameId.Jeopardy,
                },
            }
            const result = getWebCheckoutModalContent(context)

            expect(result).toEqual({
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: "/assets/images/games/posters/generic.webp",
                mainHeading: BRANDED_COPY.defaultModalHeading.volley,
                subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                videoSegments: { loopStart: 57.76 },
            })
        })

        it("should still return game-specific content when immediate upsell is not suppressed", () => {
            mockExperimentManager.getVariant.mockImplementation(
                (flag: ExperimentFlag) => {
                    if (flag === ExperimentFlag.SuppressImmediateUpsell) {
                        return { value: "off" }
                    }
                    return undefined
                }
            )

            const context: UpsellContext = {
                type: "game-selection",
                game: {
                    ...mockGame,
                    id: GameId.Jeopardy,
                },
            }
            const result = getWebCheckoutModalContent(context)

            expect(result).toEqual({
                videoSrc: JEOPARDY_VIDEO_PATH,
                posterSrc: "/assets/images/games/posters/jeopardy.webp",
                mainHeading: ModalText.JeopardyMainHeading,
                subtitle: BRANDED_COPY.jeopardyModalSubtitle.volley,
                videoSegments: { loopStart: 67 },
            })
        })

        it("should not affect immediate upsell content when suppressed", () => {
            mockExperimentManager.getVariant.mockImplementation(
                (flag: ExperimentFlag) => {
                    if (flag === ExperimentFlag.SuppressImmediateUpsell) {
                        return { value: "on" }
                    }
                    return undefined
                }
            )

            const context: UpsellContext = { type: "immediate" }
            const result = getWebCheckoutModalContent(context)

            expect(result).toEqual({
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: "/assets/images/games/posters/generic.webp",
                mainHeading: BRANDED_COPY.defaultModalHeading.volley,
                subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                videoSegments: { loopStart: 57.76 },
            })
        })

        it("should apply QrModalConfig text overrides but ignore videoUrl when suppressed", () => {
            mockExperimentManager.getVariant.mockImplementation(
                (flag: ExperimentFlag) => {
                    if (flag === ExperimentFlag.SuppressImmediateUpsell) {
                        return { value: "on" }
                    }
                    if (flag === ExperimentFlag.QrModalConfig) {
                        return {
                            value: "variant-a",
                            payload: {
                                [GameId.Jeopardy]: {
                                    videoUrl: "/should-be-ignored.mp4",
                                    loopStart: 99,
                                    mainHeading: "Experiment Jeopardy Header",
                                },
                            },
                        }
                    }
                    return undefined
                }
            )

            const context: UpsellContext = {
                type: "game-selection",
                game: {
                    ...mockGame,
                    id: GameId.Jeopardy,
                },
            }
            const result = getWebCheckoutModalContent(context)

            expect(result).toEqual({
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: "/assets/images/games/posters/generic.webp",
                mainHeading: "Experiment Jeopardy Header",
                subtitle: BRANDED_COPY.defaultModalSubtitle.volley,
                videoSegments: { loopStart: 57.76 },
            })
        })
    })

    describe("getGameSpecificContent", () => {
        it("should return Jeopardy-specific content", () => {
            const jeopardyGame = {
                ...mockGame,
                id: GameId.Jeopardy,
                title: "Jeopardy",
            }
            const context: UpsellContext = {
                type: "game-selection",
                game: jeopardyGame,
            }

            const result = getWebCheckoutModalContent(context)

            expect(result).toEqual({
                videoSrc: JEOPARDY_VIDEO_PATH,
                posterSrc: "/assets/images/games/posters/jeopardy.webp",
                mainHeading: ModalText.JeopardyMainHeading,
                subtitle: BRANDED_COPY.jeopardyModalSubtitle.volley,
                videoSegments: {
                    loopStart: 67,
                },
            })
        })

        it("should return Song Quiz-specific content", () => {
            const songQuizGame = {
                ...mockGame,
                id: GameId.SongQuiz,
                title: "Song Quiz",
                heroImageUrl: "/hero_song_quiz.avif",
            }
            const context: UpsellContext = {
                type: "game-selection",
                game: songQuizGame,
            }

            const result = getWebCheckoutModalContent(context)

            expect(result).toEqual({
                videoSrc: SONGQUIZ_VIDEO_PATH,
                posterSrc: "/assets/images/games/posters/song-quiz.webp",
                mainHeading: ModalText.SongQuizMainHeading,
                subtitle: BRANDED_COPY.songQuizModalSubtitle.volley,
                videoSegments: {
                    loopStart: 62.27,
                },
            })
        })

        it("should return Wit's End-specific content", () => {
            const witsEndGame = {
                ...mockGame,
                id: GameId.WitsEnd,
                title: "Wit's End",
                heroImageUrl: "/hero_wits_end.avif",
            }
            const context: UpsellContext = {
                type: "game-selection",
                game: witsEndGame,
            }

            const result = getWebCheckoutModalContent(context)

            expect(result.mainHeading).toBe(ModalText.WitsEndMainHeading)
            expect(result.subtitle).toBe(
                BRANDED_COPY.witsEndModalSubtitle.volley
            )
            expect(result.posterSrc).toBe(
                "/assets/images/games/posters/generic.webp"
            )
        })
    })

    describe("ExtendedSubscribeOptions", () => {
        it("should allow creating ExtendedSubscribeOptions with immediate context", () => {
            const options: ExtendedSubscribeOptions = {
                eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                upsellContext: { type: "immediate" },
            }

            expect(options.upsellContext.type).toBe("immediate")
        })

        it("should allow creating ExtendedSubscribeOptions with game-selection context", () => {
            const options: ExtendedSubscribeOptions = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game: mockGame,
                },
            }

            expect(options.upsellContext.type).toBe("game-selection")
            if (options.upsellContext.type === "game-selection") {
                expect(options.upsellContext.game).toBe(mockGame)
            } else {
                throw new Error("Game selection context is not valid")
            }
        })

        it("should include standard SubscribeOptions properties", () => {
            const options: ExtendedSubscribeOptions = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                overrideSku: "test-sku",
                upsellContext: { type: "immediate" },
            }

            expect(options.eventCategory).toBe(
                UpsellEventSubCategory.HUB_PRE_ROLL
            )
            expect(options.overrideSku).toBe("test-sku")
        })
    })

    describe("UpsellContext type safety", () => {
        it("should require game property for game-selection type", () => {
            const validContext: UpsellContext = {
                type: "game-selection",
                game: mockGame,
            }

            expect(validContext.type).toBe("game-selection")
            if (validContext.type === "game-selection") {
                expect(validContext.game).toBe(mockGame)
            }
        })

        it("should not require game property for immediate type", () => {
            const validContext: UpsellContext = {
                type: "immediate",
            }

            expect(validContext.type).toBe("immediate")
        })
    })
})
