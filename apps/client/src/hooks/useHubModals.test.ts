import { act, renderHook } from "@testing-library/react"

import type { GameLauncher } from "./useGameLauncher"
import { useHubModals } from "./useHubModals"

const mockOpenExitModal = jest.fn()
const mockHandleConfirmExit = jest.fn()
const mockHandleCancelExit = jest.fn()
const mockHandleBackButtonInExitModal = jest.fn()
let mockShowExitModal = false
const mockShowExitModalRef = { current: false }

jest.mock("./useExitModal", () => ({
    useExitModal: (): {
        showExitModal: boolean
        showExitModalRef: React.RefObject<boolean>
        openExitModal: jest.Mock
        handleConfirmExit: jest.Mock
        handleCancelExit: jest.Mock
        handleBackButtonInExitModal: jest.Mock
    } => ({
        showExitModal: mockShowExitModal,
        showExitModalRef: mockShowExitModalRef,
        openExitModal: mockOpenExitModal,
        handleConfirmExit: mockHandleConfirmExit,
        handleCancelExit: mockHandleCancelExit,
        handleBackButtonInExitModal: mockHandleBackButtonInExitModal,
    }),
}))

const mockHandleAcknowledge = jest.fn()
const mockHandleBackButtonInWeekendRebrandModal = jest.fn()
let mockShowWeekendRebrandModal = false
const mockShowWeekendRebrandModalRef = { current: false }

jest.mock("./useWeekendRebrandModal", () => ({
    useWeekendRebrandModal: (): {
        showWeekendRebrandModal: boolean
        showWeekendRebrandModalRef: React.RefObject<boolean>
        handleAcknowledge: jest.Mock
        handleBackButtonInWeekendRebrandModal: jest.Mock
    } => ({
        showWeekendRebrandModal: mockShowWeekendRebrandModal,
        showWeekendRebrandModalRef: mockShowWeekendRebrandModalRef,
        handleAcknowledge: mockHandleAcknowledge,
        handleBackButtonInWeekendRebrandModal:
            mockHandleBackButtonInWeekendRebrandModal,
    }),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

describe("useHubModals", () => {
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
        mockShowExitModal = false
        mockShowExitModalRef.current = false
        mockShowWeekendRebrandModal = false
        mockShowWeekendRebrandModalRef.current = false
    })

    it("should return modal states from sub-hooks", () => {
        const { result } = renderHook(() => useHubModals(defaultProps))

        expect(result.current.showExitModal).toBe(false)
        expect(result.current.showWeekendRebrandModal).toBe(false)
    })

    it("should call openExitModal when back button pressed and no modals open", () => {
        const { result } = renderHook(() => useHubModals(defaultProps))

        act(() => {
            result.current.handleBackButton()
        })

        expect(mockOpenExitModal).toHaveBeenCalled()
    })

    it("should dismiss weekend rebrand modal on back button if it is open", () => {
        mockShowWeekendRebrandModalRef.current = true

        const { result } = renderHook(() => useHubModals(defaultProps))

        act(() => {
            result.current.handleBackButton()
        })

        expect(mockHandleBackButtonInWeekendRebrandModal).toHaveBeenCalled()
        expect(mockOpenExitModal).not.toHaveBeenCalled()
    })

    it("should dismiss exit modal on back button if it is open", () => {
        mockShowExitModalRef.current = true

        const { result } = renderHook(() => useHubModals(defaultProps))

        act(() => {
            result.current.handleBackButton()
        })

        expect(mockHandleBackButtonInExitModal).toHaveBeenCalled()
        expect(mockOpenExitModal).not.toHaveBeenCalled()
    })

    it("should prioritize weekend rebrand modal over exit modal", () => {
        mockShowWeekendRebrandModalRef.current = true
        mockShowExitModalRef.current = true

        const { result } = renderHook(() => useHubModals(defaultProps))

        act(() => {
            result.current.handleBackButton()
        })

        expect(mockHandleBackButtonInWeekendRebrandModal).toHaveBeenCalled()
        expect(mockHandleBackButtonInExitModal).not.toHaveBeenCalled()
    })

    it("should not handle back button when not initialized", () => {
        const { result } = renderHook(() =>
            useHubModals({ ...defaultProps, isInitialized: false })
        )

        act(() => {
            result.current.handleBackButton()
        })

        expect(mockOpenExitModal).not.toHaveBeenCalled()
        expect(mockHandleBackButtonInWeekendRebrandModal).not.toHaveBeenCalled()
        expect(mockHandleBackButtonInExitModal).not.toHaveBeenCalled()
    })

    it("should pass through handleConfirmExit from exit modal state", () => {
        const { result } = renderHook(() => useHubModals(defaultProps))

        result.current.handleConfirmExit()

        expect(mockHandleConfirmExit).toHaveBeenCalled()
    })

    it("should pass through handleCancelExit from exit modal state", () => {
        const { result } = renderHook(() => useHubModals(defaultProps))

        result.current.handleCancelExit()

        expect(mockHandleCancelExit).toHaveBeenCalled()
    })

    it("should pass through handleAcknowledge as handleWeekendRebrandAcknowledge", () => {
        const { result } = renderHook(() => useHubModals(defaultProps))

        result.current.handleWeekendRebrandAcknowledge()

        expect(mockHandleAcknowledge).toHaveBeenCalled()
    })
})
