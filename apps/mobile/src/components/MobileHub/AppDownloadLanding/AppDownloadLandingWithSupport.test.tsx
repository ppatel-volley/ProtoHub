import { act, render, screen } from "@testing-library/react"
import React from "react"

import { AppDownloadLandingWithSupport } from "./AppDownloadLandingWithSupport"

jest.mock("@volley/platform-sdk/react", () => ({
    useEventBroker: jest.fn(() => ({
        addEventListener: jest.fn(() => jest.fn()),
    })),
    usePlatformStatus: jest.fn(() => ({ isReady: true })),
    useSupport: jest.fn(() => ({
        showSupportModal: jest.fn(),
        getSupportEmail: jest.fn(() => "support@volley.tv"),
    })),
}))

jest.mock("./AppDownloadLanding", () => ({
    AppDownloadLanding: (): React.ReactElement => (
        <div data-testid="app-download-landing">App Download Landing</div>
    ),
}))

jest.mock("../shared/SupportOverlay/SupportOverlay", () => ({
    SupportOverlay: ({
        open,
        context,
        onClose,
    }: {
        open: boolean
        context: unknown
        onClose: () => void
    }): React.ReactElement => (
        <div
            data-testid="support-overlay"
            data-open={open}
            data-context={JSON.stringify(context)}
            onClick={onClose}
        >
            Support Overlay
        </div>
    ),
}))

jest.mock("../../../hooks/useHubTracking", () => ({
    useHubTracking: jest.fn(() => ({
        track: jest.fn(),
    })),
}))

jest.mock("../../../hooks/useGames", () => ({
    useGames: jest.fn(() => []),
}))

jest.mock("../../../hooks/useExperimentInit", () => ({
    useExperimentInit: jest.fn(() => ({ experimentsReady: true })),
}))

jest.mock("../../../hooks/useDatadogIdentity", () => ({
    useDatadogIdentity: jest.fn(),
}))

jest.mock("../../../hooks/useBrandDocumentMeta", () => ({
    useBrandDocumentMeta: jest.fn(),
}))

describe("AppDownloadLandingWithSupport", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("renders AppDownloadLanding", () => {
        render(<AppDownloadLandingWithSupport />)
        expect(screen.getByTestId("app-download-landing")).toBeInTheDocument()
    })

    it("renders SupportOverlay alongside AppDownloadLanding", () => {
        render(<AppDownloadLandingWithSupport />)
        expect(screen.getByTestId("app-download-landing")).toBeInTheDocument()
        expect(screen.getByTestId("support-overlay")).toBeInTheDocument()
    })

    it("SupportOverlay starts closed", () => {
        render(<AppDownloadLandingWithSupport />)
        const overlay = screen.getByTestId("support-overlay")
        expect(overlay.getAttribute("data-open")).toBe("false")
    })

    it("opens SupportOverlay when support:open event fires", () => {
        const mockAddEventListener = jest.fn()
        const { useEventBroker } = require("@volley/platform-sdk/react")
        useEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })

        render(<AppDownloadLandingWithSupport />)

        expect(mockAddEventListener).toHaveBeenCalledWith(
            "support:open",
            expect.any(Function)
        )

        const callback = mockAddEventListener.mock.calls[0][1]
        act(() => {
            callback({
                gameContext: { source: "app-download" },
                sdkContext: { version: "1.0" },
            })
        })

        const overlay = screen.getByTestId("support-overlay")
        expect(overlay.getAttribute("data-open")).toBe("true")
        expect(overlay.getAttribute("data-context")).toBe(
            JSON.stringify({
                gameContext: { source: "app-download" },
                sdkContext: { version: "1.0" },
            })
        )
    })

    it("closes SupportOverlay when onClose is called", () => {
        const mockAddEventListener = jest.fn()
        const { useEventBroker } = require("@volley/platform-sdk/react")
        useEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })

        render(<AppDownloadLandingWithSupport />)

        const callback = mockAddEventListener.mock.calls[0][1]
        act(() => {
            callback({ gameContext: {}, sdkContext: {} })
        })

        let overlay = screen.getByTestId("support-overlay")
        expect(overlay.getAttribute("data-open")).toBe("true")

        act(() => {
            overlay.click()
        })

        overlay = screen.getByTestId("support-overlay")
        expect(overlay.getAttribute("data-open")).toBe("false")
    })

    it("initializes experiments, datadog identity, and brand document meta", () => {
        const {
            useExperimentInit,
        } = require("../../../hooks/useExperimentInit")
        const {
            useDatadogIdentity,
        } = require("../../../hooks/useDatadogIdentity")
        const {
            useBrandDocumentMeta,
        } = require("../../../hooks/useBrandDocumentMeta")

        render(<AppDownloadLandingWithSupport />)

        expect(useExperimentInit).toHaveBeenCalled()
        expect(useDatadogIdentity).toHaveBeenCalled()
        expect(useBrandDocumentMeta).toHaveBeenCalled()
    })

    it("does not register event listener when platform is not ready", () => {
        const mockAddEventListener = jest.fn()
        const {
            useEventBroker,
            usePlatformStatus,
        } = require("@volley/platform-sdk/react")
        useEventBroker.mockReturnValue({
            addEventListener: mockAddEventListener,
        })
        usePlatformStatus.mockReturnValue({ isReady: false })

        render(<AppDownloadLandingWithSupport />)

        expect(mockAddEventListener).not.toHaveBeenCalled()
    })
})
