import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import { MobileHubEventName } from "../../../../constants/tracking"
import { useBranding } from "../../../../hooks/useBranding"
import { useGames } from "../../../../hooks/useGames"
import { useHubTracking } from "../../../../hooks/useHubTracking"
import { SupportOverlay, type SupportOverlayContext } from "./SupportOverlay"

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

describe("SupportOverlay Tracking", () => {
    let mockTrack: jest.Mock
    const mockOnClose = jest.fn()
    let originalFetch: typeof global.fetch

    beforeEach(() => {
        jest.clearAllMocks()
        mockTrack = jest.fn()
        mockUseBranding.mockReturnValue({
            brand: "volley",
            weekendRebrandActive: false,
        })
        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            updateBaseEventProperties: jest.fn(),
        })
        mockUseGames.mockReturnValue([
            { id: "jeopardy", title: "Jeopardy", trackingId: "jeopardy" },
            { id: "song-quiz", title: "Song Quiz", trackingId: "song-quiz" },
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

    describe("Screen Displayed Event", () => {
        it("should track WEB_APP_SCREEN_DISPLAYED when overlay opens", () => {
            render(<SupportOverlay open context={null} onClose={mockOnClose} />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    eventCategory: "menu",
                    eventSubCategory: "support",
                    displayChoices: ["Submit", "Cancel"],
                    screenDisplayedId: "test-screen-id-123",
                    text: "Need help? Submit a support request and we'll get back to you soon.",
                })
            )
            // Verify properties are not present when context is null
            const callArgs = mockTrack.mock.calls[0][1]
            expect(callArgs).not.toHaveProperty("gameId")
            expect(callArgs).not.toHaveProperty("hubSessionId")
            expect(callArgs).not.toHaveProperty("gameSessionId")
        })

        it("should track with required properties when context has sdkContext", () => {
            const context: SupportOverlayContext = {
                sdkContext: {
                    gameId: "jeopardy",
                    hubSessionId: "hub-123",
                    sessionId: "game-456",
                    userId: "user-789",
                },
            }

            render(
                <SupportOverlay open context={context} onClose={mockOnClose} />
            )

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    eventCategory: "menu",
                    eventSubCategory: "support",
                    displayChoices: ["Submit", "Cancel"],
                    screenDisplayedId: "test-screen-id-123",
                    text: "Need help? Submit a support request and we'll get back to you soon.",
                })
            )
        })

        it("should not include properties when sdkContext is missing", () => {
            const context: SupportOverlayContext = {
                gameContext: { game: "Custom Game" },
            }

            render(
                <SupportOverlay open context={context} onClose={mockOnClose} />
            )

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    eventCategory: "menu",
                    eventSubCategory: "support",
                    displayChoices: ["Submit", "Cancel"],
                    screenDisplayedId: "test-screen-id-123",
                    text: "Need help? Submit a support request and we'll get back to you soon.",
                })
            )
            // Verify properties are not present when sdkContext is missing
            const callArgs = mockTrack.mock.calls[0][1]
            expect(callArgs).not.toHaveProperty("gameId")
            expect(callArgs).not.toHaveProperty("hubSessionId")
            expect(callArgs).not.toHaveProperty("gameSessionId")
        })

        it("should only track screen displayed once when overlay is opened", () => {
            const { rerender } = render(
                <SupportOverlay open context={null} onClose={mockOnClose} />
            )

            expect(mockTrack).toHaveBeenCalledTimes(1)

            // Rerender with same open state should not track again
            rerender(
                <SupportOverlay open context={null} onClose={mockOnClose} />
            )

            expect(mockTrack).toHaveBeenCalledTimes(1)
        })

        it("should track again when overlay is closed and reopened", () => {
            const { rerender } = render(
                <SupportOverlay
                    open={false}
                    context={null}
                    onClose={mockOnClose}
                />
            )

            expect(mockTrack).not.toHaveBeenCalled()

            // Open overlay
            rerender(
                <SupportOverlay open context={null} onClose={mockOnClose} />
            )

            expect(mockTrack).toHaveBeenCalledTimes(1)

            // Close overlay
            rerender(
                <SupportOverlay
                    open={false}
                    context={null}
                    onClose={mockOnClose}
                />
            )

            // Reopen overlay - should track again
            rerender(
                <SupportOverlay open context={null} onClose={mockOnClose} />
            )

            expect(mockTrack).toHaveBeenCalledTimes(2)
        })
    })

    describe("Cancel Button Event", () => {
        it("should track WEB_APP_BUTTON_PRESSED when cancel button is clicked", () => {
            render(<SupportOverlay open context={null} onClose={mockOnClose} />)

            mockTrack.mockClear()

            const closeButton = screen.getByRole("button", { name: /close/i })
            fireEvent.click(closeButton)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                expect.objectContaining({
                    eventCategory: "menu",
                    eventSubCategory: "support",
                    choiceValue: "Cancel",
                    text: "Need help? Submit a support request and we'll get back to you soon.",
                    displayChoices: ["Submit", "Cancel"],
                    screenDisplayedId: "test-screen-id-123",
                })
            )
            // Verify properties are not present when context is null
            const callArgs = mockTrack.mock.calls[0][1]
            expect(callArgs).not.toHaveProperty("gameId")
            expect(callArgs).not.toHaveProperty("hubSessionId")
            expect(callArgs).not.toHaveProperty("gameSessionId")
        })

        it("should track with required properties when cancel is clicked with context", () => {
            const context: SupportOverlayContext = {
                sdkContext: {
                    gameId: "jeopardy",
                    hubSessionId: "hub-123",
                    sessionId: "game-456",
                },
            }

            render(
                <SupportOverlay open context={context} onClose={mockOnClose} />
            )

            mockTrack.mockClear()

            const closeButton = screen.getByRole("button", { name: /close/i })
            fireEvent.click(closeButton)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                expect.objectContaining({
                    eventCategory: "menu",
                    eventSubCategory: "support",
                    choiceValue: "Cancel",
                    text: "Need help? Submit a support request and we'll get back to you soon.",
                    displayChoices: ["Submit", "Cancel"],
                })
            )
        })
    })

    describe("Submit Button Event", () => {
        it("should track WEB_APP_BUTTON_PRESSED with text property when form is submitted", async () => {
            render(<SupportOverlay open context={null} onClose={mockOnClose} />)

            mockTrack.mockClear()

            // Fill out the form
            const gameSelect = screen.getByLabelText(/game/i)
            fireEvent.change(gameSelect, { target: { value: "Hub" } })

            const issueSelect = screen.getByLabelText(/issue type/i)
            fireEvent.change(issueSelect, {
                target: { value: "Remote is laggy" },
            })

            const descriptionTextarea = screen.getByLabelText(/description/i)
            fireEvent.change(descriptionTextarea, {
                target: { value: "The remote is very laggy" },
            })

            const emailInput = screen.getByLabelText(/email/i)
            fireEvent.change(emailInput, {
                target: { value: "user@example.com" },
            })

            // Submit form
            const submitButton = screen.getByRole("button", { name: /submit/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    expect.objectContaining({
                        eventCategory: "menu",
                        eventSubCategory: "support",
                        choiceValue: "Submit",
                        displayChoices: ["Submit", "Cancel"],
                        screenDisplayedId: "test-screen-id-123",
                        text: "Remote is laggy",
                    })
                )
                // Verify properties are not present when context is null
                const callArgs = mockTrack.mock.calls[0][1]
                expect(callArgs).not.toHaveProperty("gameId")
                expect(callArgs).not.toHaveProperty("hubSessionId")
                expect(callArgs).not.toHaveProperty("gameSessionId")
            })
        })

        it("should track with required properties when form is submitted with context", async () => {
            const context: SupportOverlayContext = {
                sdkContext: {
                    gameId: "jeopardy",
                    hubSessionId: "hub-123",
                    sessionId: "game-456",
                },
            }

            render(
                <SupportOverlay open context={context} onClose={mockOnClose} />
            )

            mockTrack.mockClear()

            // Fill out the form
            const gameSelect = screen.getByLabelText(/game/i)
            fireEvent.change(gameSelect, { target: { value: "Hub" } })

            const issueSelect = screen.getByLabelText(/issue type/i)
            fireEvent.change(issueSelect, {
                target: { value: "No sound" },
            })

            const descriptionTextarea = screen.getByLabelText(/description/i)
            fireEvent.change(descriptionTextarea, {
                target: { value: "There is no sound" },
            })

            const emailInput = screen.getByLabelText(/email/i)
            fireEvent.change(emailInput, {
                target: { value: "user@example.com" },
            })

            // Submit form
            const submitButton = screen.getByRole("button", { name: /submit/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    expect.objectContaining({
                        eventCategory: "menu",
                        eventSubCategory: "support",
                        choiceValue: "Submit",
                        text: "No sound",
                        displayChoices: ["Submit", "Cancel"],
                    })
                )
            })
        })

        it("should populate text property with different issue types", async () => {
            const issueTypes = [
                "Game won't load",
                "Microphone issues",
                "Payment issues",
            ]

            for (const issueType of issueTypes) {
                mockTrack.mockClear()

                const { unmount } = render(
                    <SupportOverlay open context={null} onClose={mockOnClose} />
                )

                mockTrack.mockClear()

                // Fill out the form
                const gameSelect = screen.getByLabelText(/game/i)
                fireEvent.change(gameSelect, { target: { value: "Hub" } })

                const issueSelect = screen.getByLabelText(/issue type/i)
                fireEvent.change(issueSelect, {
                    target: { value: issueType },
                })

                const descriptionTextarea =
                    screen.getByLabelText(/description/i)
                fireEvent.change(descriptionTextarea, {
                    target: { value: "Description" },
                })

                const emailInput = screen.getByLabelText(/email/i)
                fireEvent.change(emailInput, {
                    target: { value: "user@example.com" },
                })

                // Submit form
                const submitButton = screen.getByRole("button", {
                    name: /submit/i,
                })
                fireEvent.click(submitButton)

                await waitFor(() => {
                    expect(mockTrack).toHaveBeenCalledWith(
                        MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                        expect.objectContaining({
                            text: issueType,
                        })
                    )
                })

                unmount()
            }
        })
    })
})
