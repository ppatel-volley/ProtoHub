import { act, render } from "@testing-library/react"

import { Loading } from "./Loading"

jest.mock("../LoadingScreen", () => ({
    LoadingScreen: jest.fn(() => <div data-testid="loading-screen" />),
}))

jest.mock("../../../hooks/useHubSessionStart", () => ({
    useHubSessionStart: jest.fn(),
}))

jest.mock("../../../hooks/useIsJeopardyReload", () => ({
    useIsJeopardyReload: jest.fn(),
}))

describe("Loading", () => {
    let setVideoComplete: jest.Mock
    const mockUseIsJeopardyReload = jest.mocked(
        require("../../../hooks/useIsJeopardyReload").useIsJeopardyReload
    )

    beforeEach(() => {
        jest.useFakeTimers()
        setVideoComplete = jest.fn()
        mockUseIsJeopardyReload.mockReturnValue(false)
        require("../LoadingScreen").LoadingScreen.mockClear()
    })

    afterEach(() => {
        act(() => {
            jest.runOnlyPendingTimers()
        })
        jest.useRealTimers()
    })

    it("renders LoadingScreen with initial props", () => {
        render(
            <Loading
                logoDisplayMillis={10}
                videoUrl="video.mp4"
                videoComplete={false}
                setVideoComplete={setVideoComplete}
            />
        )

        expect(
            require("../LoadingScreen").LoadingScreen
        ).toHaveBeenLastCalledWith(
            expect.objectContaining({
                showIdentVideo: true,
                displayLogo: true,
                videoUrl: "video.mp4",
                videoComplete: false,
                setVideoComplete,
                logoDisplayMillis: 10,
                onLogoAnimationComplete: expect.any(Function),
            }),
            undefined
        )
    })

    it("sets showIdentVideo to false and calls setVideoComplete when jeopardy reload is detected", () => {
        mockUseIsJeopardyReload.mockReturnValue([true, jest.fn()])

        render(
            <Loading
                logoDisplayMillis={10}
                videoComplete={false}
                setVideoComplete={setVideoComplete}
            />
        )

        expect(setVideoComplete).toHaveBeenLastCalledWith(true)
        expect(
            require("../LoadingScreen").LoadingScreen
        ).toHaveBeenLastCalledWith(
            expect.objectContaining({
                showIdentVideo: false,
            }),
            undefined
        )
    })

    it("displays Loading Screen only after loading Screen callback fires", () => {
        render(
            <Loading
                logoDisplayMillis={10}
                videoComplete={false}
                setVideoComplete={setVideoComplete}
            />
        )

        expect(
            require("../LoadingScreen").LoadingScreen
        ).toHaveBeenLastCalledWith(
            expect.objectContaining({
                showIdentVideo: true,
                displayLogo: true,
                videoUrl: undefined,
                videoComplete: false,
                setVideoComplete,
                logoDisplayMillis: 10,
                onLogoAnimationComplete: expect.any(Function),
            }),
            undefined
        )
    })
})
