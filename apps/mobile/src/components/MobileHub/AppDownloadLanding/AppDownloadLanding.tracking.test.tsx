import { fireEvent, render } from "@testing-library/react"
import React from "react"

import { BRANCH_STATIC_QUICK_LINK } from "../../../constants/BRANCH_STATIC_QUICK_LINK"
import { MobileHubEventName } from "../../../constants/tracking"
import { useHubTracking } from "../../../hooks/useHubTracking"
import { AppDownloadLanding } from "./AppDownloadLanding"

jest.mock("../../../hooks/useHubTracking")
jest.mock("../../../config/platformDetection")
jest.mock("lottie-react", () => ({
    __esModule: true,
    default: (): React.ReactNode => <div data-testid="lottie-animation" />,
}))

jest.mock(
    "./DownloadBadge/assets/appleStoreBadge.svg",
    () => "mock-apple-store-badge.svg"
)
jest.mock(
    "./DownloadBadge/assets/googlePlayBadge.svg",
    () => "mock-google-play-badge.svg"
)
jest.mock("../shared/assets/faceoff-shapes.json", () => ({}))

jest.mock("../shared/SupportLink/SupportLink", () => ({
    SupportLink: ({
        onSupportClick,
    }: {
        onSupportClick?: () => void
    }): React.ReactNode => (
        <button data-testid="support-link" onClick={onSupportClick}>
            Support
        </button>
    ),
}))

const mockUseHubTracking = useHubTracking as jest.MockedFunction<
    typeof useHubTracking
>

describe("AppDownloadLanding Tracking", () => {
    const mockTrack = jest.fn()
    const originalLocation = window.location

    beforeEach(() => {
        jest.clearAllMocks()

        mockUseHubTracking.mockReturnValue({
            track: mockTrack,
            updateBaseEventProperties: jest.fn(),
        })

        // Reset location mock
        delete (window as { location?: Location }).location
        window.location = { ...originalLocation, search: "" }
    })

    afterEach(() => {
        window.location = originalLocation
    })

    describe("Screen Displayed Event", () => {
        it("should track screen displayed event on mount", () => {
            render(<AppDownloadLanding />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    displayChoices: ["Google Play", "App Store", "Support"],
                    eventCategory: "download app",
                    text: "Download the app to play. Now available for Android and iOS.",
                })
            )
        })

        it("should include screenDisplayedId in screen displayed event", () => {
            render(<AppDownloadLanding />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    screenDisplayedId: expect.any(String),
                })
            )
        })

        it("should only track screen displayed event once", () => {
            const { rerender } = render(<AppDownloadLanding />)

            expect(mockTrack).toHaveBeenCalledTimes(1)

            rerender(<AppDownloadLanding />)

            expect(mockTrack).toHaveBeenCalledTimes(1)
        })
    })

    describe("Button Pressed Events", () => {
        it("should track Google Play button press", () => {
            const { container } = render(<AppDownloadLanding />)

            const googlePlayLink = container.querySelector(
                `a[href="${BRANCH_STATIC_QUICK_LINK}"]`
            )
            expect(googlePlayLink).not.toBeNull()

            fireEvent.click(googlePlayLink!)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                expect.objectContaining({
                    choiceValue: "Google Play",
                    displayChoices: ["Google Play", "App Store", "Support"],
                    eventCategory: "download app",
                    text: "Download the app to play. Now available for Android and iOS.",
                })
            )
        })

        it("should track App Store button press", () => {
            const { getByAltText } = render(<AppDownloadLanding />)

            const appStoreImage = getByAltText("Download on the App Store")
            const appStoreLink = appStoreImage.closest("a")

            expect(appStoreLink).not.toBeNull()
            fireEvent.click(appStoreLink!)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                expect.objectContaining({
                    choiceValue: "App Store",
                    displayChoices: ["Google Play", "App Store", "Support"],
                    eventCategory: "download app",
                    text: "Download the app to play. Now available for Android and iOS.",
                })
            )
        })

        it("should track Support button press", () => {
            const { getByTestId } = render(<AppDownloadLanding />)

            const supportLink = getByTestId("support-link")
            fireEvent.click(supportLink)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_BUTTON_PRESSED,
                expect.objectContaining({
                    choiceValue: "Support",
                    displayChoices: ["Google Play", "App Store", "Support"],
                    eventCategory: "download app",
                    text: "Download the app to play. Now available for Android and iOS.",
                })
            )
        })

        it("should use the same screenDisplayedId for button press events", () => {
            const { container, getByTestId } = render(<AppDownloadLanding />)

            const screenDisplayedCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_SCREEN_DISPLAYED
            )
            const screenDisplayedId =
                screenDisplayedCall?.[1]?.screenDisplayedId

            const googlePlayLink = container.querySelector(
                `a[href="${BRANCH_STATIC_QUICK_LINK}"]`
            )
            fireEvent.click(googlePlayLink!)

            const googlePlayCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_BUTTON_PRESSED &&
                    call[1]?.choiceValue === "Google Play"
            )

            expect(googlePlayCall?.[1]?.screenDisplayedId).toBe(
                screenDisplayedId
            )

            const supportLink = getByTestId("support-link")
            fireEvent.click(supportLink)

            const supportCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_BUTTON_PRESSED &&
                    call[1]?.choiceValue === "Support"
            )

            expect(supportCall?.[1]?.screenDisplayedId).toBe(screenDisplayedId)
        })
    })

    describe("Entry Source Tracking", () => {
        it("should include entrySource='QR' when URL has ?pairing param", () => {
            window.location = { ...originalLocation, search: "?pairing=ABC123" }

            render(<AppDownloadLanding />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    entrySource: "QR",
                })
            )
        })

        it("should include entrySource='QR' when URL has ?gameIframeControllerUrl param", () => {
            window.location = {
                ...originalLocation,
                search: "?gameIframeControllerUrl=https://game-clients.volley.tv/jeopardy/controller.html",
            }

            render(<AppDownloadLanding />)

            expect(mockTrack).toHaveBeenCalledWith(
                MobileHubEventName.WEB_APP_SCREEN_DISPLAYED,
                expect.objectContaining({
                    entrySource: "QR",
                })
            )
        })

        it("should NOT include entrySource when URL does not have QR params", () => {
            window.location = { ...originalLocation, search: "" }

            render(<AppDownloadLanding />)

            const screenDisplayedCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_SCREEN_DISPLAYED
            )

            expect(screenDisplayedCall?.[1]).not.toHaveProperty("entrySource")
        })

        it("should include entrySource='QR' in button press events when from QR", () => {
            window.location = { ...originalLocation, search: "?pairing=ABC123" }

            const { container, getByTestId } = render(<AppDownloadLanding />)

            const googlePlayLink = container.querySelector(
                `a[href="${BRANCH_STATIC_QUICK_LINK}"]`
            )
            fireEvent.click(googlePlayLink!)

            const googlePlayCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_BUTTON_PRESSED &&
                    call[1]?.choiceValue === "Google Play"
            )

            expect(googlePlayCall?.[1]).toHaveProperty("entrySource", "QR")

            const supportLink = getByTestId("support-link")
            fireEvent.click(supportLink)

            const supportCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_BUTTON_PRESSED &&
                    call[1]?.choiceValue === "Support"
            )

            expect(supportCall?.[1]).toHaveProperty("entrySource", "QR")
        })

        it("should NOT include entrySource in button press events when not from QR", () => {
            window.location = { ...originalLocation, search: "" }

            const { container } = render(<AppDownloadLanding />)

            const googlePlayLink = container.querySelector(
                `a[href="${BRANCH_STATIC_QUICK_LINK}"]`
            )
            fireEvent.click(googlePlayLink!)

            const googlePlayCall = mockTrack.mock.calls.find(
                (call) =>
                    call[0] === MobileHubEventName.WEB_APP_BUTTON_PRESSED &&
                    call[1]?.choiceValue === "Google Play"
            )

            expect(googlePlayCall?.[1]).not.toHaveProperty("entrySource")
        })
    })
})
