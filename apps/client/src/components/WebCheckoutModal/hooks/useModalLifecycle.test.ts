import { renderHook } from "@testing-library/react"
import { act } from "react"

import { useModalLifecycle } from "./useModalLifecycle"

describe("useModalLifecycle", () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it("should initialize with default values", () => {
        const { result } = renderHook(() =>
            useModalLifecycle({ isOpen: false })
        )

        expect(result.current.isVisible).toBe(false)
        expect(result.current.screenDisplayedId).toBeNull()
    })

    it("should generate screenDisplayedId when modal opens", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useModalLifecycle({ isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })

        expect(result.current.screenDisplayedId).toBeTruthy()
        expect(typeof result.current.screenDisplayedId).toBe("string")
    })

    it("should set visibility after delay when modal opens", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useModalLifecycle({ isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })

        expect(result.current.isVisible).toBe(false)

        act(() => {
            jest.advanceTimersByTime(50)
        })

        expect(result.current.isVisible).toBe(true)
    })

    it("should reset state when modal closes", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useModalLifecycle({ isOpen }),
            { initialProps: { isOpen: true } }
        )

        act(() => {
            jest.advanceTimersByTime(50)
        })

        const screenDisplayedId = result.current.screenDisplayedId

        expect(result.current.isVisible).toBe(true)
        expect(screenDisplayedId).toBeTruthy()

        rerender({ isOpen: false })

        expect(result.current.isVisible).toBe(false)
        expect(result.current.screenDisplayedId).toBeNull()
    })

    it("should clear visibility timeout when modal closes before delay completes", () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useModalLifecycle({ isOpen }),
            { initialProps: { isOpen: false } }
        )

        rerender({ isOpen: true })
        expect(result.current.isVisible).toBe(false)

        rerender({ isOpen: false })
        expect(result.current.isVisible).toBe(false)

        act(() => {
            jest.advanceTimersByTime(100)
        })

        expect(result.current.isVisible).toBe(false)
    })

    it("should clear visibility timeout on unmount", () => {
        const { result, unmount } = renderHook(
            ({ isOpen }) => useModalLifecycle({ isOpen }),
            { initialProps: { isOpen: true } }
        )

        expect(result.current.isVisible).toBe(false)

        unmount()

        act(() => {
            jest.advanceTimersByTime(100)
        })
    })
})
