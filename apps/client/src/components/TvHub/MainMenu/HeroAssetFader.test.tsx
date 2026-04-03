import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { LaunchedGameState } from "../../../hooks/useLaunchedGameState"
import { HeroAssetFader, HOVER_DELAY_MS } from "./HeroAssetFader"

jest.mock("../../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
    EXPERIMENT_ASSETS_CDN_URL: "https://mock-cdn.com",
    LOGO_DISPLAY_MILLIS: 100,
    getWindowVar: jest.fn(),
}))

jest.mock("../../../contexts/AppLifecycleVideoContext", () => ({
    useAppLifecycleVideo: (): { videosEnabled: boolean } => ({
        videosEnabled: true,
    }),
}))

const HIDDEN_VIDEO_STYLE = {
    opacity: 0,
    visibility: "hidden",
    width: "0%",
    height: "0%",
} as const

const VISIBLE_VIDEO_STYLE = {
    opacity: 1,
    visibility: "visible",
    width: "100%",
    height: "100%",
} as const

jest.mock("motion/react", () => ({
    AnimatePresence: ({
        children,
    }: {
        children: React.ReactNode
    }): React.ReactElement => children as React.ReactElement,
}))

jest.mock("motion/react-m", () => {
    const mockMotion = {
        create: jest.fn((Component: any) => {
            if (typeof Component === "function") {
                return React.forwardRef<any, any>((props, ref) => (
                    <Component
                        {...props}
                        ref={ref}
                        data-testid="motion-fallback-image"
                    />
                ))
            }
            return Component
        }),
        video: React.forwardRef<
            HTMLVideoElement,
            {
                src: string
                poster: string
                className: string
                style?: React.CSSProperties
                animate?: { opacity: number }
                onCanPlay?: () => void
                [key: string]: any
            }
        >(
            (
                { src, poster, className, style, animate, onCanPlay, ...props },
                ref
            ) => (
                <video
                    {...props}
                    ref={(el) => {
                        if (el) {
                            el.load = jest.fn()
                            el.play = jest.fn().mockResolvedValue(undefined)
                            el.pause = jest.fn()
                        }
                        if (typeof ref === "function") {
                            ref(el)
                        } else if (ref) {
                            ref.current = el
                        }
                    }}
                    src={src}
                    poster={poster}
                    className={className}
                    data-testid="motion-video"
                    style={{
                        ...style,
                        opacity: animate?.opacity ?? 0,
                    }}
                    onCanPlay={onCanPlay}
                />
            )
        ),
    }

    return mockMotion
})

describe("HeroAssetFader", () => {
    const mockLaunchedGameState = new LaunchedGameState(
        "https://game.com/session",
        {
            id: "jeopardy",
            title: "Test Game",
            tileImageUrl: "tile.avif",
            heroImageUrl: "hero.avif",
            source: "placeholder" as const,
        },
        {
            __dd_vital_reference: true,
        }
    )

    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("renders image when no video is provided", () => {
        render(
            <HeroAssetFader
                image="test-image.avif"
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )
        const img = screen.getByTestId("motion-fallback-image")
        expect(img).toHaveAttribute("src", "test-image.avif")
    })

    it("renders image and hidden video when video is provided but not focused", () => {
        render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )
        const img = screen.getByTestId("motion-fallback-image")
        const video = screen.getByTestId("motion-video")
        expect(img).toHaveAttribute("src", "test-image.avif")
        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)
    })

    it("shows video after delay when focused and carousel is active and no game is launched", () => {
        render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(VISIBLE_VIDEO_STYLE)
        expect(video).toHaveAttribute("src", "test-video.mp4")
        expect(video).toHaveAttribute("poster", "test-image.avif")
    })

    it("keeps video hidden when focused but carousel is not active", () => {
        render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive={false}
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)
    })

    it("hides video when focus is lost", () => {
        const { rerender } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(VISIBLE_VIDEO_STYLE)

        rerender(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused={false}
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)
    })

    it("keeps video hidden when game is launched", () => {
        render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={mockLaunchedGameState}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)
    })

    it("resets video lifecycle when game exits", () => {
        const { rerender } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={mockLaunchedGameState}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        rerender(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(VISIBLE_VIDEO_STYLE)
    })

    it("cleans up timeout when unmounting", () => {
        const { unmount } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        fireEvent.canPlay(video)

        expect(jest.getTimerCount()).toBe(1)

        unmount()

        expect(jest.getTimerCount()).toBe(0)
    })

    it("cleans up timeout when dependencies change", () => {
        const { rerender } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        fireEvent.canPlay(video)

        expect(jest.getTimerCount()).toBe(1)

        rerender(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused={false}
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        expect(jest.getTimerCount()).toBe(0)
    })

    it("resets video ready state when videoUrl changes", () => {
        const { rerender } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(VISIBLE_VIDEO_STYLE)

        act(() => {
            rerender(
                <HeroAssetFader
                    image="test-image.avif"
                    videoUrl="test-video2.mp4"
                    isFocused
                    isCarouselActive
                    launchedGameState={null}
                    shouldWaitForLGIdentComplete={false}
                />
            )
        })

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        fireEvent.canPlay(video)

        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(VISIBLE_VIDEO_STYLE)
    })

    it("does not render video when shouldWaitForLGIdentComplete is true", () => {
        render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete
            />
        )

        const img = screen.getByTestId("motion-fallback-image")
        expect(img).toHaveAttribute("src", "test-image.avif")
        expect(screen.queryByTestId("motion-video")).not.toBeInTheDocument()
    })

    it("renders video when shouldWaitForLGIdentComplete changes from true to false", () => {
        const { rerender } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete
            />
        )

        expect(screen.queryByTestId("motion-video")).not.toBeInTheDocument()

        rerender(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        expect(video).toBeInTheDocument()
        expect(video).toHaveStyle(HIDDEN_VIDEO_STYLE)
    })

    it("resets showVideo to false when shouldWaitForLGIdentComplete changes to true", () => {
        const { rerender } = render(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete={false}
            />
        )

        const video = screen.getByTestId("motion-video")
        fireEvent.canPlay(video)

        act(() => {
            jest.advanceTimersByTime(HOVER_DELAY_MS)
        })

        expect(video).toHaveStyle(VISIBLE_VIDEO_STYLE)

        rerender(
            <HeroAssetFader
                image="test-image.avif"
                videoUrl="test-video.mp4"
                isFocused
                isCarouselActive
                launchedGameState={null}
                shouldWaitForLGIdentComplete
            />
        )

        expect(screen.queryByTestId("motion-video")).not.toBeInTheDocument()
        const img = screen.getByTestId("motion-fallback-image")
        expect(img).toBeInTheDocument()
    })
})
