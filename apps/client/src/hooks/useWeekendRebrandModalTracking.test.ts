import { act, renderHook } from "@testing-library/react"

import { useWeekendRebrandModalTracking } from "./useWeekendRebrandModalTracking"

const mockTrack = jest.fn()
jest.mock("./useHubTracking", () => ({
    useHubTracking: (): { track: jest.Mock } => ({
        track: mockTrack,
    }),
}))

jest.mock("uuid", () => ({
    v4: (): string => "test-uuid-123",
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

describe("useWeekendRebrandModalTracking", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should track Hub Screen Displayed when modal opens", () => {
        const { rerender } = renderHook(
            ({ isOpen }) => useWeekendRebrandModalTracking(isOpen),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })

        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["Got it"],
            eventCategory: "menu",
            eventSubCategory: "weekend rebrand modal",
        })
    })

    it("should not track when modal is already open", () => {
        const { rerender } = renderHook(
            ({ isOpen }) => useWeekendRebrandModalTracking(isOpen),
            { initialProps: { isOpen: true } }
        )

        mockTrack.mockClear()

        rerender({ isOpen: true })

        expect(mockTrack).not.toHaveBeenCalled()
    })

    it("should track Hub Button Pressed when trackButtonPress is called", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useWeekendRebrandModalTracking(isOpen),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })
        mockTrack.mockClear()

        act(() => {
            result.current.trackButtonPress()
        })

        expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
            eventCategory: "menu",
            eventSubCategory: "weekend rebrand modal",
            screenDisplayedId: "test-uuid-123",
            displayChoices: ["Got it"],
            choiceValue: "Got it",
        })
    })

    it("should return screenDisplayedId when modal is open", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useWeekendRebrandModalTracking(isOpen),
            { initialProps: { isOpen: false } }
        )

        expect(result.current.screenDisplayedId).toBeNull()

        rerender({ isOpen: true })

        expect(result.current.screenDisplayedId).toBe("test-uuid-123")
    })

    it("should clear screenDisplayedId when modal closes", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useWeekendRebrandModalTracking(isOpen),
            { initialProps: { isOpen: true } }
        )

        expect(result.current.screenDisplayedId).toBe("test-uuid-123")

        rerender({ isOpen: false })

        expect(result.current.screenDisplayedId).toBeNull()
    })

    it("should not track button press if screenDisplayedId is null", () => {
        const { result } = renderHook(() =>
            useWeekendRebrandModalTracking(false)
        )

        act(() => {
            result.current.trackButtonPress()
        })

        expect(mockTrack).not.toHaveBeenCalledWith(
            "Hub Button Pressed",
            expect.anything()
        )
    })
})
