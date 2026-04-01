import { act, renderHook } from "@testing-library/react"

import { UPDATE_INTERVAL_MS, useFocusDebug } from "./useFocusDebug"

const mockHasFocus = jest.fn()
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

const originalAddEventListener = document.addEventListener.bind(document)
const originalRemoveEventListener = document.removeEventListener.bind(document)
const originalWindowAddEventListener = window.addEventListener.bind(window)
const originalWindowRemoveEventListener =
    window.removeEventListener.bind(window)

describe("useFocusDebug", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()

        Object.defineProperty(document, "hasFocus", {
            value: mockHasFocus,
            writable: true,
        })

        Object.defineProperty(document, "visibilityState", {
            value: "visible",
            writable: true,
        })

        Object.defineProperty(document, "activeElement", {
            value: document.body,
            writable: true,
        })

        document.addEventListener = mockAddEventListener
        document.removeEventListener = mockRemoveEventListener
        window.addEventListener = mockAddEventListener
        window.removeEventListener = mockRemoveEventListener

        mockHasFocus.mockReturnValue(true)
    })

    afterEach(() => {
        jest.useRealTimers()

        document.addEventListener = originalAddEventListener
        document.removeEventListener = originalRemoveEventListener
        window.addEventListener = originalWindowAddEventListener
        window.removeEventListener = originalWindowRemoveEventListener
    })

    it("should initialize with default focus info", () => {
        const { result } = renderHook(() => useFocusDebug())

        expect(result.current).toEqual({
            activeElement: "body",
            activeElementId: null,
            activeElementClass: "",
            activeElementTagName: "body",
            hasFocus: true,
            windowFocused: true,
            documentVisibility: "visible",
        })
    })

    it("should set up event listeners on mount", () => {
        renderHook(() => useFocusDebug())

        expect(mockAddEventListener).toHaveBeenCalledWith(
            "focusin",
            expect.any(Function),
            true
        )
        expect(mockAddEventListener).toHaveBeenCalledWith(
            "focusout",
            expect.any(Function),
            true
        )
        expect(mockAddEventListener).toHaveBeenCalledWith(
            "visibilitychange",
            expect.any(Function)
        )

        expect(mockAddEventListener).toHaveBeenCalledWith(
            "focus",
            expect.any(Function)
        )
        expect(mockAddEventListener).toHaveBeenCalledWith(
            "blur",
            expect.any(Function)
        )
    })

    it("should clean up event listeners on unmount", () => {
        const { unmount } = renderHook(() => useFocusDebug())

        unmount()

        expect(mockRemoveEventListener).toHaveBeenCalledWith(
            "focusin",
            expect.any(Function),
            true
        )
        expect(mockRemoveEventListener).toHaveBeenCalledWith(
            "focusout",
            expect.any(Function),
            true
        )
        expect(mockRemoveEventListener).toHaveBeenCalledWith(
            "visibilitychange",
            expect.any(Function)
        )
        expect(mockRemoveEventListener).toHaveBeenCalledWith(
            "focus",
            expect.any(Function)
        )
        expect(mockRemoveEventListener).toHaveBeenCalledWith(
            "blur",
            expect.any(Function)
        )
    })

    it("should update focus info when document loses focus", () => {
        const { result } = renderHook(() => useFocusDebug())

        mockHasFocus.mockReturnValue(false)

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current.hasFocus).toBe(false)
    })

    it("should update focus info when visibility changes", () => {
        const { result } = renderHook(() => useFocusDebug())

        Object.defineProperty(document, "visibilityState", {
            value: "hidden",
            writable: true,
        })

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current.documentVisibility).toBe("hidden")
    })

    it("should update window focus state on blur", () => {
        const { result } = renderHook(() => useFocusDebug())

        const blurHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "blur"
        )?.[1]

        act(() => {
            blurHandler?.()
        })

        expect(result.current.windowFocused).toBe(false)
    })

    it("should update window focus state on focus", () => {
        const { result } = renderHook(() => useFocusDebug())

        const blurHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "blur"
        )?.[1]

        act(() => {
            blurHandler?.()
        })

        expect(result.current.windowFocused).toBe(false)

        const focusHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "focus"
        )?.[1]

        act(() => {
            focusHandler?.()
        })

        expect(result.current.windowFocused).toBe(true)
    })

    it("should track active element with ID", () => {
        const mockElement = {
            tagName: "BUTTON",
            id: "test-button",
            className: "",
            getAttribute: jest.fn().mockReturnValue(null),
        }

        Object.defineProperty(document, "activeElement", {
            value: mockElement,
            writable: true,
        })

        const { result } = renderHook(() => useFocusDebug())

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current).toMatchObject({
            activeElement: "#test-button",
            activeElementId: "test-button",
            activeElementTagName: "button",
        })
    })

    it("should track active element with class name", () => {
        const mockElement = {
            tagName: "DIV",
            id: "",
            className: "focus-item selected",
            getAttribute: jest.fn().mockReturnValue(null),
        }

        Object.defineProperty(document, "activeElement", {
            value: mockElement,
            writable: true,
        })

        const { result } = renderHook(() => useFocusDebug())

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current).toMatchObject({
            activeElement: ".focus-item",
            activeElementClass: "focus-item selected",
            activeElementTagName: "div",
        })
    })

    it("should fall back to tag name when no ID or class", () => {
        const mockElement = {
            tagName: "INPUT",
            id: "",
            className: "",
            getAttribute: jest.fn().mockReturnValue(null),
        }

        Object.defineProperty(document, "activeElement", {
            value: mockElement,
            writable: true,
        })

        const { result } = renderHook(() => useFocusDebug())

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current).toMatchObject({
            activeElement: "input",
            activeElementTagName: "input",
        })
    })

    it("should handle null active element", () => {
        Object.defineProperty(document, "activeElement", {
            value: null,
            writable: true,
        })

        const { result } = renderHook(() => useFocusDebug())

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current).toMatchObject({
            activeElement: "none",
            activeElementId: null,
            activeElementClass: null,
            activeElementTagName: null,
        })
    })

    it("should update focus info on focusin events", () => {
        const { result } = renderHook(() => useFocusDebug())

        const mockElement = {
            tagName: "BUTTON",
            id: "new-button",
            className: "",
            getAttribute: jest.fn().mockReturnValue(null),
        }

        Object.defineProperty(document, "activeElement", {
            value: mockElement,
            writable: true,
        })

        const focusinHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "focusin"
        )?.[1]

        act(() => {
            focusinHandler?.()
        })

        expect(result.current.activeElement).toBe("#new-button")
    })

    it("should update focus info on focusout events", () => {
        const { result } = renderHook(() => useFocusDebug())

        const mockElement = {
            tagName: "BUTTON",
            id: "focused-button",
            className: "",
            getAttribute: jest.fn().mockReturnValue(null),
        }

        Object.defineProperty(document, "activeElement", {
            value: mockElement,
            writable: true,
        })

        const focusinHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "focusin"
        )?.[1]

        act(() => {
            focusinHandler?.()
        })

        expect(result.current.activeElement).toBe("#focused-button")

        Object.defineProperty(document, "activeElement", {
            value: document.body,
            writable: true,
        })

        const focusoutHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "focusout"
        )?.[1]

        act(() => {
            focusoutHandler?.()
        })

        expect(result.current.activeElement).toBe("body")
    })

    it("should update focus info on visibility change events", () => {
        const { result } = renderHook(() => useFocusDebug())

        Object.defineProperty(document, "visibilityState", {
            value: "hidden",
            writable: true,
        })

        const visibilityHandler = mockAddEventListener.mock.calls.find(
            ([event]) => event === "visibilitychange"
        )?.[1]

        act(() => {
            visibilityHandler?.()
        })

        expect(result.current.documentVisibility).toBe("hidden")
    })

    it("should run periodic updates every UPDATE_INTERVAL_MS milliseconds", () => {
        const { result } = renderHook(() => useFocusDebug())

        mockHasFocus.mockReturnValue(false)

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current.hasFocus).toBe(false)

        mockHasFocus.mockReturnValue(true)

        act(() => {
            jest.advanceTimersByTime(UPDATE_INTERVAL_MS)
        })

        expect(result.current.hasFocus).toBe(true)
    })

    it("should clear interval on unmount", () => {
        const clearIntervalSpy = jest.spyOn(global, "clearInterval")

        const { unmount } = renderHook(() => useFocusDebug())

        unmount()

        expect(clearIntervalSpy).toHaveBeenCalled()

        clearIntervalSpy.mockRestore()
    })
})
