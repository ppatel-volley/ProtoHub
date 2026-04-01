import { fireEvent, render, screen } from "@testing-library/react"
import { getMobileType, MobileType } from "@volley/platform-sdk/lib"
import React from "react"

import { MobileHubEventName } from "../../../constants"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { RoomCodeEntry } from "./RoomCodeEntry"

jest.mock("../../../../package.json", () => ({
    version: "1.0.0-test",
}))

jest.mock("../../../config/envconfig", () => ({
    getWindowVar: jest.fn(),
    getEnvVar: jest.fn(),
    LOGO_DISPLAY_MILLIS: 2000,
    AMPLITUDE_EXPERIMENT_KEY: "",
    BACKEND_SERVER_ENDPOINT: "http://localhost:3000",
    SEGMENT_WRITE_KEY: "test-key",
    ENVIRONMENT: "local",
    BASE_URL: "/",
    DATADOG_APPLICATION_ID: "test-id",
    DATADOG_CLIENT_TOKEN: "test-token",
}))

jest.mock("../../../constants", () => ({
    PLATFORM_STAGE: "staging",
    ROOM_CODE_LENGTH: 6,
    MobileHubEventName: {
        WEB_APP_SCREEN_DISPLAYED: "Web App Screen Displayed",
        WEB_APP_BUTTON_PRESSED: "Web App Button Pressed",
        WEB_APP_ERROR_OCCURRED: "Web App Error Occurred",
    },
}))

const mockDisplayCodeToUrl = jest.fn()
jest.mock("@volley/platform-sdk/lib", () => ({
    getMobileType: jest.fn(),
    MobileType: {
        Ios: "iOS",
        IosAppClip: "iOS_App_Clip",
        Android: "Android",
    },
    displayCodeToUrl: (...args: unknown[]): unknown =>
        mockDisplayCodeToUrl(...args),
}))

const mockExitApp = jest.fn()
jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycle: jest.fn(() => ({
        exitApp: mockExitApp,
    })),
    usePlatformStatus: jest.fn(() => ({
        isReady: true,
    })),
    useSupport: jest.fn(() => ({
        contactSupport: jest.fn(),
        showSupportModal: jest.fn(),
    })),
}))

jest.mock("../../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
        updateBaseEventProperties: jest.fn(),
    })),
}))

jest.mock("uuid", () => ({
    v4: jest.fn(() => "test-screen-id-123"),
}))

jest.mock("./assets/LightXBtn.svg", () => "/mock-close-icon.svg")

jest.mock("../shared/Background/Background", () => ({
    Background: ({
        children,
    }: {
        children: React.ReactNode
    }): React.ReactElement => <div data-testid="background">{children}</div>,
}))

jest.mock("../shared/SupportLink/SupportLink", () => ({
    SupportLink: ({
        roomCode,
        onSupportClick,
    }: {
        roomCode: string | undefined | null
        onSupportClick?: () => void
    }): React.ReactElement => (
        <div
            data-testid="support-link"
            data-room-code={roomCode}
            onClick={onSupportClick}
        >
            Support Link
        </div>
    ),
}))

jest.mock("./JoinRoomForm/JoinRoomForm", () => ({
    JoinRoomForm: ({
        roomCode,
        onRoomCodeChange,
        onSubmit,
        error,
        isSubmitEnabled,
    }: {
        roomCode: string | undefined | null
        onRoomCodeChange: (code: string) => void
        onSubmit: () => void
        error: string | null
        isSubmitEnabled: boolean
    }): React.ReactElement => (
        <div
            data-testid="join-room-form"
            data-room-code={roomCode}
            data-error={error}
            data-is-submit-enabled={isSubmitEnabled ? "true" : "false"}
        >
            <button onClick={() => onRoomCodeChange("123456")}>
                Set Room Code
            </button>
            <button onClick={onSubmit}>Submit</button>
            <input
                placeholder="____"
                value={roomCode ?? ""}
                onChange={(e) => onRoomCodeChange(e.target.value)}
            />
        </div>
    ),
}))

describe("RoomCodeEntry", () => {
    const mockGetMobileType = getMobileType as jest.MockedFunction<
        typeof getMobileType
    >
    const mockUseHubTracking = useHubTracking as jest.MockedFunction<
        typeof useHubTracking
    >
    let mockTrack: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockGetMobileType.mockReturnValue(undefined)
        mockTrack = jest.fn()
        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            updateBaseEventProperties: jest.fn(),
        })
    })

    it("displays the correct version", () => {
        render(<RoomCodeEntry />)

        const versionElement = screen.getByText("v1.0.0-test")
        expect(versionElement).toBeInTheDocument()
    })

    it("renders the room code form", () => {
        render(<RoomCodeEntry />)

        expect(screen.getByTestId("background")).toBeInTheDocument()
        expect(screen.getByTestId("join-room-form")).toBeInTheDocument()
        expect(screen.getByTestId("support-link")).toBeInTheDocument()
    })

    it("renders the close button when not in App Clip", () => {
        mockGetMobileType.mockReturnValue(undefined)
        render(<RoomCodeEntry />)

        const closeButton = screen.getByRole("button", { name: /close/i })
        expect(closeButton).toBeInTheDocument()

        const closeIcon = screen.getByAltText("Close")
        expect(closeIcon).toBeInTheDocument()
        expect(closeIcon).toHaveAttribute("src", "/mock-close-icon.svg")
    })

    it("hides the close button when in App Clip", () => {
        mockGetMobileType.mockReturnValue(MobileType.IosAppClip)
        render(<RoomCodeEntry />)

        const closeButton = screen.queryByRole("button", { name: /close/i })
        expect(closeButton).not.toBeInTheDocument()
    })

    it("calls exitApp when close button is clicked", () => {
        mockGetMobileType.mockReturnValue(undefined)
        render(<RoomCodeEntry />)

        const closeButton = screen.getByRole("button", { name: /close/i })
        fireEvent.click(closeButton)

        expect(mockExitApp).toHaveBeenCalledTimes(1)
    })

    it("close button has correct CSS class", () => {
        mockGetMobileType.mockReturnValue(undefined)
        render(<RoomCodeEntry />)

        const closeButton = screen.getByRole("button", { name: /close/i })
        expect(closeButton).toHaveClass("closeButton")
    })

    describe("room code lookup", () => {
        beforeEach(() => {
            delete (window as { location?: Location }).location
            ;(window as unknown as { location: Location }).location = {
                href: "",
            } as Location
        })

        it("calls displayCodeToUrl and redirects on success", async () => {
            mockDisplayCodeToUrl.mockResolvedValue(
                "https://new-api.com/controller"
            )

            render(<RoomCodeEntry />)

            const setRoomCodeBtn = screen.getByText("Set Room Code")
            fireEvent.click(setRoomCodeBtn)

            const submitBtn = screen.getByText("Submit")
            fireEvent.click(submitBtn)

            await screen.findByTestId("join-room-form")

            expect(mockDisplayCodeToUrl).toHaveBeenCalledWith(
                "123456",
                "staging"
            )

            await new Promise((resolve) => setTimeout(resolve, 100))
            expect(window.location.href).toBe("https://new-api.com/controller")
        })

        it("shows error when displayCodeToUrl rejects", async () => {
            mockDisplayCodeToUrl.mockRejectedValue(
                new Error("Failed to lookup room code")
            )

            render(<RoomCodeEntry />)

            const setRoomCodeBtn = screen.getByText("Set Room Code")
            fireEvent.click(setRoomCodeBtn)

            const submitBtn = screen.getByText("Submit")
            fireEvent.click(submitBtn)

            await screen.findByTestId("join-room-form")

            await new Promise((resolve) => setTimeout(resolve, 100))
            const form = screen.getByTestId("join-room-form")
            expect(form).toHaveAttribute(
                "data-error",
                "Failed to lookup room code"
            )
            expect(window.location.href).toBe("")
        })
    })

    describe("tracking", () => {
        describe("screen displayed", () => {
            it("tracks Web App Screen Displayed on mount", () => {
                render(<RoomCodeEntry />)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                    {
                        screenDisplayedId: "test-screen-id-123",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                    }
                )
            })

            it("tracks screen displayed only once despite re-renders", () => {
                const { rerender } = render(<RoomCodeEntry />)

                expect(mockTrack).toHaveBeenCalledTimes(1)

                rerender(<RoomCodeEntry />)
                rerender(<RoomCodeEntry />)

                expect(mockTrack).toHaveBeenCalledTimes(1)
            })
        })

        describe("button pressed - play", () => {
            beforeEach(() => {
                mockDisplayCodeToUrl.mockResolvedValue(
                    "https://test.com/controller"
                )
            })

            it("tracks Web App Button Pressed when submit is clicked", () => {
                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "play",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId: "test-screen-id-123",
                        text: "123456",
                    }
                )
            })

            it("uses same screenDisplayedId as screen displayed event", () => {
                render(<RoomCodeEntry />)

                const screenDisplayedCall = mockTrack.mock.calls[0]
                const screenDisplayedId =
                    screenDisplayedCall?.[1]?.screenDisplayedId

                mockTrack.mockClear()

                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                const buttonPressedCall = mockTrack.mock.calls[0]
                expect(buttonPressedCall?.[1]?.screenDisplayedId).toBe(
                    screenDisplayedId
                )
            })

            it("tracks Web App Button Pressed with room code when submit succeeds", () => {
                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                // Verify tracking was called before navigation happens
                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "play",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId: "test-screen-id-123",
                        text: "123456",
                    }
                )
            })

            it("does not include text property when room code is only whitespace", () => {
                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                // Simulate entering whitespace-only code
                const input = screen.getByPlaceholderText("____")
                fireEvent.change(input, { target: { value: "      " } })

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "play",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId: "test-screen-id-123",
                    }
                )
                // Verify text property is not present
                expect(mockTrack.mock.calls[0][1]).not.toHaveProperty("text")
            })
        })

        describe("button pressed - support", () => {
            it("tracks support button without room code entered", () => {
                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                const supportLink = screen.getByTestId("support-link")
                fireEvent.click(supportLink)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "support",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId: "test-screen-id-123",
                    }
                )
                // Verify text property is not present
                expect(mockTrack.mock.calls[0][1]).not.toHaveProperty("text")
            })

            it("tracks support button with room code in normal state", () => {
                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                // Enter room code
                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const supportLink = screen.getByTestId("support-link")
                fireEvent.click(supportLink)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "support",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId: "test-screen-id-123",
                        text: "123456",
                    }
                )
            })
        })

        describe("error state tracking", () => {
            it("tracks Web App Error Occurred when error appears", async () => {
                mockDisplayCodeToUrl.mockRejectedValue(
                    new Error("Network error")
                )

                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                await screen.findByTestId("join-room-form")
                await new Promise((resolve) => setTimeout(resolve, 100))

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_ERROR_OCCURRED,
                    {
                        screenDisplayedId: "test-screen-id-123",
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        message: "Room Code: 123456 - Error: Network error",
                    }
                )
            })

            it("tracks play button press when error is present", async () => {
                mockDisplayCodeToUrl.mockRejectedValue(
                    new Error("Failed to lookup room code")
                )

                render(<RoomCodeEntry />)

                const screenDisplayedCall = mockTrack.mock.calls[0]
                const screenDisplayedId =
                    screenDisplayedCall?.[1]?.screenDisplayedId

                // First click - causes error
                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                await screen.findByTestId("join-room-form")
                await new Promise((resolve) => setTimeout(resolve, 100))

                // Verify error is displayed
                const form = screen.getByTestId("join-room-form")
                expect(form).toHaveAttribute(
                    "data-error",
                    "Failed to lookup room code"
                )

                mockTrack.mockClear()

                // Click play again while error is showing
                fireEvent.click(submitBtn)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "play",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId,
                        text: "123456",
                    }
                )
            })

            it("tracks support button press when error is present", async () => {
                mockDisplayCodeToUrl.mockRejectedValue(
                    new Error("Failed to lookup room code")
                )

                render(<RoomCodeEntry />)

                const screenDisplayedCall = mockTrack.mock.calls[0]
                const screenDisplayedId =
                    screenDisplayedCall?.[1]?.screenDisplayedId

                // Cause error
                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                await screen.findByTestId("join-room-form")
                await new Promise((resolve) => setTimeout(resolve, 100))

                mockTrack.mockClear()

                // Click support while error is showing
                const supportLink = screen.getByTestId("support-link")
                fireEvent.click(supportLink)

                expect(mockTrack).toHaveBeenCalledWith(
                    MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                    {
                        choiceValue: "support",
                        displayChoices: ["play", "support"],
                        eventCategory: "game setup",
                        eventSubCategory: "room code",
                        screenDisplayedId,
                        text: "123456",
                    }
                )
            })

            it("does not track error twice for same error", async () => {
                mockDisplayCodeToUrl.mockRejectedValue(
                    new Error("Network error")
                )

                render(<RoomCodeEntry />)

                mockTrack.mockClear()

                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                await screen.findByTestId("join-room-form")
                await new Promise((resolve) => setTimeout(resolve, 100))

                // Should have tracked error once
                const errorCalls = mockTrack.mock.calls.filter(
                    (call) =>
                        call[0] === MobileHubEventName.WEB_APP_ERROR_OCCURRED
                )
                expect(errorCalls).toHaveLength(1)

                mockTrack.mockClear()

                // Click play again - should not track error again
                fireEvent.click(submitBtn)

                await new Promise((resolve) => setTimeout(resolve, 100))

                const newErrorCalls = mockTrack.mock.calls.filter(
                    (call) =>
                        call[0] === MobileHubEventName.WEB_APP_ERROR_OCCURRED
                )
                expect(newErrorCalls).toHaveLength(0)
            })

            it("resets error tracking when user types after error", async () => {
                mockDisplayCodeToUrl.mockRejectedValue(
                    new Error("Network error")
                )

                render(<RoomCodeEntry />)

                // Cause error
                const setRoomCodeBtn = screen.getByText("Set Room Code")
                fireEvent.click(setRoomCodeBtn)

                const submitBtn = screen.getByText("Submit")
                fireEvent.click(submitBtn)

                await screen.findByTestId("join-room-form")
                await new Promise((resolve) => setTimeout(resolve, 100))

                mockTrack.mockClear()

                // User types new code - should clear error and reset tracking
                const input = screen.getByPlaceholderText("____")
                fireEvent.change(input, { target: { value: "1" } })

                // Should not have error anymore
                const form = screen.getByTestId("join-room-form")
                expect(form).not.toHaveAttribute("data-error")

                // Click submit again to cause another error
                fireEvent.change(input, { target: { value: "234567" } })
                fireEvent.click(submitBtn)

                await new Promise((resolve) => setTimeout(resolve, 100))

                // Should track error again since it was reset
                const errorCalls = mockTrack.mock.calls.filter(
                    (call) =>
                        call[0] === MobileHubEventName.WEB_APP_ERROR_OCCURRED
                )
                expect(errorCalls).toHaveLength(1)
            })
        })
    })
})
