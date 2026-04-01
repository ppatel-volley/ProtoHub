import { act, renderHook } from "@testing-library/react"

import { getExperimentManager } from "../experiments/ExperimentManager"
import { GameId, useGames } from "./useGames"
jest.mock("../experiments/ExperimentManager")
jest.mock("../config/envconfig", () => ({
    BASE_URL: "https://assets.volley.tv/",
    ENVIRONMENT: "production",
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

    beforeEach(() => {
        jest.clearAllMocks()
        ;(getExperimentManager as jest.Mock).mockReturnValue(
            mockExperimentManager
        )
        global.fetch = jest.fn().mockResolvedValue({ ok: true })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe("game status behavior", () => {
        it("should show coming-soon status for WOF in production environment", async () => {
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
                (game) => game.id === GameId.Jeopardy
            )
            const songQuiz = result.current.find(
                (game) => game.id === GameId.SongQuiz
            )
            const cocomelon = result.current.find(
                (game) => game.id === GameId.CoComelon
            )
            const wheelOfFortune = result.current.find(
                (game) => game.id === GameId.WheelOfFortune
            )

            expect(jeopardy?.status).toBeUndefined()
            expect(songQuiz?.status).toBeUndefined()
            expect(cocomelon?.status).toBeUndefined()
            expect(wheelOfFortune?.status).toBe("coming-soon")
        })
    })
})
