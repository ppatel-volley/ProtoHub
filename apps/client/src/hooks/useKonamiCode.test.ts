import { act, renderHook, waitFor } from "@testing-library/react"

import { KONAMI_CODE, useKonamiCode } from "./useKonamiCode"

describe("useKonamiCode", () => {
    let onComplete: jest.Mock

    beforeEach(() => {
        onComplete = jest.fn()
    })

    const simulateKeyPress = (key: string): void => {
        const event = new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
        })
        window.dispatchEvent(event)
    }

    it("should initialize with default state", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        expect(result.current.konamiState).toEqual({
            currentIndex: 0,
            isComplete: false,
            isEnteringCode: false,
        })
    })

    it("should track progress through the konami code sequence", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        expect(result.current.konamiState.currentIndex).toBe(1)
        expect(result.current.konamiState.isEnteringCode).toBe(true)
        expect(result.current.konamiState.isComplete).toBe(false)

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        expect(result.current.konamiState.currentIndex).toBe(2)
    })

    it("should complete when full sequence is entered", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        KONAMI_CODE.forEach((key) => {
            act(() => {
                simulateKeyPress(key)
            })
        })

        expect(result.current.konamiState.isComplete).toBe(true)
        expect(result.current.konamiState.currentIndex).toBe(KONAMI_CODE.length)
    })

    it("should reset on incorrect key press while entering code", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        expect(result.current.konamiState.currentIndex).toBe(2)

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        expect(result.current.konamiState.currentIndex).toBe(0)
        expect(result.current.konamiState.isEnteringCode).toBe(false)
    })

    it("should not reset on incorrect key when not entering code", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        act(() => {
            simulateKeyPress("x")
        })

        expect(result.current.konamiState.currentIndex).toBe(0)
        expect(result.current.konamiState.isEnteringCode).toBe(false)
    })

    it("should call onComplete after pressing Enter twice when complete", async () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        KONAMI_CODE.forEach((key) => {
            act(() => {
                simulateKeyPress(key)
            })
        })

        expect(result.current.konamiState.isComplete).toBe(true)

        act(() => {
            simulateKeyPress("Enter")
        })

        expect(onComplete).not.toHaveBeenCalled()

        act(() => {
            simulateKeyPress("Enter")
        })

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledTimes(1)
        })

        expect(result.current.konamiState.isComplete).toBe(false)
        expect(result.current.konamiState.currentIndex).toBe(0)
    })

    it("should reset state using resetKonami", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        act(() => {
            simulateKeyPress("ArrowUp")
        })

        expect(result.current.konamiState.currentIndex).toBe(2)

        act(() => {
            result.current.resetKonami()
        })

        expect(result.current.konamiState).toEqual({
            currentIndex: 0,
            isComplete: false,
            isEnteringCode: false,
        })
    })

    it("should be case insensitive", () => {
        const { result } = renderHook(() => useKonamiCode(onComplete))

        act(() => {
            simulateKeyPress("arrowup")
        })

        expect(result.current.konamiState.currentIndex).toBe(1)

        act(() => {
            simulateKeyPress("ARROWUP")
        })

        expect(result.current.konamiState.currentIndex).toBe(2)
    })

    it("should clean up event listener on unmount", () => {
        const removeEventListenerSpy = jest.spyOn(window, "removeEventListener")
        const { unmount } = renderHook(() => useKonamiCode(onComplete))

        unmount()

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "keydown",
            expect.any(Function),
            true
        )

        removeEventListenerSpy.mockRestore()
    })
})
