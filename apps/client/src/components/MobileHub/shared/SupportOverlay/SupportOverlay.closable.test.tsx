import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import { useBranding } from "../../../../hooks/useBranding"
import { useGames } from "../../../../hooks/useGames"
import { useHubTracking } from "../../../../hooks/useHubTracking"
import { SupportOverlay } from "./SupportOverlay"

jest.mock("../../../../hooks/useBranding")
jest.mock("../../../../hooks/useGames")
jest.mock("../../../../hooks/useHubTracking")

jest.mock("@volley/platform-sdk/react", () => ({
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn(() => "support@volley.tv"),
    })),
}))

jest.mock("uuid", () => ({
    v4: jest.fn(() => "test-screen-id-123"),
}))

const mockUseBranding = useBranding as jest.MockedFunction<typeof useBranding>
const mockUseGames = useGames as jest.MockedFunction<typeof useGames>
const mockUseHubTracking = useHubTracking as jest.MockedFunction<
    typeof useHubTracking
>

describe("SupportOverlay closable prop", () => {
    const mockOnClose = jest.fn()
    let originalFetch: typeof global.fetch

    beforeEach(() => {
        jest.clearAllMocks()
        mockUseBranding.mockReturnValue({
            brand: "volley",
            weekendRebrandActive: false,
        })
        mockUseHubTracking.mockReturnValue({
            track: jest.fn(),
            updateBaseEventProperties: jest.fn(),
        })
        mockUseGames.mockReturnValue([
            { id: "jeopardy", title: "Jeopardy", trackingId: "jeopardy" },
        ] as ReturnType<typeof useGames>)

        originalFetch = global.fetch
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        })
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    describe("when closable is true (default)", () => {
        it("renders close button", () => {
            render(<SupportOverlay open context={null} onClose={mockOnClose} />)

            expect(
                screen.getByRole("button", { name: /close/i })
            ).toBeInTheDocument()
        })

        it("closes on Escape key", async () => {
            render(<SupportOverlay open context={null} onClose={mockOnClose} />)

            fireEvent.keyDown(document, { key: "Escape" })

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled()
            })
        })
    })

    describe("when closable is false", () => {
        it("does not render close button", () => {
            render(
                <SupportOverlay
                    open
                    context={null}
                    onClose={mockOnClose}
                    closable={false}
                />
            )

            expect(
                screen.queryByRole("button", { name: /close/i })
            ).not.toBeInTheDocument()
        })

        it("does not close on Escape key", () => {
            render(
                <SupportOverlay
                    open
                    context={null}
                    onClose={mockOnClose}
                    closable={false}
                />
            )

            fireEvent.keyDown(document, { key: "Escape" })

            expect(mockOnClose).not.toHaveBeenCalled()
        })

        it("does not auto-close after successful submission", async () => {
            jest.useFakeTimers()

            render(
                <SupportOverlay
                    open
                    context={null}
                    onClose={mockOnClose}
                    closable={false}
                />
            )

            // Fill out and submit the form
            fireEvent.change(screen.getByLabelText(/game/i), {
                target: { value: "Hub" },
            })
            fireEvent.change(screen.getByLabelText(/issue type/i), {
                target: { value: "No sound" },
            })
            fireEvent.change(screen.getByLabelText(/description/i), {
                target: { value: "No sound at all" },
            })
            fireEvent.change(screen.getByLabelText(/email/i), {
                target: { value: "test@example.com" },
            })
            fireEvent.click(screen.getByRole("button", { name: /submit/i }))

            await waitFor(() => {
                expect(screen.getByText(/thank you/i)).toBeInTheDocument()
            })

            // Advance past the normal 3s auto-close window
            jest.advanceTimersByTime(5000)

            expect(mockOnClose).not.toHaveBeenCalled()

            jest.useRealTimers()
        })

        it("shows success message without countdown after submission", async () => {
            render(
                <SupportOverlay
                    open
                    context={null}
                    onClose={mockOnClose}
                    closable={false}
                />
            )

            fireEvent.change(screen.getByLabelText(/game/i), {
                target: { value: "Hub" },
            })
            fireEvent.change(screen.getByLabelText(/issue type/i), {
                target: { value: "No sound" },
            })
            fireEvent.change(screen.getByLabelText(/description/i), {
                target: { value: "No sound at all" },
            })
            fireEvent.change(screen.getByLabelText(/email/i), {
                target: { value: "test@example.com" },
            })
            fireEvent.click(screen.getByRole("button", { name: /submit/i }))

            await waitFor(() => {
                expect(screen.getByText(/thank you/i)).toBeInTheDocument()
            })

            expect(screen.queryByText(/closing in/i)).not.toBeInTheDocument()
        })
    })
})
