import { renderHook } from "@testing-library/react"

import { useExitModalTracking } from "./useExitModalTracking"

jest.mock("uuid", () => ({
    v4: jest.fn(),
}))

jest.mock("../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock("./useHubTracking", () => ({
    useHubTracking: jest.fn(),
}))

const mockUseHubTracking = require("./useHubTracking").useHubTracking
const mockUuidV4 = require("uuid").v4 as jest.Mock

describe("useExitModalTracking", () => {
    const mockTrack = jest.fn()
    const mockIdentify = jest.fn()
    const mockGroup = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        mockUuidV4.mockReturnValue("exit-modal-uuid-123")
        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            identify: mockIdentify,
            group: mockGroup,
        })
    })

    it("should track hub screen displayed when modal opens", () => {
        const { result } = renderHook(() => useExitModalTracking(true))

        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "exit-modal-uuid-123",
            displayChoices: ["yes", "no"],
            eventCategory: "menu",
            eventSubCategory: "exit modal selection",
            text: "",
        })

        expect(result.current.screenDisplayedId).toBe("exit-modal-uuid-123")
    })

    it("should not track when modal is initially closed", () => {
        const { result } = renderHook(() => useExitModalTracking(false))

        expect(mockTrack).not.toHaveBeenCalled()
        expect(result.current.screenDisplayedId).toBeNull()
    })

    it("should track when modal opens after being closed", () => {
        const { rerender } = renderHook(
            ({ isModalOpen }) => useExitModalTracking(isModalOpen),
            { initialProps: { isModalOpen: false } }
        )

        expect(mockTrack).not.toHaveBeenCalled()

        rerender({ isModalOpen: true })
        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "exit-modal-uuid-123",
            displayChoices: ["yes", "no"],
            eventCategory: "menu",
            eventSubCategory: "exit modal selection",
            text: "",
        })
    })

    it("should track each time the modal opens", () => {
        const { rerender } = renderHook(
            ({ isModalOpen }) => useExitModalTracking(isModalOpen),
            { initialProps: { isModalOpen: false } }
        )

        rerender({ isModalOpen: true })
        expect(mockTrack).toHaveBeenCalledTimes(1)

        rerender({ isModalOpen: false })
        expect(mockTrack).toHaveBeenCalledTimes(1)

        rerender({ isModalOpen: true })
        expect(mockTrack).toHaveBeenCalledTimes(2)

        expect(mockTrack).toHaveBeenCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "exit-modal-uuid-123",
            displayChoices: ["yes", "no"],
            eventCategory: "menu",
            eventSubCategory: "exit modal selection",
            text: "",
        })
    })

    it("should clear screenDisplayedId when modal closes", () => {
        const { result, rerender } = renderHook(
            ({ isModalOpen }) => useExitModalTracking(isModalOpen),
            { initialProps: { isModalOpen: true } }
        )

        expect(result.current.screenDisplayedId).toBe("exit-modal-uuid-123")

        rerender({ isModalOpen: false })

        expect(result.current.screenDisplayedId).toBeNull()
    })

    it("should generate unique screenDisplayedId for each modal opening", () => {
        let uuidCounter = 0
        mockUuidV4.mockImplementation(() => `exit-modal-uuid-${++uuidCounter}`)

        const { result, rerender } = renderHook(
            ({ isModalOpen }) => useExitModalTracking(isModalOpen),
            { initialProps: { isModalOpen: false } }
        )

        rerender({ isModalOpen: true })
        expect(result.current.screenDisplayedId).toBe("exit-modal-uuid-1")

        rerender({ isModalOpen: false })
        expect(result.current.screenDisplayedId).toBeNull()

        rerender({ isModalOpen: true })
        expect(result.current.screenDisplayedId).toBe("exit-modal-uuid-2")

        expect(mockTrack).toHaveBeenCalledTimes(2)
        expect(mockTrack).toHaveBeenLastCalledWith("Hub Screen Displayed", {
            screenDisplayedId: "exit-modal-uuid-2",
            displayChoices: ["yes", "no"],
            eventCategory: "menu",
            eventSubCategory: "exit modal selection",
            text: "",
        })
    })

    it("should not track when modal remains open", () => {
        const { rerender } = renderHook(
            ({ isModalOpen }) => useExitModalTracking(isModalOpen),
            { initialProps: { isModalOpen: true } }
        )

        expect(mockTrack).toHaveBeenCalledTimes(1)

        rerender({ isModalOpen: true })
        expect(mockTrack).toHaveBeenCalledTimes(1)
    })

    it("should not track when modal remains closed", () => {
        const { rerender } = renderHook(
            ({ isModalOpen }) => useExitModalTracking(isModalOpen),
            { initialProps: { isModalOpen: false } }
        )

        expect(mockTrack).not.toHaveBeenCalled()

        rerender({ isModalOpen: false })
        expect(mockTrack).not.toHaveBeenCalled()
    })
})
