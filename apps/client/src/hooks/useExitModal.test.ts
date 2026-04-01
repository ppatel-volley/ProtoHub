import { act, renderHook } from "@testing-library/react"

import { useExitModal } from "./useExitModal"
import type { GameLauncher } from "./useGameLauncher"

const mockExitApp = jest.fn()
jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycle: (): { exitApp: jest.Mock } => ({
        exitApp: mockExitApp,
    }),
}))

const mockTrack = jest.fn()
jest.mock("./useHubTracking", () => ({
    useHubTracking: (): { track: jest.Mock } => ({
        track: mockTrack,
    }),
}))

jest.mock("./useExitModalTracking", () => ({
    useExitModalTracking: (): { screenDisplayedId: string | null } => ({
        screenDisplayedId: "exit-screen-id",
    }),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

describe("useExitModal", () => {
    const mockGameLauncher = {
        isGameLaunching: false,
        launchGame: jest.fn(),
    } as unknown as GameLauncher

    const defaultProps = {
        isInitialized: true,
        activeGame: null,
        gameLauncher: mockGameLauncher,
        isInUpsell: false,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(mockGameLauncher as { isGameLaunching: boolean }).isGameLaunching =
            false
    })

    it("should not show exit modal initially", () => {
        const { result } = renderHook(() => useExitModal(defaultProps))

        expect(result.current.showExitModal).toBe(false)
    })

    it("should open exit modal when openExitModal is called", () => {
        const { result } = renderHook(() => useExitModal(defaultProps))

        act(() => {
            result.current.openExitModal()
        })

        expect(result.current.showExitModal).toBe(true)
        expect(mockTrack).toHaveBeenCalledWith("Command Requested", {
            choiceValue: "back",
            eventCategory: "menu",
            eventSubCategory: "game selection",
        })
    })

    it("should not open exit modal when not initialized", () => {
        const { result } = renderHook(() =>
            useExitModal({ ...defaultProps, isInitialized: false })
        )

        act(() => {
            result.current.openExitModal()
        })

        expect(result.current.showExitModal).toBe(false)
    })

    it("should not open exit modal when in upsell", () => {
        const { result } = renderHook(() =>
            useExitModal({ ...defaultProps, isInUpsell: true })
        )

        act(() => {
            result.current.openExitModal()
        })

        expect(result.current.showExitModal).toBe(false)
    })

    it("should not open exit modal when game is launching", () => {
        ;(mockGameLauncher as { isGameLaunching: boolean }).isGameLaunching =
            true

        const { result } = renderHook(() => useExitModal(defaultProps))

        act(() => {
            result.current.openExitModal()
        })

        expect(result.current.showExitModal).toBe(false)
    })

    it("should close exit modal on cancel", () => {
        const { result } = renderHook(() => useExitModal(defaultProps))

        act(() => {
            result.current.openExitModal()
        })
        expect(result.current.showExitModal).toBe(true)

        act(() => {
            result.current.handleCancelExit()
        })

        expect(result.current.showExitModal).toBe(false)
        expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
            eventCategory: "menu",
            eventSubCategory: "exit modal selection",
            screenDisplayedId: "exit-screen-id",
            displayChoices: ["yes", "no"],
            choiceValue: "no",
            text: "",
        })
    })

    it("should exit app on confirm", () => {
        const { result } = renderHook(() => useExitModal(defaultProps))

        act(() => {
            result.current.openExitModal()
        })

        act(() => {
            result.current.handleConfirmExit()
        })

        expect(result.current.showExitModal).toBe(false)
        expect(mockExitApp).toHaveBeenCalled()
        expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
            eventCategory: "menu",
            eventSubCategory: "exit modal selection",
            screenDisplayedId: "exit-screen-id",
            displayChoices: ["yes", "no"],
            choiceValue: "yes",
            text: "",
        })
    })

    it("should close exit modal on back button", () => {
        const { result } = renderHook(() => useExitModal(defaultProps))

        act(() => {
            result.current.openExitModal()
        })
        expect(result.current.showExitModal).toBe(true)

        act(() => {
            result.current.handleBackButtonInExitModal()
        })

        expect(result.current.showExitModal).toBe(false)
    })

    it("should provide a ref that tracks showExitModal state", () => {
        const { result } = renderHook(() => useExitModal(defaultProps))

        expect(result.current.showExitModalRef.current).toBe(false)

        act(() => {
            result.current.openExitModal()
        })

        expect(result.current.showExitModalRef.current).toBe(true)
    })
})
