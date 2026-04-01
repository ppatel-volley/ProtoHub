enum GameId {
    Jeopardy = "jeopardy",
    SongQuiz = "song-quiz",
    CoComelon = "cocomelon",
    WheelOfFortune = "wheel-of-fortune",
    WitsEnd = "wits-end",
}

jest.mock("../hooks/useGames", () => ({
    GameId: {
        Jeopardy: "jeopardy",
        SongQuiz: "song-quiz",
        CoComelon: "cocomelon",
        WheelOfFortune: "wheel-of-fortune",
        WitsEnd: "wits-end",
    },
}))

import {
    BooleanVariantSchema,
    ExperimentFlag,
    GameOrderSchema,
    GamePayloadSchema,
    HubModalDisplaySchema,
    JeopardyReloadThresholdSchema,
    PAYLOAD_NONE_VALUE,
    QrModalConfigContentSchema,
    QrModalConfigSchema,
    WeekendRebrandPayloadSchema,
} from "./experimentSchemata"

describe("experimentSchemata", () => {
    describe("BooleanVariantSchema", () => {
        it("should accept valid boolean string values", () => {
            expect(BooleanVariantSchema.parse("true")).toBe("true")
            expect(BooleanVariantSchema.parse("false")).toBe("false")
            expect(BooleanVariantSchema.parse("on")).toBe("on")
            expect(BooleanVariantSchema.parse("off")).toBe("off")
            expect(BooleanVariantSchema.parse("")).toBe("")
            expect(BooleanVariantSchema.parse(undefined)).toBe(undefined)
        })

        it("should reject invalid values", () => {
            expect(() => BooleanVariantSchema.parse("invalid")).toThrow()
            expect(() => BooleanVariantSchema.parse("yes")).toThrow()
            expect(() => BooleanVariantSchema.parse("no")).toThrow()
            expect(() => BooleanVariantSchema.parse(123)).toThrow()
        })
    })

    describe("GameOrderSchema", () => {
        it("should accept valid game ID arrays", () => {
            const validOrder = [GameId.Jeopardy, GameId.SongQuiz]
            expect(GameOrderSchema.parse(validOrder)).toEqual(validOrder)
        })

        it("should accept empty arrays", () => {
            expect(GameOrderSchema.parse([])).toEqual([])
        })

        it("should reject arrays with invalid game IDs", () => {
            expect(() => GameOrderSchema.parse(["invalid-game"])).toThrow()
            expect(() =>
                GameOrderSchema.parse([GameId.Jeopardy, "invalid"])
            ).toThrow()
        })

        it("should reject non-array values", () => {
            expect(() => GameOrderSchema.parse("not-array")).toThrow()
            expect(() => GameOrderSchema.parse({})).toThrow()
        })
    })

    describe("GamePayloadSchema", () => {
        it("should accept valid game payload with all properties", () => {
            const payload = {
                id: GameId.Jeopardy,
                title: "Test Game",
                tileImageUrl: "/tile.avif",
                heroImageUrl: "/hero.avif",
                videoUrl: "/video.mp4",
                animationUri: "/animation.riv",
                status: "new" as const,
                paywallType: "soft" as const,
            }

            expect(GamePayloadSchema.parse(payload)).toEqual(payload)
        })

        it("should accept partial game payload", () => {
            const payload = {
                title: "Test Game",
                heroImageUrl: "/hero.avif",
            }

            expect(GamePayloadSchema.parse(payload)).toEqual(payload)
        })

        it("should accept empty object", () => {
            expect(GamePayloadSchema.parse({})).toEqual({})
        })

        it("should reject invalid enum values", () => {
            expect(() =>
                GamePayloadSchema.parse({
                    status: "invalid-status",
                })
            ).toThrow()

            expect(() =>
                GamePayloadSchema.parse({
                    paywallType: "invalid-paywall",
                })
            ).toThrow()
        })

        describe("PAYLOAD_NONE_VALUE support", () => {
            it("should accept 'none' for status to explicitly remove status badge", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    status: PAYLOAD_NONE_VALUE,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })

            it("should accept 'none' for videoUrl to explicitly disable video", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    videoUrl: PAYLOAD_NONE_VALUE,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })

            it("should accept 'none' for animationUri to explicitly disable animation", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    animationUri: PAYLOAD_NONE_VALUE,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })

            it("should accept multiple none fields", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    status: PAYLOAD_NONE_VALUE,
                    videoUrl: PAYLOAD_NONE_VALUE,
                    animationUri: PAYLOAD_NONE_VALUE,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })
        })

        describe("backwards compatibility with false", () => {
            it("should still accept false for status (deprecated)", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    status: false as const,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })

            it("should still accept false for videoUrl (deprecated)", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    videoUrl: false as const,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })

            it("should still accept false for animationUri (deprecated)", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    animationUri: false as const,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })

            it("should accept 'none' for paywallType to disable paywall", () => {
                const payload = {
                    id: GameId.Jeopardy,
                    paywallType: "none" as const,
                }
                expect(GamePayloadSchema.parse(payload)).toEqual(payload)
            })
        })
    })

    describe("JeopardyReloadThresholdSchema", () => {
        it("should accept valid threshold configuration", () => {
            const config = { launchesBeforeReload: 5 }
            expect(JeopardyReloadThresholdSchema.parse(config)).toEqual(config)
        })

        it("should reject negative numbers", () => {
            expect(() =>
                JeopardyReloadThresholdSchema.parse({
                    launchesBeforeReload: -1,
                })
            ).toThrow()
        })

        it("should reject zero", () => {
            expect(() =>
                JeopardyReloadThresholdSchema.parse({
                    launchesBeforeReload: 0,
                })
            ).toThrow()
        })

        it("should reject non-numeric values", () => {
            expect(() =>
                JeopardyReloadThresholdSchema.parse({
                    launchesBeforeReload: "5",
                })
            ).toThrow()
        })

        it("should require launchesBeforeReload property", () => {
            expect(() => JeopardyReloadThresholdSchema.parse({})).toThrow()
        })
    })

    describe("QrModalConfigContentSchema", () => {
        it("should accept valid content with all properties", () => {
            const content = {
                videoIntro: "/intro.mp4",
                videoLooping: "/looping.mp4",
                videoUrl: "/main-video.mp4",
                loopStart: 5.5,
                loopEnd: 15.2,
                mainHeading: "Test Header",
                subtitle: "Test Subtitle",
                backgroundImage: "/background.jpg",
            }

            expect(QrModalConfigContentSchema.parse(content)).toEqual(content)
        })

        it("should accept partial content", () => {
            const content = { mainHeading: "Only Header" }
            expect(QrModalConfigContentSchema.parse(content)).toEqual(content)
        })

        it("should accept empty object", () => {
            expect(QrModalConfigContentSchema.parse({})).toEqual({})
        })

        it("should reject non-string values for string fields", () => {
            expect(() =>
                QrModalConfigContentSchema.parse({
                    videoIntro: 123,
                })
            ).toThrow()

            expect(() =>
                QrModalConfigContentSchema.parse({
                    videoLooping: true,
                })
            ).toThrow()

            expect(() =>
                QrModalConfigContentSchema.parse({
                    mainHeading: null,
                })
            ).toThrow()
        })

        it("should reject non-numeric values for numeric fields", () => {
            expect(() =>
                QrModalConfigContentSchema.parse({
                    loopStart: "5.5",
                })
            ).toThrow()

            expect(() =>
                QrModalConfigContentSchema.parse({
                    loopEnd: true,
                })
            ).toThrow()
        })

        it("should accept numeric values for video timing fields", () => {
            const content = {
                loopStart: 0,
                loopEnd: 10.5,
            }

            expect(QrModalConfigContentSchema.parse(content)).toEqual(content)
        })

        it("should accept all video configuration combinations", () => {
            const videoUrlOnly = { videoUrl: "/video.mp4" }
            expect(QrModalConfigContentSchema.parse(videoUrlOnly)).toEqual(
                videoUrlOnly
            )

            const timingOnly = { loopStart: 2.5, loopEnd: 8.0 }
            expect(QrModalConfigContentSchema.parse(timingOnly)).toEqual(
                timingOnly
            )

            const backgroundOnly = { backgroundImage: "/bg.jpg" }
            expect(QrModalConfigContentSchema.parse(backgroundOnly)).toEqual(
                backgroundOnly
            )
        })
    })

    describe("QrModalConfigSchema", () => {
        it("should accept immediate-upsell configuration", () => {
            const config = {
                "immediate-upsell": {
                    videoIntro: "/intro.mp4",
                    videoLooping: "/looping.mp4",
                    mainHeading: "Header",
                    subtitle: "Subtitle",
                },
            }

            expect(QrModalConfigSchema.parse(config)).toEqual(config)
        })

        it("should accept game-specific configurations", () => {
            const config = {
                [GameId.Jeopardy]: {
                    mainHeading: "Jeopardy Header",
                },
                [GameId.SongQuiz]: {
                    videoIntro: "/songquiz-intro.mp4",
                    videoLooping: "/songquiz-looping.mp4",
                },
            }

            expect(QrModalConfigSchema.parse(config)).toEqual(config)
        })

        it("should accept mixed immediate and game configurations", () => {
            const config = {
                "immediate-upsell": {
                    mainHeading: "Immediate Header",
                },
                [GameId.Jeopardy]: {
                    videoIntro: "/jeopardy-intro.mp4",
                    videoLooping: "/jeopardy-looping.mp4",
                    mainHeading: "Jeopardy Header",
                },
                [GameId.CoComelon]: {
                    subtitle: "CoComelon Subtitle",
                },
            }

            expect(QrModalConfigSchema.parse(config)).toEqual(config)
        })

        it("should accept empty configuration", () => {
            expect(QrModalConfigSchema.parse({})).toEqual({})
        })

        it("should reject invalid game ID keys", () => {
            const config = {
                "immediate-upsell": { mainHeading: "Valid" },
                "invalid-game-id": { mainHeading: "Invalid" },
            }

            expect(() => QrModalConfigSchema.parse(config)).toThrow()
        })

        it("should reject invalid content structure", () => {
            const config = {
                "immediate-upsell": "invalid-content",
            }

            expect(() => QrModalConfigSchema.parse(config)).toThrow()
        })

        it("should handle all available game IDs", () => {
            const config = {
                "immediate-upsell": { mainHeading: "Immediate" },
                [GameId.Jeopardy]: { mainHeading: "Jeopardy" },
                [GameId.SongQuiz]: { mainHeading: "Song Quiz" },
                [GameId.CoComelon]: { mainHeading: "CoComelon" },
                [GameId.WheelOfFortune]: { mainHeading: "Wheel of Fortune" },
                [GameId.WitsEnd]: { mainHeading: "Wits End" },
            }

            expect(QrModalConfigSchema.parse(config)).toEqual(config)
        })

        it("should validate nested content schemas", () => {
            const config = {
                [GameId.Jeopardy]: {
                    videoIntro: 123,
                    mainHeading: "Valid Header",
                },
            }

            expect(() => QrModalConfigSchema.parse(config)).toThrow()
        })
    })

    describe("HubModalDisplaySchema", () => {
        it("should accept valid complete configuration", () => {
            const config = {
                startEpochMs: 1700000000000,
                endEpochMs: 1700100000000,
                showAgain: true,
            }
            expect(HubModalDisplaySchema.parse(config)).toEqual(config)
        })

        it("should accept partial configuration", () => {
            expect(
                HubModalDisplaySchema.parse({ startEpochMs: 1700000000000 })
            ).toEqual({ startEpochMs: 1700000000000 })
            expect(HubModalDisplaySchema.parse({ showAgain: false })).toEqual({
                showAgain: false,
            })
        })

        it("should accept empty object", () => {
            expect(HubModalDisplaySchema.parse({})).toEqual({})
        })

        it("should reject non-numeric epoch values", () => {
            expect(() =>
                HubModalDisplaySchema.parse({ startEpochMs: "not-a-number" })
            ).toThrow()
        })

        it("should reject non-boolean showAgain", () => {
            expect(() =>
                HubModalDisplaySchema.parse({ showAgain: "yes" })
            ).toThrow()
        })
    })

    describe("WeekendRebrandPayloadSchema", () => {
        it("should accept valid payload with hub-modal-display", () => {
            const payload = {
                "hub-modal-display": {
                    startEpochMs: 1700000000000,
                    endEpochMs: 1700100000000,
                    showAgain: true,
                },
            }
            expect(WeekendRebrandPayloadSchema.parse(payload)).toEqual(payload)
        })

        it("should accept payload with empty hub-modal-display", () => {
            const payload = { "hub-modal-display": {} }
            expect(WeekendRebrandPayloadSchema.parse(payload)).toEqual(payload)
        })

        it("should accept empty payload", () => {
            expect(WeekendRebrandPayloadSchema.parse({})).toEqual({})
        })

        it("should reject invalid hub-modal-display values", () => {
            expect(() =>
                WeekendRebrandPayloadSchema.parse({
                    "hub-modal-display": "invalid",
                })
            ).toThrow()
        })
    })

    describe("ExperimentFlag", () => {
        it("should contain all expected flag values", () => {
            expect(ExperimentFlag.ReorderMpTiles).toBe("reorder-mp-tiles")
            expect(ExperimentFlag.SuppressImmediateUpsell).toBe(
                "suppress-immediate-upsell"
            )
            expect(ExperimentFlag.JeopardyPayloadSwap).toBe(
                "jeopardy-payload-swap"
            )
            expect(ExperimentFlag.SongQuizPayloadSwap).toBe(
                "song-quiz-payload-swap"
            )
            expect(ExperimentFlag.CoComelonPayloadSwap).toBe(
                "cocomelon-payload-swap"
            )
            expect(ExperimentFlag.WheelOfFortunePayloadSwap).toBe(
                "wheel-of-fortune-payload-swap"
            )
            expect(ExperimentFlag.WitsEndPayloadSwap).toBe(
                "wits-end-payload-swap"
            )
            expect(ExperimentFlag.JeopardyReloadThreshold).toBe(
                "jeopardy-reload-threshold"
            )
            expect(ExperimentFlag.QrModalConfig).toBe("qr-modal-config")
            expect(ExperimentFlag.WeekendRebrand).toBe("weekend-rebrand")
            expect(ExperimentFlag.WeekendRebrandInformationalModal).toBe(
                "weekend-rebrand-informational-modal"
            )
        })
    })

    describe("QrModalConfigContentSchema with posterSrc", () => {
        it("should accept posterSrc", () => {
            const content = { posterSrc: "/poster.avif" }
            expect(QrModalConfigContentSchema.parse(content)).toEqual(content)
        })

        it("should accept all properties including posterSrc", () => {
            const content = {
                videoIntro: "/intro.mp4",
                videoLooping: "/looping.mp4",
                videoUrl: "/main-video.mp4",
                loopStart: 5.5,
                loopEnd: 15.2,
                mainHeading: "Test Header",
                subtitle: "Test Subtitle",
                posterSrc: "/poster.avif",
                backgroundImage: "/background.jpg",
            }

            expect(QrModalConfigContentSchema.parse(content)).toEqual(content)
        })
    })
})
