import { act, renderHook } from "@testing-library/react"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import { useAccount } from "@volley/platform-sdk/react"

import { SKU_OVERRIDE } from "../config/consts"
import { PaywallType } from "../constants/game"
import { UpsellEventSubCategory } from "../constants/tracking"
import type { Game } from "./useGames"
import { useGameSelectionUpsell } from "./useGameSelectionUpsell"
import { useUpsell } from "./useUpsell"

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: jest.fn(),
}))

jest.mock("./useUpsell", () => ({
    useUpsell: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    SubscriptionFlowResult: {
        Successful: "Successful",
        Failed: "Failed",
        AlreadyPurchased: "AlreadyPurchased",
        Cancelled: "Cancelled",
    },
}))

jest.mock("../config/envconfig", () => ({
    getWindowVar: jest.fn((key: string, defaultValue: string) => defaultValue),
}))

describe("useGameSelectionUpsell", () => {
    const mockSubscribe = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useUpsell as jest.Mock).mockReturnValue({
            subscribe: mockSubscribe,
        })
        ;(useAccount as jest.Mock).mockReturnValue({
            account: { isSubscribed: false },
        })
    })

    const createMockGame = (paywallType: PaywallType): Game => ({
        id: "jeopardy" as any,
        trackingId: "jeopardy",
        title: "Test Game",
        paywallType,
        tileImageUrl: "",
        heroImageUrl: "",
    })

    describe("handleGamePaywall", () => {
        it("should return true for games with no paywall", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.None)

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).not.toHaveBeenCalled()
        })

        it("should return true when user has subscription access", async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: true },
            })
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Hard)

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).not.toHaveBeenCalled()
        })

        it("should return true for soft paywall games when subscription succeeds", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Soft)
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Successful,
            })

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })

        it("should return true for soft paywall games even when subscription fails", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Soft)
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Failed,
            })

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })

        it("should return true for soft paywall games even when subscription throws error", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Soft)
            mockSubscribe.mockRejectedValue(new Error("Network error"))

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })

        it("should return true for hard paywall games when subscription succeeds", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Hard)
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Successful,
            })

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })

        it("should return false for hard paywall games when subscription fails", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Hard)
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Failed,
            })

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(false)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })

        it("should return false for hard paywall games when subscription throws error", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Hard)
            mockSubscribe.mockRejectedValue(new Error("Payment error"))

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(false)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })

        it("should handle non-Error exceptions", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Hard)
            mockSubscribe.mockRejectedValue("String error")

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(false)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })
    })

    describe("state management", () => {
        it("should initialize with isInGameSelectionUpsell as false", () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )

            expect(result.current.isInGameSelectionUpsell).toBe(false)
        })

        it("should set isInGameSelectionUpsell to true during upsell flow", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Soft)

            let resolveSubscription: (value: any) => void
            const subscriptionPromise = new Promise((resolve) => {
                resolveSubscription = resolve
            })
            mockSubscribe.mockReturnValue(subscriptionPromise)

            act(() => {
                void result.current.handleGamePaywall(game)
            })

            expect(result.current.isInGameSelectionUpsell).toBe(true)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })

            await act(async () => {
                resolveSubscription({
                    status: SubscriptionFlowResult.Successful,
                })
                await subscriptionPromise
            })

            expect(result.current.isInGameSelectionUpsell).toBe(false)
        })

        it("should reset isInGameSelectionUpsell to false even if subscription fails", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const game = createMockGame(PaywallType.Hard)
            mockSubscribe.mockRejectedValue(new Error("Failure"))

            await act(async () => {
                await result.current.handleGamePaywall(game)
            })

            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })
    })

    describe("deeplink bypass", () => {
        it("should bypass upsell for initial deeplink launch", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell({
                    gameId: "jeopardy" as any,
                    campaignId: "test",
                })
            )
            const game = createMockGame(PaywallType.Hard)

            const canLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(canLaunch).toBe(true)
            expect(result.current.isInGameSelectionUpsell).toBe(false)
            expect(mockSubscribe).not.toHaveBeenCalled()
        })

        it("should show upsell for subsequent launches after deeplink", async () => {
            ;(useAccount as jest.Mock).mockReturnValue({
                account: { isSubscribed: false },
            })
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Successful,
            })

            const { result } = renderHook(() =>
                useGameSelectionUpsell({
                    gameId: "jeopardy" as any,
                    campaignId: "test",
                })
            )
            const game = createMockGame(PaywallType.Hard)

            const firstLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(firstLaunch).toBe(true)
            expect(mockSubscribe).not.toHaveBeenCalled()

            const secondLaunch = await act(async () => {
                return result.current.handleGamePaywall(game)
            })

            expect(secondLaunch).toBe(true)
            expect(mockSubscribe).toHaveBeenCalledTimes(1)
            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game,
                },
            })
        })
    })

    describe("UpsellContext behavior", () => {
        it("should pass correct upsellContext for different games", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const jeopardyGame = {
                ...createMockGame(PaywallType.Soft),
                id: "jeopardy" as any,
                title: "Jeopardy",
            }
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Successful,
            })

            await act(async () => {
                await result.current.handleGamePaywall(jeopardyGame)
            })

            expect(mockSubscribe).toHaveBeenCalledWith({
                overrideSku: SKU_OVERRIDE,
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: {
                    type: "game-selection",
                    game: jeopardyGame,
                },
            })
        })

        it("should include full game object in upsellContext", async () => {
            const { result } = renderHook(() =>
                useGameSelectionUpsell(undefined)
            )
            const gameWithAllProperties = {
                ...createMockGame(PaywallType.Hard),
                id: "song-quiz" as any,
                title: "Song Quiz",
                heroImageUrl: "/hero_song_quiz.avif",
            }
            mockSubscribe.mockResolvedValue({
                status: SubscriptionFlowResult.Successful,
            })

            await act(async () => {
                await result.current.handleGamePaywall(gameWithAllProperties)
            })

            const call = mockSubscribe.mock.calls[0][0]
            expect(call.upsellContext.game).toEqual(gameWithAllProperties)
            expect(call.upsellContext.type).toBe("game-selection")
        })
    })
})
