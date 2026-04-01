import { render, waitFor } from "@testing-library/react"
import React from "react"

import { QrWithPlaceholder } from "./QrWithPlaceholder"

Object.defineProperty(window, "location", {
    value: {
        reload: jest.fn(),
    },
    writable: true,
})

jest.mock("./urlShortener", () => ({
    URL_SHORTENING_API: "https://test-api.com",
    QR_CODE_API_BASE: "https://test-api.com/",
}))

describe("QrWithPlaceholder", () => {
    const defaultProps = {
        url: "https://pair.volley.tv/?accountId=test123",
    }

    beforeEach(() => {
        jest.clearAllMocks()
        jest.clearAllTimers()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    describe("Rendering", () => {
        it("should render the placeholder QR component", () => {
            render(<QrWithPlaceholder {...defaultProps} />)

            const qrContainer = document.querySelector('[class*="root"]')
            expect(qrContainer).toBeInTheDocument()

            const fakeQr = document.querySelector('[class*="fakeQr"]')
            expect(fakeQr).toBeInTheDocument()
        })

        it("should display real QR image when loaded successfully", async () => {
            const mockImage = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }

            const OriginalImage = window.Image
            window.Image = jest.fn(() => mockImage) as any

            render(<QrWithPlaceholder {...defaultProps} />)

            if (mockImage.onload) {
                mockImage.src = "data:image/png;base64,test"
                mockImage.onload()
            }

            await waitFor(() => {
                const realQr = document.querySelector(
                    '[class*="qr"]:not([class*="fakeQr"])'
                )
                expect(realQr).toBeInTheDocument()
            })

            window.Image = OriginalImage
        })
    })

    describe("Image Loading and Retry Logic", () => {
        let mockImage: {
            onload: (() => void) | null
            onerror: (() => void) | null
            src: string
        }
        let OriginalImage: typeof window.Image
        let imageConstructorSpy: jest.Mock

        beforeEach(() => {
            mockImage = {
                onload: null,
                onerror: null,
                src: "",
            }
            OriginalImage = window.Image
            imageConstructorSpy = jest.fn(() => mockImage)
            window.Image = imageConstructorSpy as any
        })

        afterEach(() => {
            window.Image = OriginalImage
        })

        it("should handle image load failure", async () => {
            render(<QrWithPlaceholder {...defaultProps} />)

            await waitFor(() => {
                expect(imageConstructorSpy).toHaveBeenCalled()
            })

            expect(mockImage.onerror).toEqual(expect.any(Function))

            if (mockImage.onerror) {
                expect(() => mockImage.onerror?.()).not.toThrow()
            }
        })

        it("should not reload page immediately", async () => {
            render(<QrWithPlaceholder {...defaultProps} />)

            await waitFor(() => {
                expect(imageConstructorSpy).toHaveBeenCalled()
            })

            expect(
                document.querySelector('[class*="root"]')
            ).toBeInTheDocument()
        })

        it("should successfully load image", async () => {
            render(<QrWithPlaceholder {...defaultProps} />)

            await waitFor(() => {
                expect(imageConstructorSpy).toHaveBeenCalled()
            })

            if (mockImage.onload) {
                mockImage.src = "data:image/png;base64,test"
                mockImage.onload()
            }

            await waitFor(() => {
                const realQr = document.querySelector(
                    '[class*="qr"]:not([class*="fakeQr"])'
                )
                expect(realQr).toBeInTheDocument()
            })
        })

        it("should handle image creation", async () => {
            render(<QrWithPlaceholder {...defaultProps} />)

            await waitFor(() => {
                expect(imageConstructorSpy).toHaveBeenCalled()
            })

            expect(mockImage).toEqual(
                expect.objectContaining({
                    onload: expect.any(Function),
                    onerror: expect.any(Function),
                })
            )
        })
    })

    describe("URL Changes", () => {
        it("should reload QR when URL prop changes", async () => {
            const imageConstructorSpy = jest.fn(() => ({
                onload: null,
                onerror: null,
                src: "",
            }))
            window.Image = imageConstructorSpy as any

            const { rerender } = render(
                <QrWithPlaceholder url="https://pair.volley.tv/?accountId=test1" />
            )

            await waitFor(() => {
                expect(imageConstructorSpy).toHaveBeenCalledTimes(1)
            })

            rerender(
                <QrWithPlaceholder url="https://pair.volley.tv/?accountId=test2" />
            )

            await waitFor(() => {
                expect(imageConstructorSpy).toHaveBeenCalledTimes(2)
            })
        })
    })

    describe("Component Cleanup", () => {
        it("should handle component unmount gracefully", () => {
            const { unmount } = render(<QrWithPlaceholder {...defaultProps} />)

            const mockImage = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }
            window.Image = jest.fn(() => mockImage) as any

            unmount()

            expect(() => {
                if (mockImage.onload) {
                    mockImage.onload()
                }
            }).not.toThrow()
        })
    })

    describe("onQrRendered callback", () => {
        it("should call onQrRendered when QR code is successfully loaded", async () => {
            const mockOnQrRendered = jest.fn()
            const mockImage = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }

            const OriginalImage = window.Image
            window.Image = jest.fn(() => mockImage) as any

            render(
                <QrWithPlaceholder
                    {...defaultProps}
                    onQrRendered={mockOnQrRendered}
                />
            )

            await waitFor(() => {
                expect(mockImage.onload).toEqual(expect.any(Function))
            })

            if (mockImage.onload) {
                mockImage.src = "data:image/png;base64,test"
                mockImage.onload()
            }

            await waitFor(() => {
                expect(mockOnQrRendered).toHaveBeenCalledTimes(1)
            })

            window.Image = OriginalImage
        })

        it("should not call onQrRendered if callback is not provided", async () => {
            const mockImage = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }

            const OriginalImage = window.Image
            window.Image = jest.fn(() => mockImage) as any

            render(<QrWithPlaceholder {...defaultProps} />)

            await waitFor(() => {
                expect(mockImage.onload).toEqual(expect.any(Function))
            })

            if (mockImage.onload) {
                mockImage.src = "data:image/png;base64,test"
                mockImage.onload()
            }

            await waitFor(() => {
                const realQr = document.querySelector(
                    '[class*="qr"]:not([class*="fakeQr"])'
                )
                expect(realQr).toBeInTheDocument()
            })

            window.Image = OriginalImage
        })

        it("should only call onQrRendered once even when parent re-renders with new callback reference", async () => {
            const mockOnQrRendered1 = jest.fn()
            const mockOnQrRendered2 = jest.fn()
            const mockImage = {
                onload: null as (() => void) | null,
                onerror: null as (() => void) | null,
                src: "",
            }

            const OriginalImage = window.Image
            window.Image = jest.fn(() => mockImage) as any

            const { rerender } = render(
                <QrWithPlaceholder
                    {...defaultProps}
                    onQrRendered={mockOnQrRendered1}
                />
            )

            await waitFor(() => {
                expect(mockImage.onload).toEqual(expect.any(Function))
            })

            if (mockImage.onload) {
                mockImage.src = "data:image/png;base64,test"
                mockImage.onload()
            }

            await waitFor(() => {
                expect(mockOnQrRendered1).toHaveBeenCalledTimes(1)
            })

            rerender(
                <QrWithPlaceholder
                    {...defaultProps}
                    onQrRendered={mockOnQrRendered2}
                />
            )

            await waitFor(() => {
                expect(mockOnQrRendered2).not.toHaveBeenCalled()
            })

            expect(mockOnQrRendered1).toHaveBeenCalledTimes(1)

            window.Image = OriginalImage
        })
    })
})
