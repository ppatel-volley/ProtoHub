import "@testing-library/jest-dom"

import { act, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import {
    getImageWithFallbackSync,
    isFormatDetectionReady,
    waitForFormatDetection,
} from "../../utils/imageFormatFallback"
import { FallbackImage } from "./FallbackImage"

const mockIsFormatDetectionReady = isFormatDetectionReady as jest.Mock
const mockWaitForFormatDetection = waitForFormatDetection as jest.Mock
const mockGetImageWithFallbackSync = getImageWithFallbackSync as jest.Mock

describe("FallbackImage", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockIsFormatDetectionReady.mockReturnValue(true)
        mockWaitForFormatDetection.mockResolvedValue(undefined)
        mockGetImageWithFallbackSync.mockImplementation((url: string) => url)
    })

    it("should show hidden div while format detection is in progress", async () => {
        mockIsFormatDetectionReady.mockReturnValue(false)

        render(
            <FallbackImage
                src="/test.avif"
                alt="Test Image"
                className="test-class"
                data-testid="loading-div"
            />
        )

        const div = screen.getByTestId("loading-div")
        expect(div).toHaveClass("test-class")
        expect(div).toHaveStyle({ visibility: "hidden" })
        expect(screen.queryByAltText("Test Image")).not.toBeInTheDocument()
        expect(mockWaitForFormatDetection).toHaveBeenCalled()

        await act(async () => {
            await waitFor(() => {
                expect(mockWaitForFormatDetection).toHaveBeenCalled()
            })
        })
    })

    it("should render image with fallback URL when format detection is ready", () => {
        mockGetImageWithFallbackSync.mockReturnValue("/test.webp")

        render(
            <FallbackImage
                src="/test.avif"
                alt="Test Image"
                className="test-class"
            />
        )

        const img = screen.getByAltText("Test Image")
        expect(img).toHaveAttribute("src", "/test.webp")
        expect(img).toHaveClass("test-class")
        expect(mockGetImageWithFallbackSync).toHaveBeenCalledWith("/test.avif")
    })

    it("should pass through additional props to image when loaded", () => {
        mockGetImageWithFallbackSync.mockReturnValue("/test.webp")

        render(
            <FallbackImage
                src="/test.avif"
                alt="Test Image"
                className="test-class"
                data-testid="test-img"
                role="img"
            />
        )

        const img = screen.getByTestId("test-img")
        expect(img).toHaveClass("test-class")
        expect(img).toHaveAttribute("data-testid", "test-img")
        expect(img).toHaveAttribute("role", "img")
        expect(img).toHaveAttribute("src", "/test.webp")
        expect(img).toHaveAttribute("alt", "Test Image")
    })

    it("should pass through additional props to div when loading", async () => {
        mockIsFormatDetectionReady.mockReturnValue(false)

        render(
            <FallbackImage
                src="/test.avif"
                alt="Test Image"
                className="test-class"
                data-testid="test-div"
            />
        )

        const div = screen.getByTestId("test-div")
        expect(div).toHaveClass("test-class")
        expect(div).toHaveAttribute("data-testid", "test-div")
        expect(div).toHaveStyle({ visibility: "hidden" })

        await act(async () => {
            await waitFor(() => {
                expect(mockWaitForFormatDetection).toHaveBeenCalled()
            })
        })
    })

    it("should handle non-AVIF images correctly", () => {
        mockGetImageWithFallbackSync.mockReturnValue("/test.png")

        render(<FallbackImage src="/test.png" alt="Test Image" />)

        const img = screen.getByAltText("Test Image")
        expect(img).toHaveAttribute("src", "/test.png")
        expect(mockGetImageWithFallbackSync).toHaveBeenCalledWith("/test.png")
    })

    it("should update when src prop changes", () => {
        mockGetImageWithFallbackSync
            .mockReturnValueOnce("/test1.webp")
            .mockReturnValueOnce("/test2.webp")

        const { rerender } = render(
            <FallbackImage src="/test1.avif" alt="Test Image" />
        )

        expect(screen.getByAltText("Test Image")).toHaveAttribute(
            "src",
            "/test1.webp"
        )

        rerender(<FallbackImage src="/test2.avif" alt="Test Image" />)

        expect(screen.getByAltText("Test Image")).toHaveAttribute(
            "src",
            "/test2.webp"
        )
        expect(mockGetImageWithFallbackSync).toHaveBeenCalledWith("/test1.avif")
        expect(mockGetImageWithFallbackSync).toHaveBeenCalledWith("/test2.avif")
    })
})
