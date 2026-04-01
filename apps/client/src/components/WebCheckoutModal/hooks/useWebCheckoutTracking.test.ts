import { renderHook } from "@testing-library/react"

import { useWebCheckoutTracking } from "./useWebCheckoutTracking"

const mockTrack = jest.fn()
jest.mock("../../../hooks/useHubTracking", () => ({
    useHubTracking: (): { track: jest.Mock } => ({ track: mockTrack }),
}))

describe("useWebCheckoutTracking", () => {
    const mockSetConnectionId = jest.fn()
    const baseProps = {
        isOpen: false,
        screenDisplayedId: "test-screen-id",
        upsellContext: { type: "immediate" as const },
        subscribeOptions: {} as never,
        setConnectionId: mockSetConnectionId,
        mainHeading: "Test Heading",
        subtitle: "Test Subtitle",
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should track screen displayed when modal opens", () => {
        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) =>
                useWebCheckoutTracking({ ...baseProps, isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })

        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-screen-id",
            displayChoices: ["Press BACK to see all games"],
            eventCategory: "account pairing",
            eventSubCategory: "immediate pre roll",
            text: "Test Heading Test Subtitle",
        })
        expect(mockSetConnectionId).toHaveBeenCalledWith("test-screen-id")
    })

    it("should track back button press with screenDisplayedId", () => {
        const { result } = renderHook(() =>
            useWebCheckoutTracking({ ...baseProps, isOpen: true })
        )

        result.current.trackBackButton()

        expect(mockTrack).toHaveBeenCalledWith("Hub Button Pressed", {
            choiceValue: "Press BACK to see all games",
            displayChoices: ["Press BACK to see all games"],
            eventCategory: "account pairing",
            eventSubCategory: "immediate pre roll",
            screenDisplayedId: "test-screen-id",
        })
    })

    it("should reset tracking flag when modal closes and reopens", () => {
        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) =>
                useWebCheckoutTracking({ ...baseProps, isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })
        expect(mockTrack).toHaveBeenCalledTimes(1)

        rerender({ isOpen: false })
        rerender({ isOpen: true })

        expect(mockTrack).toHaveBeenCalledTimes(2)
    })

    it("should not track screen displayed if modal never opens", () => {
        const { rerender, unmount } = renderHook(
            ({ isOpen }: { isOpen: boolean }) =>
                useWebCheckoutTracking({ ...baseProps, isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: false })
        rerender({ isOpen: false })

        unmount()

        expect(mockTrack).not.toHaveBeenCalled()
        expect(mockSetConnectionId).not.toHaveBeenCalled()
    })

    it("should track text field with experimental override values", () => {
        const experimentalProps = {
            ...baseProps,
            mainHeading: "Experimental Heading Override",
            subtitle: "Experimental Subtitle Override",
        }

        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) =>
                useWebCheckoutTracking({ ...experimentalProps, isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })

        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "test-screen-id",
            displayChoices: ["Press BACK to see all games"],
            eventCategory: "account pairing",
            eventSubCategory: "immediate pre roll",
            text: "Experimental Heading Override Experimental Subtitle Override",
        })
    })
})
