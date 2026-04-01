import { act, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import React from "react"

import { LOGO_DISPLAY_MILLIS } from "../../../config/envconfig"
import { LOADING_SPINNER_DELAY_MS, LoadingScreen } from "./LoadingScreen"

jest.mock("@capacitor/splash-screen", () => ({
    SplashScreen: {
        hide: jest.fn(),
    },
}))

jest.mock("../../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock("./CssSpinner", () => ({
    CssSpinner: (): React.ReactElement => <div data-testid="mock-spinner" />,
}))

jest.mock("../../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
    LOGO_DISPLAY_MILLIS: 100,
    AMPLITUDE_EXPERIMENT_KEY: "test-amplitude-key",
    getWindowVar: jest.fn(),
}))

jest.mock("../../../utils/platformVideoOptimizations", () => {
    return {
        applyPlatformVideoOptimizations: jest.fn(),
        waitForPlatformVideoReady: jest.fn().mockResolvedValue(undefined),
        hidePlatformVideo: jest.fn(),
    }
})

jest.mock("../../../contexts/AppLifecycleVideoContext", () => ({
    useAppLifecycleVideo: (): { videosEnabled: boolean } => ({
        videosEnabled: true,
    }),
}))

jest.mock("../../../hooks/useAsset", () => ({
    useAsset: (key: string): string => {
        const assets: Record<string, string> = {
            logoPoster: "",
        }
        return assets[key] ?? ""
    },
}))

jest.mock("../../../hooks/useCopy", () => ({
    useCopy: (key: string): string => {
        const copy: Record<string, string> = {
            logoAlt: "Weekend Logo",
        }
        return copy[key] ?? ""
    },
}))

describe("LoadingScreen Component", () => {
    const mockVideoUrl = "http://fake-url.fake/fake-video.mp4"
    const noOpSetVideoComplete = (_videoComplete: boolean): void => {
        // no-op for most tests
    }

    const mockPlay = jest.fn().mockResolvedValue(undefined)

    beforeEach(() => {
        jest.useFakeTimers()

        // Mock HTMLVideoElement.play() method
        Object.defineProperty(HTMLVideoElement.prototype, "play", {
            writable: true,
            value: mockPlay,
        })

        const { SplashScreen } = require("@capacitor/splash-screen")
        const { logger } = require("../../../utils/logger")

        const hideFn = SplashScreen.hide
        const logFn = logger.info
        const errorFn = logger.error

        hideFn.mockClear()
        hideFn.mockResolvedValue(undefined)
        logFn.mockClear()
        errorFn.mockClear()
        mockPlay.mockClear()
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.clearAllMocks()
    })

    describe("Splash Screen Hiding", () => {
        const mockLogger = require("../../../utils/logger").logger
        it("should hide the splash screen on component mount", () => {
            render(
                <LoadingScreen
                    showIdentVideo
                    displayLogo
                    videoUrl={undefined}
                    videoComplete={false}
                    setVideoComplete={noOpSetVideoComplete}
                    logoDisplayMillis={LOGO_DISPLAY_MILLIS}
                />
            )

            const { SplashScreen } = require("@capacitor/splash-screen")
            expect(SplashScreen.hide).toHaveBeenCalledTimes(1)
        })

        it("should handle splash screen hide errors gracefully", async () => {
            jest.useRealTimers()

            const mockError = new Error("Failed to hide splash screen")
            const { SplashScreen } = require("@capacitor/splash-screen")
            SplashScreen.hide.mockRejectedValue(mockError)

            render(
                <LoadingScreen
                    showIdentVideo
                    displayLogo
                    videoUrl={undefined}
                    videoComplete={false}
                    setVideoComplete={noOpSetVideoComplete}
                    logoDisplayMillis={LOGO_DISPLAY_MILLIS}
                />
            )

            await new Promise((resolve) => process.nextTick(resolve))

            expect(SplashScreen.hide).toHaveBeenCalledTimes(1)
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Did not hide splash screen, there was likely no need.",
                mockError
            )

            jest.useFakeTimers()
        })

        it("should hide splash screen regardless of other props", () => {
            const { rerender } = render(
                <LoadingScreen
                    showIdentVideo={false}
                    displayLogo={false}
                    videoUrl="test-video.mp4"
                    videoComplete
                    setVideoComplete={noOpSetVideoComplete}
                    logoDisplayMillis={LOGO_DISPLAY_MILLIS}
                />
            )

            const { SplashScreen } = require("@capacitor/splash-screen")
            expect(SplashScreen.hide).toHaveBeenCalledTimes(1)

            rerender(
                <LoadingScreen
                    showIdentVideo
                    displayLogo
                    videoUrl={undefined}
                    videoComplete={false}
                    setVideoComplete={noOpSetVideoComplete}
                    logoDisplayMillis={LOGO_DISPLAY_MILLIS}
                />
            )

            expect(SplashScreen.hide).toHaveBeenCalledTimes(1)
        })
    })

    it("should not render logo image or video when displayLogo is true", () => {
        render(
            <LoadingScreen
                showIdentVideo
                displayLogo
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )
        expect(screen.queryByRole("logo")).not.toBeInTheDocument()
        expect(screen.queryByRole("identvideo")).not.toBeInTheDocument()
    })

    it("should render the video without poster when displayLogo is false and showIdentVideo is true", () => {
        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )
        expect(screen.queryByRole("logo")).not.toBeInTheDocument()
        const videoElement = screen.getByRole("identvideo")
        expect(videoElement).toBeInTheDocument()
        expect(videoElement).toHaveAttribute("src", mockVideoUrl)
        expect(videoElement).not.toHaveAttribute("poster")
    })

    it("should set videoComplete and skip video when videoUrl is not defined", () => {
        let videoComplete = false
        const setVideoComplete = (value: boolean): void => {
            videoComplete = value
        }

        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={undefined}
                videoComplete={false}
                setVideoComplete={setVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )
        expect(screen.queryByRole("logo")).not.toBeInTheDocument()
        expect(videoComplete).toBe(true)
        expect(screen.queryByRole("identvideo")).not.toBeInTheDocument()
    })

    it("should skip video when showIdentVideo is false", () => {
        render(
            <LoadingScreen
                showIdentVideo={false}
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )
        expect(screen.queryByRole("logo")).not.toBeInTheDocument()
        expect(screen.queryByRole("identvideo")).not.toBeInTheDocument()
    })

    it("should update the videoComplete state when the video completes playing", () => {
        let videoComplete = false
        const setVideoComplete = (value: boolean): void => {
            videoComplete = value
        }

        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={videoComplete}
                setVideoComplete={setVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        const videoElement = screen.getByRole("identvideo")
        // video has not completed yet, it should be rendered
        expect(videoComplete).toBe(false)
        expect(videoElement).toBeInTheDocument()

        // Simulate the video ending
        fireEvent.ended(videoElement)

        // Video should still be visible and videoComplete should be true
        expect(screen.getByRole("identvideo")).toBeInTheDocument()
        expect(videoComplete).toBe(true)
    })

    it("should only handle video end once even if ended fires multiple times", () => {
        const setVideoComplete = jest.fn()

        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={setVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        const videoElement = screen.getByRole("identvideo")

        fireEvent.ended(videoElement)
        fireEvent.ended(videoElement)
        fireEvent.ended(videoElement)

        expect(setVideoComplete).toHaveBeenCalledTimes(1)
        expect(setVideoComplete).toHaveBeenCalledWith(true)
    })

    it("should show spinner after 5 seconds when video is complete", () => {
        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        expect(
            screen.queryByTestId("spinner-container")
        ).not.toBeInTheDocument()

        act(() => {
            jest.advanceTimersByTime(LOADING_SPINNER_DELAY_MS)
        })

        expect(screen.getByTestId("spinner-container")).toBeInTheDocument()
    })

    it("should render and play video element when displayLogo is false", async () => {
        mockPlay.mockClear()
        const { rerender } = render(
            <LoadingScreen
                showIdentVideo
                displayLogo
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        expect(screen.queryByRole("identvideo")).not.toBeInTheDocument()
        expect(mockPlay).not.toHaveBeenCalled()
        rerender(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        const videoElement = screen.getByRole("identvideo")
        expect(videoElement).toBeInTheDocument()
        expect(videoElement).not.toHaveAttribute("hidden")

        await waitFor(() => {
            expect(mockPlay).toHaveBeenCalledTimes(1)
        })
    })

    it("should show spinner immediately when autoplay fails (permanent error)", async () => {
        mockPlay.mockRejectedValueOnce(
            new DOMException("Autoplay blocked", "NotAllowedError")
        )

        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId("spinner-container")).toBeInTheDocument()
        })
    })

    it("should show spinner when video element fires error", async () => {
        const { rerender } = render(
            <LoadingScreen
                showIdentVideo
                displayLogo
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        rerender(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        const videoElement = screen.getByRole("identvideo")
        expect(
            screen.queryByTestId("spinner-container")
        ).not.toBeInTheDocument()
        fireEvent.error(videoElement)

        await waitFor(() => {
            expect(screen.getByTestId("spinner-container")).toBeInTheDocument()
        })
    })

    it("should hide spinner when autoplay succeeds after initial failure", async () => {
        const transientError = new Error("Network error")
        transientError.name = "NetworkError"

        mockPlay
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce(undefined)

        render(
            <LoadingScreen
                showIdentVideo
                displayLogo={false}
                videoUrl={mockVideoUrl}
                videoComplete={false}
                setVideoComplete={noOpSetVideoComplete}
                logoDisplayMillis={LOGO_DISPLAY_MILLIS}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId("spinner-container")).toBeInTheDocument()
        })

        await act(async () => {
            await jest.advanceTimersToNextTimerAsync()
        })

        await waitFor(() => {
            expect(
                screen.queryByTestId("spinner-container")
            ).not.toBeInTheDocument()
        })
    })
})
