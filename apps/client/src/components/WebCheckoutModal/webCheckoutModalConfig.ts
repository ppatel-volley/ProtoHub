import type { SubscribeOptions } from "@volley/platform-sdk/lib"

import { getCopy } from "../../config/branding"
import { BASE_URL } from "../../config/envconfig"
import { getExperimentManager } from "../../experiments/ExperimentManager"
import { ExperimentFlag } from "../../experiments/experimentSchemata"
import type { Game } from "../../hooks/useGames"
import { GameId } from "../../hooks/useGames"
import { logger } from "../../utils/logger"

export const ModalText = {
    DefaultMainHeading: (): string => getCopy("defaultModalHeading"),
    DefaultSubtitle: (): string => getCopy("defaultModalSubtitle"),

    JeopardyMainHeading: "Play Jeopardy!\nGet started on your phone",
    SongQuizMainHeading: "Play Song Quiz!\nGet started on your phone",
    CoComelonMainHeading:
        "Play CoComelon:\nSing and Play with JJ!\nGet started on your phone",
    WheelOfFortuneMainHeading:
        "Play Wheel of Fortune!\nGet started on your phone",
    WitsEndMainHeading: "Play Wit's End!\nGet started on your phone",

    JeopardySubtitle: (): string => getCopy("jeopardyModalSubtitle"),
    SongQuizSubtitle: (): string => getCopy("songQuizModalSubtitle"),
    CoComelonSubtitle: (): string => getCopy("cocomelonModalSubtitle"),
    WheelOfFortuneSubtitle: (): string =>
        getCopy("wheelOfFortuneModalSubtitle"),
    WitsEndSubtitle: (): string => getCopy("witsEndModalSubtitle"),
} as const

export type UpsellContext =
    | {
          type: "immediate"
      }
    | {
          type: "game-selection"
          game: Game
      }

export interface ExtendedSubscribeOptions extends SubscribeOptions {
    upsellContext: UpsellContext
}

export interface WebCheckoutModalContent {
    videoSrc: string
    posterSrc: string
    mainHeading: string
    subtitle: string
    videoSegments: VideoSegmentRanges
}

export interface VideoSegmentRanges {
    loopStart?: number
    loopEnd?: number
}

export const ALL_GAMES_VIDEO_PATH = `${BASE_URL}assets/videos/VOLLEY_HUB-UPSELL_MAIN_FINAL_1080p_compressed.mp4`
export const JEOPARDY_VIDEO_PATH = `${BASE_URL}assets/videos/VOLLEY_HUB_PAYWALL_JEOPARDY_FINAL_1080p_compressed.mp4`
export const SONGQUIZ_VIDEO_PATH = `${BASE_URL}assets/videos/VOLLEY_HUB_PAYWALL_SONGQUIZ_FINAL_1080p_compressed.mp4`

function getGameContent(
    gameId: GameId | "immediate-upsell"
): WebCheckoutModalContent {
    switch (gameId) {
        case "immediate-upsell":
            return {
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: `${BASE_URL}assets/images/games/posters/generic.webp`,
                mainHeading: ModalText.DefaultMainHeading(),
                subtitle: ModalText.DefaultSubtitle(),
                videoSegments: { loopStart: 57.76 },
            }
        case GameId.Jeopardy:
            return {
                videoSrc: JEOPARDY_VIDEO_PATH,
                posterSrc: `${BASE_URL}assets/images/games/posters/jeopardy.webp`,
                mainHeading: ModalText.JeopardyMainHeading,
                subtitle: ModalText.JeopardySubtitle(),
                videoSegments: { loopStart: 67 },
            }
        case GameId.SongQuiz:
            return {
                videoSrc: SONGQUIZ_VIDEO_PATH,
                posterSrc: `${BASE_URL}assets/images/games/posters/song-quiz.webp`,
                mainHeading: ModalText.SongQuizMainHeading,
                subtitle: ModalText.SongQuizSubtitle(),
                videoSegments: { loopStart: 62.27 },
            }
        case GameId.CoComelon:
            return {
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: `${BASE_URL}assets/images/games/posters/generic.webp`,
                mainHeading: ModalText.CoComelonMainHeading,
                subtitle: ModalText.CoComelonSubtitle(),
                videoSegments: { loopStart: 57.76 },
            }
        case GameId.WheelOfFortune:
            return {
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: `${BASE_URL}assets/images/games/posters/generic.webp`,
                mainHeading: ModalText.WheelOfFortuneMainHeading,
                subtitle: ModalText.WheelOfFortuneSubtitle(),
                videoSegments: { loopStart: 57.76 },
            }
        case GameId.WitsEnd:
            return {
                videoSrc: ALL_GAMES_VIDEO_PATH,
                posterSrc: `${BASE_URL}assets/images/games/posters/generic.webp`,
                mainHeading: ModalText.WitsEndMainHeading,
                subtitle: ModalText.WitsEndSubtitle(),
                videoSegments: { loopStart: 57.76 },
            }
    }
}

export const getWebCheckoutModalContent = (
    context: UpsellContext
): WebCheckoutModalContent => {
    const { type } = context

    const getGameId = function (): GameId | "immediate-upsell" {
        if (type === "game-selection" && context.game) {
            return context.game.id
        } else {
            return "immediate-upsell"
        }
    }

    const shouldUseGenericVideo = (): boolean => {
        if (type !== "game-selection") return false
        try {
            const experimentManager = getExperimentManager()
            const suppressVariant = experimentManager.getVariant(
                ExperimentFlag.SuppressImmediateUpsell
            )
            return suppressVariant?.value === "on"
        } catch {
            return false
        }
    }

    const useGenericVideo = shouldUseGenericVideo()
    const defaultContent = useGenericVideo
        ? getGameContent("immediate-upsell")
        : getGameContent(getGameId())
    try {
        const experimentManager = getExperimentManager()
        const qrModalConfigVariant = experimentManager.getVariant(
            ExperimentFlag.QrModalConfig
        )

        if (qrModalConfigVariant?.payload) {
            const { payload } = qrModalConfigVariant

            let experimentConfig
            if (type === "immediate") {
                experimentConfig = payload["immediate-upsell"]
            } else if (type === "game-selection" && context.game) {
                experimentConfig = payload[context.game.id]
            }

            if (experimentConfig) {
                const mergedContent = {
                    ...defaultContent,
                    mainHeading:
                        experimentConfig.mainHeading ??
                        defaultContent.mainHeading,
                    subtitle:
                        experimentConfig.subtitle ?? defaultContent.subtitle,
                    posterSrc:
                        experimentConfig.posterSrc ?? defaultContent.posterSrc,
                }

                if (!useGenericVideo) {
                    if (experimentConfig.videoUrl) {
                        mergedContent.videoSrc = experimentConfig.videoUrl
                    }

                    if (experimentConfig.loopStart !== undefined) {
                        mergedContent.videoSegments = {
                            ...mergedContent.videoSegments,
                            loopStart: experimentConfig.loopStart,
                        }
                    }

                    if (experimentConfig.loopEnd !== undefined) {
                        mergedContent.videoSegments = {
                            ...mergedContent.videoSegments,
                            loopEnd: experimentConfig.loopEnd,
                        }
                    }
                }

                return mergedContent
            }
        }
    } catch (error) {
        logger.warn(
            `Error applying web checkout modal overrides: ${(error as Error).message}`
        )
    }

    return defaultContent
}
