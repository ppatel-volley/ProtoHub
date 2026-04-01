/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

import { useBranding } from "../../../../hooks/useBranding"
import type { SupportOverlayContext } from "./SupportOverlay"
import { SupportOverlay } from "./SupportOverlay"

jest.mock("@volley/platform-sdk/react", () => ({
    useSupport: jest.fn(() => ({
        getSupportEmail: jest.fn((isWeekend: boolean) =>
            isWeekend ? "support@weekend.com" : "support@volley.tv"
        ),
    })),
}))

jest.mock("../../../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
    })),
}))

jest.mock("../../../../hooks/useGames", () => ({
    useGames: jest.fn(() => []),
}))

jest.mock("../../../../hooks/useBranding")

const mockUseBranding = useBranding as jest.MockedFunction<typeof useBranding>

describe("SupportOverlay - Weekend Rebrand", () => {
    const mockContext: SupportOverlayContext = {
        gameContext: {},
        sdkContext: {
            gameId: "test-game",
            sessionId: "test-session",
            hubSessionId: "test-hub-session",
        },
    }

    beforeEach(() => {
        jest.clearAllMocks()
        global.fetch = jest.fn()
    })

    describe("when weekend rebrand is active", () => {
        beforeEach(() => {
            mockUseBranding.mockReturnValue({
                brand: "weekend",
                weekendRebrandActive: true,
            })
        })

        it("should use weekend support email from getSupportEmail", async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            render(
                <SupportOverlay
                    open
                    context={mockContext}
                    onClose={jest.fn()}
                />
            )

            const gameSelect = screen.getByLabelText("Game")
            const issueSelect = screen.getByLabelText("Issue Type")
            const bodyInput = screen.getByLabelText("Description")
            const emailInput = screen.getByLabelText("Email")

            await userEvent.selectOptions(gameSelect, "Hub")
            await userEvent.selectOptions(issueSelect, "Other")
            await userEvent.type(bodyInput, "Test issue")
            await userEvent.type(emailInput, "test@example.com")

            const submitButton = screen.getByRole("button", { name: /submit/i })
            await userEvent.click(submitButton)

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled()
            })

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
            const payload = JSON.parse(fetchCall[1].body)

            expect(payload.supportEmail).toBe("support@weekend.com")
        })

        it("should fallback to weekend support email when getSupportEmail returns undefined", async () => {
            const mockGetSupportEmail = jest.fn(() => undefined)
            jest.spyOn(
                require("@volley/platform-sdk/react"),
                "useSupport"
            ).mockReturnValue({
                getSupportEmail: mockGetSupportEmail,
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            render(
                <SupportOverlay
                    open
                    context={mockContext}
                    onClose={jest.fn()}
                />
            )

            const gameSelect = screen.getByLabelText("Game")
            const issueSelect = screen.getByLabelText("Issue Type")
            const bodyInput = screen.getByLabelText("Description")
            const emailInput = screen.getByLabelText("Email")

            await userEvent.selectOptions(gameSelect, "Hub")
            await userEvent.selectOptions(issueSelect, "Other")
            await userEvent.type(bodyInput, "Test issue")
            await userEvent.type(emailInput, "test@example.com")

            const submitButton = screen.getByRole("button", { name: /submit/i })
            await userEvent.click(submitButton)

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled()
            })

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
            const payload = JSON.parse(fetchCall[1].body)

            expect(payload.supportEmail).toBe("support@weekend.com")
            expect(mockGetSupportEmail).toHaveBeenCalledWith(true)
        })
    })

    describe("when weekend rebrand is not active", () => {
        beforeEach(() => {
            mockUseBranding.mockReturnValue({
                brand: "volley",
                weekendRebrandActive: false,
            })
        })

        it("should use volley support email from getSupportEmail", async () => {
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            render(
                <SupportOverlay
                    open
                    context={mockContext}
                    onClose={jest.fn()}
                />
            )

            const gameSelect = screen.getByLabelText("Game")
            const issueSelect = screen.getByLabelText("Issue Type")
            const bodyInput = screen.getByLabelText("Description")
            const emailInput = screen.getByLabelText("Email")

            await userEvent.selectOptions(gameSelect, "Hub")
            await userEvent.selectOptions(issueSelect, "Other")
            await userEvent.type(bodyInput, "Test issue")
            await userEvent.type(emailInput, "test@example.com")

            const submitButton = screen.getByRole("button", { name: /submit/i })
            await userEvent.click(submitButton)

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled()
            })

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
            const payload = JSON.parse(fetchCall[1].body)

            expect(payload.supportEmail).toBe("support@volley.tv")
        })

        it("should fallback to volley support email when getSupportEmail returns undefined", async () => {
            const mockGetSupportEmail = jest.fn(() => undefined)
            jest.spyOn(
                require("@volley/platform-sdk/react"),
                "useSupport"
            ).mockReturnValue({
                getSupportEmail: mockGetSupportEmail,
            })
            ;(global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            })

            render(
                <SupportOverlay
                    open
                    context={mockContext}
                    onClose={jest.fn()}
                />
            )

            const gameSelect = screen.getByLabelText("Game")
            const issueSelect = screen.getByLabelText("Issue Type")
            const bodyInput = screen.getByLabelText("Description")
            const emailInput = screen.getByLabelText("Email")

            await userEvent.selectOptions(gameSelect, "Hub")
            await userEvent.selectOptions(issueSelect, "Other")
            await userEvent.type(bodyInput, "Test issue")
            await userEvent.type(emailInput, "test@example.com")

            const submitButton = screen.getByRole("button", { name: /submit/i })
            await userEvent.click(submitButton)

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled()
            })

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
            const payload = JSON.parse(fetchCall[1].body)

            expect(payload.supportEmail).toBe("support@volley.tv")
            expect(mockGetSupportEmail).toHaveBeenCalledWith(false)
        })
    })
})
