import { render, screen } from "@testing-library/react"
import React from "react"

import type { Deeplink } from "../../config/deeplink"
import type { GameId } from "../../hooks/useGames"
import { TvHub } from "./TvHub"

jest.mock("../../config/deeplink", () => ({
    getDeeplink: jest.fn(),
}))

jest.mock("../../hooks/useImmediateUpsell", () => ({
    useImmediateUpsell: jest.fn(() => ({ isInImmediateUpsell: false })),
}))

jest.mock("../../hooks/useGameSelectionUpsell", () => ({
    useGameSelectionUpsell: jest.fn(() => ({
        isInGameSelectionUpsell: false,
        handleGamePaywall: jest.fn().mockResolvedValue(true),
    })),
}))

jest.mock("./MainMenu", () => {
    const React = require("react")
    const { getDeeplink } = require("../../config/deeplink")
    const {
        useGameSelectionUpsell,
    } = require("../../hooks/useGameSelectionUpsell")
    return {
        Main: ({
            isInitialized,
        }: {
            isInitialized: boolean
        }): React.ReactElement => {
            const dl = isInitialized ? getDeeplink() : undefined
            useGameSelectionUpsell(dl)
            return React.createElement("div", {
                "data-testid": "main-proxy",
            })
        },
    }
})

describe("TvHub", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    type TvHubProps = {
        partyId: string | null | undefined
        userId: string | null | undefined
        setReady: (ready: boolean) => void
    }

    const MockTvHub = ({
        partyId,
        userId,
        setReady,
    }: TvHubProps): React.ReactElement => {
        React.useEffect(() => {
            setReady(true)
        }, [setReady])

        return (
            <div
                data-testid="tv-hub"
                data-party-id={partyId}
                data-user-id={userId}
            >
                <div data-testid="background">Background</div>
                <div data-testid="debug">Debug</div>
                <div data-testid="phase-router">Phase Router</div>
            </div>
        )
    }

    it("renders the TV Hub with phase router and background", () => {
        const mockSetReady = jest.fn()
        render(
            <MockTvHub
                partyId={null}
                userId="test-user-id"
                setReady={mockSetReady}
            />
        )

        expect(screen.getByTestId("phase-router")).toBeInTheDocument()
        expect(screen.getByTestId("background")).toBeInTheDocument()
        expect(screen.getByTestId("debug")).toBeInTheDocument()
    })

    it("passes the party ID as a data attribute", () => {
        const mockSetReady = jest.fn()
        const testPartyId = "test-party-id"
        const testUserId = "test-user-id"

        render(
            <MockTvHub
                partyId={testPartyId}
                userId={testUserId}
                setReady={mockSetReady}
            />
        )

        const tvHub = screen.getByTestId("tv-hub")
        expect(tvHub.getAttribute("data-party-id")).toBe(testPartyId)
        expect(tvHub.getAttribute("data-user-id")).toBe(testUserId)
    })

    it("calls setReady on mount", () => {
        const mockSetReady = jest.fn()
        render(
            <MockTvHub
                partyId={null}
                userId="test-user-id"
                setReady={mockSetReady}
            />
        )

        expect(mockSetReady).toHaveBeenCalledWith(true)
    })

    it("passes deeplink consistently to immediate and selection upsell hooks", () => {
        const { getDeeplink } = jest.requireMock("../../config/deeplink")
        const { useImmediateUpsell } = jest.requireMock(
            "../../hooks/useImmediateUpsell"
        )
        const { useGameSelectionUpsell } = jest.requireMock(
            "../../hooks/useGameSelectionUpsell"
        )

        const testDeeplink: Deeplink = {
            gameId: "wheel-of-fortune" as GameId,
            campaignId: "consistent-test",
        }

        ;(getDeeplink as jest.Mock).mockReturnValue(testDeeplink)

        render(
            <TvHub
                setAssetLoadingStates={jest.fn()}
                isInitialized
                optionalImagesLoaded
                isJeopardyReload={false}
                videoComplete
                platformReady
                experimentsReady
            />
        )

        expect(useImmediateUpsell).toHaveBeenCalledWith(
            true,
            testDeeplink,
            true
        )
        expect(useGameSelectionUpsell).toHaveBeenCalledWith(testDeeplink)
    })

    it("waits for experiments to be ready before starting upsell", () => {
        const { getDeeplink } = jest.requireMock("../../config/deeplink")
        const { useImmediateUpsell } = jest.requireMock(
            "../../hooks/useImmediateUpsell"
        )

        ;(getDeeplink as jest.Mock).mockReturnValue(null)

        render(
            <TvHub
                setAssetLoadingStates={jest.fn()}
                isInitialized
                optionalImagesLoaded
                isJeopardyReload={false}
                videoComplete
                platformReady
                experimentsReady={false}
            />
        )

        expect(useImmediateUpsell).toHaveBeenCalledWith(false, null, true)
    })

    it("starts upsell when all conditions including experiments are ready", () => {
        const { getDeeplink } = jest.requireMock("../../config/deeplink")
        const { useImmediateUpsell } = jest.requireMock(
            "../../hooks/useImmediateUpsell"
        )

        ;(getDeeplink as jest.Mock).mockReturnValue(null)

        render(
            <TvHub
                setAssetLoadingStates={jest.fn()}
                isInitialized
                optionalImagesLoaded
                isJeopardyReload={false}
                videoComplete
                platformReady
                experimentsReady
            />
        )

        expect(useImmediateUpsell).toHaveBeenCalledWith(true, null, true)
    })

    it("passes canSubscribe=false when isInitialized=false", () => {
        const { getDeeplink } = jest.requireMock("../../config/deeplink")
        const { useImmediateUpsell } = jest.requireMock(
            "../../hooks/useImmediateUpsell"
        )

        ;(getDeeplink as jest.Mock).mockReturnValue(null)

        render(
            <TvHub
                setAssetLoadingStates={jest.fn()}
                isInitialized={false}
                optionalImagesLoaded={false}
                isJeopardyReload={false}
                videoComplete
                platformReady
                experimentsReady
            />
        )

        expect(useImmediateUpsell).toHaveBeenCalledWith(true, null, false)
    })

    it("passes canSubscribe=false when isInitialized=true but optionalImagesLoaded=false", () => {
        const { getDeeplink } = jest.requireMock("../../config/deeplink")
        const { useImmediateUpsell } = jest.requireMock(
            "../../hooks/useImmediateUpsell"
        )

        ;(getDeeplink as jest.Mock).mockReturnValue(null)

        render(
            <TvHub
                setAssetLoadingStates={jest.fn()}
                isInitialized
                optionalImagesLoaded={false}
                isJeopardyReload={false}
                videoComplete
                platformReady
                experimentsReady
            />
        )

        expect(useImmediateUpsell).toHaveBeenCalledWith(true, null, false)
    })

    it("passes canSubscribe=true when both isInitialized and optionalImagesLoaded", () => {
        const { getDeeplink } = jest.requireMock("../../config/deeplink")
        const { useImmediateUpsell } = jest.requireMock(
            "../../hooks/useImmediateUpsell"
        )

        ;(getDeeplink as jest.Mock).mockReturnValue(null)

        render(
            <TvHub
                setAssetLoadingStates={jest.fn()}
                isInitialized
                optionalImagesLoaded
                isJeopardyReload={false}
                videoComplete
                platformReady
                experimentsReady
            />
        )

        expect(useImmediateUpsell).toHaveBeenCalledWith(true, null, true)
    })
})
