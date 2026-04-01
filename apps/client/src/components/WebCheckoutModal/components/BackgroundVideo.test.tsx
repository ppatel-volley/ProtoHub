import { render } from "@testing-library/react"
import React from "react"

import { BackgroundVideo } from "./BackgroundVideo"

let mockVideosEnabled = true
jest.mock("../../../contexts/AppLifecycleVideoContext", () => ({
    useAppLifecycleVideo: (): { videosEnabled: boolean } => ({
        videosEnabled: mockVideosEnabled,
    }),
}))

describe("BackgroundVideo", () => {
    const mockVideoRef = React.createRef<HTMLVideoElement>()
    const defaultProps = {
        videoRef: mockVideoRef,
        videoSrc: "/test-video.mp4",
        posterSrc: "/test-poster.jpg",
        isVisible: true,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockVideosEnabled = true
    })

    describe("Video Rendering", () => {
        it("should render a video element when videos are enabled", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video")
            const img = container.querySelector("img")

            expect(video).toBeInTheDocument()
            expect(img).not.toBeInTheDocument()
        })

        it("should use videoSrc as the video source", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video")
            expect(video).toHaveAttribute("src", "/test-video.mp4")
        })

        it("should use posterSrc as the video poster", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video")
            expect(video).toHaveAttribute("poster", "/test-poster.jpg")
        })

        it("should apply correct CSS classes when visible", () => {
            const { container } = render(
                <BackgroundVideo {...defaultProps} isVisible />
            )

            const video = container.querySelector("video")
            expect(video?.className).toContain("backgroundVideo")
            expect(video?.className).toContain("backgroundVideoVisible")
            expect(video?.className).not.toContain("backgroundVideoHidden")
        })

        it("should apply correct CSS classes when hidden", () => {
            const { container } = render(
                <BackgroundVideo {...defaultProps} isVisible={false} />
            )

            const video = container.querySelector("video")
            expect(video?.className).toContain("backgroundVideo")
            expect(video?.className).toContain("backgroundVideoHidden")
            expect(video?.className).not.toContain("backgroundVideoVisible")
        })

        it("should not be muted", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video") as HTMLVideoElement
            expect(video.muted).toBe(false)
        })

        it("should have playsInline attribute", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video")
            expect(video).toHaveAttribute("playsInline", "")
        })

        it("should have preload set to auto", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video")
            expect(video).toHaveAttribute("preload", "auto")
        })

        it("should use the provided videoRef", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const video = container.querySelector("video")
            expect(video).toBe(mockVideoRef.current)
        })
    })

    describe("Videos Disabled (App Backgrounded on FireTV)", () => {
        beforeEach(() => {
            mockVideosEnabled = false
        })

        it("should render an img element when videos are disabled", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const img = container.querySelector("img")
            const video = container.querySelector("video")

            expect(img).toBeInTheDocument()
            expect(video).not.toBeInTheDocument()
        })

        it("should use posterSrc as the image source when videos are disabled", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const img = container.querySelector("img")
            expect(img).toHaveAttribute("src", "/test-poster.jpg")
        })

        it("should apply correct CSS classes when visible", () => {
            const { container } = render(
                <BackgroundVideo {...defaultProps} isVisible />
            )

            const img = container.querySelector("img")
            expect(img?.className).toContain("backgroundVideo")
            expect(img?.className).toContain("backgroundVideoVisible")
            expect(img?.className).not.toContain("backgroundVideoHidden")
        })

        it("should apply correct CSS classes when hidden", () => {
            const { container } = render(
                <BackgroundVideo {...defaultProps} isVisible={false} />
            )

            const img = container.querySelector("img")
            expect(img?.className).toContain("backgroundVideo")
            expect(img?.className).toContain("backgroundVideoHidden")
            expect(img?.className).not.toContain("backgroundVideoVisible")
        })

        it("should have empty alt attribute", () => {
            const { container } = render(<BackgroundVideo {...defaultProps} />)

            const img = container.querySelector("img")
            expect(img).toHaveAttribute("alt", "")
        })

        it("should switch from video to image when videos become disabled", () => {
            mockVideosEnabled = true

            const { container, rerender } = render(
                <BackgroundVideo {...defaultProps} />
            )

            expect(container.querySelector("video")).toBeInTheDocument()
            expect(container.querySelector("img")).not.toBeInTheDocument()

            mockVideosEnabled = false
            rerender(<BackgroundVideo {...defaultProps} />)

            expect(container.querySelector("img")).toBeInTheDocument()
            expect(container.querySelector("video")).not.toBeInTheDocument()
        })

        it("should switch from image to video when videos become enabled", () => {
            mockVideosEnabled = false

            const { container, rerender } = render(
                <BackgroundVideo {...defaultProps} />
            )

            expect(container.querySelector("img")).toBeInTheDocument()
            expect(container.querySelector("video")).not.toBeInTheDocument()

            mockVideosEnabled = true
            rerender(<BackgroundVideo {...defaultProps} />)

            expect(container.querySelector("video")).toBeInTheDocument()
            expect(container.querySelector("img")).not.toBeInTheDocument()
        })
    })
})
