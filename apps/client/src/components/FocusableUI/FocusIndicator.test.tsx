import { render } from "@testing-library/react"
import React, { type JSX, type ReactNode } from "react"

import type { FocusTarget } from "../../hooks/useFocusTracking"
import { ArrowPressProvider } from "./ArrowPressContext"
import { FocusIndicator } from "./FocusIndicator"

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
}))

jest.mock("../../utils/imageFormatFallback", () => ({
    useImageWithFallback: (): [string, boolean] => [
        "/mock-base-url/assets/images/ui/volley-focus-frame.avif",
        false,
    ],
}))

const renderWithProvider = (
    ui: React.ReactElement
): ReturnType<typeof render> => {
    return render(ui, {
        wrapper: ({ children }: { children: ReactNode }): JSX.Element => (
            <ArrowPressProvider>{children}</ArrowPressProvider>
        ),
    })
}

const createMockElement = (offsetLeft: number): HTMLElement => {
    const el = document.createElement("div")
    Object.defineProperty(el, "offsetLeft", { value: offsetLeft })
    return el
}

describe("FocusIndicator", () => {
    describe("positioning with scrollOffset", () => {
        it("should position at offsetLeft when scrollOffset is 0", () => {
            const mockElement = createMockElement(500)
            const target: FocusTarget = { element: mockElement, opacity: 1 }

            const { container } = renderWithProvider(
                <FocusIndicator
                    target={target}
                    initialized
                    isPressed={false}
                    scrollOffset={0}
                />
            )

            const indicator = container.firstChild as HTMLElement
            expect(indicator.style.transform).toBe(
                "translate3d(500px, 0, 0.1px)"
            )
        })

        it("should subtract scrollOffset from offsetLeft", () => {
            const mockElement = createMockElement(800)
            const target: FocusTarget = { element: mockElement, opacity: 1 }

            const { container } = renderWithProvider(
                <FocusIndicator
                    target={target}
                    initialized
                    isPressed={false}
                    scrollOffset={300}
                />
            )

            const indicator = container.firstChild as HTMLElement
            expect(indicator.style.transform).toBe(
                "translate3d(500px, 0, 0.1px)"
            )
        })

        it("should default scrollOffset to 0 when not provided", () => {
            const mockElement = createMockElement(350)
            const target: FocusTarget = { element: mockElement, opacity: 1 }

            const { container } = renderWithProvider(
                <FocusIndicator target={target} initialized isPressed={false} />
            )

            const indicator = container.firstChild as HTMLElement
            expect(indicator.style.transform).toBe(
                "translate3d(350px, 0, 0.1px)"
            )
        })

        it("should handle large scrollOffset values", () => {
            const mockElement = createMockElement(2000)
            const target: FocusTarget = { element: mockElement, opacity: 1 }

            const { container } = renderWithProvider(
                <FocusIndicator
                    target={target}
                    initialized
                    isPressed={false}
                    scrollOffset={1500}
                />
            )

            const indicator = container.firstChild as HTMLElement
            expect(indicator.style.transform).toBe(
                "translate3d(500px, 0, 0.1px)"
            )
        })

        it("should not set transform when target element is null", () => {
            const target: FocusTarget = { element: null, opacity: 0 }

            const { container } = renderWithProvider(
                <FocusIndicator
                    target={target}
                    initialized
                    isPressed={false}
                    scrollOffset={100}
                />
            )

            const indicator = container.firstChild as HTMLElement
            expect(indicator.style.transform).toBe("")
        })
    })
})
