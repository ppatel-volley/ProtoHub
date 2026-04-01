import "@testing-library/jest-dom"

import { renderHook } from "@testing-library/react"
import { type JSX, type ReactNode } from "react"

import {
    AppLifecycleVideoProvider,
    useAppLifecycleVideo,
} from "./AppLifecycleVideoContext"

const mockAppLifecycleStateEnum = {
    ACTIVE: "ACTIVE",
    HIDDEN: "HIDDEN",
}

let mockState: string | null = mockAppLifecycleStateEnum.ACTIVE
let mockIsFireTV = false

jest.mock("@volley/platform-sdk/lib", () => ({
    AppLifecycleStateEnum: {
        ACTIVE: "ACTIVE",
        HIDDEN: "HIDDEN",
    },
}))

jest.mock("@volley/platform-sdk/react", () => ({
    useAppLifecycleState: (): { state: string | null } | null =>
        mockState ? { state: mockState } : null,
}))

jest.mock("../config/platformDetection", () => ({
    isFireTV: (): boolean => mockIsFireTV,
}))

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <AppLifecycleVideoProvider>{children}</AppLifecycleVideoProvider>
)

describe("AppLifecycleVideoContext", () => {
    beforeEach(() => {
        mockState = mockAppLifecycleStateEnum.ACTIVE
        mockIsFireTV = false
    })

    it("returns videosEnabled: true when not on FireTV", () => {
        mockIsFireTV = false
        mockState = mockAppLifecycleStateEnum.HIDDEN

        const { result } = renderHook(() => useAppLifecycleVideo(), { wrapper })

        expect(result.current.videosEnabled).toBe(true)
    })

    it("returns videosEnabled: true when state is ACTIVE on FireTV", () => {
        mockIsFireTV = true
        mockState = mockAppLifecycleStateEnum.ACTIVE

        const { result } = renderHook(() => useAppLifecycleVideo(), { wrapper })

        expect(result.current.videosEnabled).toBe(true)
    })

    it("returns videosEnabled: false when state is HIDDEN on FireTV", () => {
        mockIsFireTV = true
        mockState = mockAppLifecycleStateEnum.HIDDEN

        const { result } = renderHook(() => useAppLifecycleVideo(), { wrapper })

        expect(result.current.videosEnabled).toBe(false)
    })

    it("returns videosEnabled: true when lifecycleState is null on FireTV", () => {
        mockIsFireTV = true
        mockState = null

        const { result } = renderHook(() => useAppLifecycleVideo(), { wrapper })

        expect(result.current.videosEnabled).toBe(true)
    })

    it("returns videosEnabled: true as default when used outside provider", () => {
        const { result } = renderHook(() => useAppLifecycleVideo())

        expect(result.current.videosEnabled).toBe(true)
    })
})
