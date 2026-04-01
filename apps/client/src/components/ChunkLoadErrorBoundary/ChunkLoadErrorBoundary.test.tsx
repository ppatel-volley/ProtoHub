import { render, screen } from "@testing-library/react"
import type { JSX } from "react"
import React from "react"

import { safeDatadogRum } from "../../utils/datadog"
import { logger } from "../../utils/logger"
import { ChunkLoadErrorBoundary } from "./ChunkLoadErrorBoundary"

jest.mock("../../utils/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("../../utils/datadog", () => ({
    safeDatadogRum: {
        addError: jest.fn(),
        addAction: jest.fn(),
    },
}))

jest.mock("../../config/devOverrides", () => ({
    SHOULD_FORCE_CHUNK_LOAD_ERROR: false,
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycle: jest.fn(() => ({
        exitApp: jest.fn(),
    })),
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn((isWeekend: boolean) =>
            isWeekend ? "support@weekend.com" : "support@volley.tv"
        ),
    })),
}))

jest.mock("../../hooks/useBranding")
import { useBranding } from "../../hooks/useBranding"
const mockUseBranding = useBranding as jest.MockedFunction<typeof useBranding>

jest.mock("../UI/FailureModal", () => ({
    FailureModal: ({
        isOpen,
        errorMessage,
    }: {
        isOpen: boolean
        errorMessage: string
    }): JSX.Element => (
        <div data-testid="failure-modal">
            {isOpen && <div data-testid="error-message">{errorMessage}</div>}
        </div>
    ),
}))

const ComponentThatThrows = ({
    error,
}: {
    error: Error
}): React.ReactElement => {
    throw error
}

const mockedLogger = jest.mocked(logger)

describe("ChunkLoadErrorBoundary", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Suppress console errors in tests
        jest.spyOn(console, "error").mockImplementation(() => {})
        mockUseBranding.mockReturnValue({
            brand: "volley",
            weekendRebrandActive: false,
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it("should render children when no error occurs", () => {
        render(
            <ChunkLoadErrorBoundary>
                <div data-testid="child">Test Child</div>
            </ChunkLoadErrorBoundary>
        )

        expect(screen.getByTestId("child")).toBeInTheDocument()
    })

    it("should catch chunk load error with 'failed to fetch dynamically imported module' message", () => {
        const chunkError = new Error(
            "Failed to fetch dynamically imported module: https://example.com/chunk-123.js"
        )

        render(
            <ChunkLoadErrorBoundary>
                <ComponentThatThrows error={chunkError} />
            </ChunkLoadErrorBoundary>
        )

        expect(screen.getByTestId("failure-modal")).toBeInTheDocument()
        expect(screen.getByTestId("error-message")).toHaveTextContent(
            chunkError.message
        )
    })

    it("should catch chunk load error with 'loading chunk' message", () => {
        const chunkError = new Error("Loading chunk 5 failed")

        render(
            <ChunkLoadErrorBoundary>
                <ComponentThatThrows error={chunkError} />
            </ChunkLoadErrorBoundary>
        )

        expect(screen.getByTestId("failure-modal")).toBeInTheDocument()
        expect(screen.getByTestId("error-message")).toHaveTextContent(
            chunkError.message
        )
    })

    it("should catch error with ChunkLoadError in error name", () => {
        const chunkError = new Error("Some error message")
        Object.defineProperty(chunkError, "name", { value: "chunkloaderror" })

        render(
            <ChunkLoadErrorBoundary>
                <ComponentThatThrows error={chunkError} />
            </ChunkLoadErrorBoundary>
        )

        expect(screen.getByTestId("failure-modal")).toBeInTheDocument()
    })

    it("should log chunk load errors to logger and datadog", () => {
        const chunkError = new Error(
            "Failed to fetch dynamically imported module: https://example.com/chunk-123.js"
        )

        render(
            <ChunkLoadErrorBoundary>
                <ComponentThatThrows error={chunkError} />
            </ChunkLoadErrorBoundary>
        )

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockedLogger.error).toHaveBeenCalledWith(
            "Chunk load error caught by boundary:",
            chunkError,
            expect.objectContaining({
                context: "chunk_load_error_boundary",
                errorType: "CHUNK_LOAD_ERROR",
                componentStack: expect.any(String),
            })
        )
        expect(safeDatadogRum.addAction).toHaveBeenCalledWith(
            "chunk_load_error_modal_displayed",
            expect.objectContaining({
                errorMessage: chunkError.message,
            })
        )
    })

    it("should re-throw non-chunk load errors", () => {
        const normalError = new Error("Regular error, not a chunk load error")

        // We expect this to throw, so wrap in a try-catch
        expect(() => {
            render(
                <ChunkLoadErrorBoundary>
                    <ComponentThatThrows error={normalError} />
                </ChunkLoadErrorBoundary>
            )
        }).toThrow(normalError)

        // Should not display the modal for non-chunk errors
        expect(screen.queryByTestId("failure-modal")).not.toBeInTheDocument()
    })

    it("should be case-insensitive when detecting chunk load errors", () => {
        const chunkError = new Error(
            "FAILED TO FETCH DYNAMICALLY IMPORTED MODULE: https://example.com/chunk-123.js"
        )

        render(
            <ChunkLoadErrorBoundary>
                <ComponentThatThrows error={chunkError} />
            </ChunkLoadErrorBoundary>
        )

        expect(screen.getByTestId("failure-modal")).toBeInTheDocument()
    })

    describe("Weekend Rebrand", () => {
        it("should pass weekendRebrandActive flag to getSupportEmail", () => {
            const mockGetSupportEmail = jest.fn(() => "support@weekend.com")
            const { useSupport } = jest.requireMock(
                "@volley/platform-sdk/react"
            )
            ;(useSupport as jest.Mock).mockReturnValue({
                getSupportEmail: mockGetSupportEmail,
            })

            mockUseBranding.mockReturnValue({
                brand: "weekend",
                weekendRebrandActive: true,
            })

            const chunkError = new Error(
                "Failed to fetch dynamically imported module: https://example.com/chunk-123.js"
            )

            render(
                <ChunkLoadErrorBoundary>
                    <ComponentThatThrows error={chunkError} />
                </ChunkLoadErrorBoundary>
            )

            expect(mockGetSupportEmail).toHaveBeenCalledWith(true)
        })
    })
})
