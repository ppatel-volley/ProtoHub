import { act, render, screen, waitFor } from "@testing-library/react"

import { TILE_ANIMATION_START_DELAY_MS, TileAnimation } from "./TileAnimation"

describe("TileAnimation", () => {
    let dateNowMock: jest.SpyInstance

    beforeEach(() => {
        dateNowMock = jest.spyOn(Date, "now")
        jest.useFakeTimers()
    })

    afterEach(() => {
        dateNowMock.mockRestore()
        jest.useRealTimers()
    })

    it("renders when focused and carousel is active after delay", async () => {
        render(<TileAnimation isFocused src="test.avif" isCarouselActive />)

        expect(screen.queryByTestId("tile-animation")).not.toBeInTheDocument()

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        await waitFor(() => {
            const img = screen.getByTestId("tile-animation")
            expect(img).toBeInTheDocument()
            expect(img).toHaveAttribute(
                "src",
                expect.stringMatching(/test\.avif\?_t=\d+/)
            )
        })
    })

    it("does not render when unfocused", () => {
        render(
            <TileAnimation isFocused={false} src="test.avif" isCarouselActive />
        )

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        expect(screen.queryByTestId("tile-animation")).not.toBeInTheDocument()
    })

    it("does not render when carousel is not active", () => {
        render(
            <TileAnimation isFocused src="test.avif" isCarouselActive={false} />
        )

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        expect(screen.queryByTestId("tile-animation")).not.toBeInTheDocument()
    })

    it("adds cache busting parameter and preserves it on re-renders but changes on remount", async () => {
        const { rerender, unmount } = render(
            <TileAnimation isFocused src="test.avif" isCarouselActive />
        )

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        await waitFor(() => {
            expect(screen.getByTestId("tile-animation")).toBeInTheDocument()
        })

        const firstSrc = screen
            .getByTestId("tile-animation")
            .getAttribute("src")
        expect(firstSrc).toMatch(/test\.avif\?_t=\d+/)

        rerender(<TileAnimation isFocused src="test.avif" isCarouselActive />)

        const secondSrc = screen
            .getByTestId("tile-animation")
            .getAttribute("src")
        expect(firstSrc).toBe(secondSrc)

        unmount()

        render(<TileAnimation isFocused src="test.avif" isCarouselActive />)

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        await waitFor(() => {
            expect(screen.getByTestId("tile-animation")).toBeInTheDocument()
        })

        const thirdSrc = screen
            .getByTestId("tile-animation")
            .getAttribute("src")
        expect(thirdSrc).toMatch(/test\.avif\?_t=\d+/)
        expect(thirdSrc).not.toBe(firstSrc)
    })

    it("handles URLs with existing query parameters", async () => {
        render(
            <TileAnimation
                isFocused
                src="test.avif?existing=param"
                isCarouselActive
            />
        )

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        await waitFor(() => {
            const img = screen.getByTestId("tile-animation")
            expect(img).toHaveAttribute(
                "src",
                expect.stringMatching(/test\.avif\?existing=param&_t=\d+/)
            )
        })
    })

    it("cancels pending animation when losing focus", () => {
        const { rerender } = render(
            <TileAnimation isFocused src="test.avif" isCarouselActive />
        )

        expect(screen.queryByTestId("tile-animation")).not.toBeInTheDocument()

        rerender(
            <TileAnimation isFocused={false} src="test.avif" isCarouselActive />
        )

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        expect(screen.queryByTestId("tile-animation")).not.toBeInTheDocument()
    })

    it("resets animation when src changes", async () => {
        const { rerender } = render(
            <TileAnimation isFocused src="test1.avif" isCarouselActive />
        )

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        await waitFor(() => {
            expect(screen.getByTestId("tile-animation")).toBeInTheDocument()
        })

        const firstSrc = screen
            .getByTestId("tile-animation")
            .getAttribute("src")
        expect(firstSrc).toMatch(/test1\.avif\?_t=\d+/)

        rerender(<TileAnimation isFocused src="test2.avif" isCarouselActive />)

        expect(screen.queryByTestId("tile-animation")).not.toBeInTheDocument()

        act(() => {
            jest.advanceTimersByTime(TILE_ANIMATION_START_DELAY_MS)
        })

        await waitFor(() => {
            expect(screen.getByTestId("tile-animation")).toBeInTheDocument()
        })

        const secondSrc = screen
            .getByTestId("tile-animation")
            .getAttribute("src")
        expect(secondSrc).toMatch(/test2\.avif\?_t=\d+/)
        expect(firstSrc).not.toBe(secondSrc)
    })
})
