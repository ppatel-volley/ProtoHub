import { act, renderHook } from "@testing-library/react"
import type { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import React from "react"

import { UpsellEventSubCategory } from "../constants/tracking"
import type { DevUpsellContextType } from "./useDevUpsell"
import { DevUpsellProvider, useDevUpsell } from "./useDevUpsell"

jest.mock("../components/DevUpsellModal", () => ({
    DevUpsellModal: (): null => null,
}))

describe("useDevUpsell", () => {
    it("should throw an error when used outside of DevUpsellProvider", () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation()

        expect(() => {
            renderHook(() => useDevUpsell())
        }).toThrow("DevUpsell context must be used within its Provider")

        consoleError.mockRestore()
    })

    it("should return a subscribe function when used within DevUpsellProvider", () => {
        const wrapper = ({
            children,
        }: {
            children: React.ReactNode
        }): React.ReactElement => (
            <DevUpsellProvider>{children}</DevUpsellProvider>
        )

        const { result } = renderHook(() => useDevUpsell(), { wrapper })

        expect(result.current).toHaveProperty("subscribe")
        expect(typeof result.current.subscribe).toBe("function")
    })

    it("should return promises from subscribe calls", () => {
        const wrapper = ({
            children,
        }: {
            children: React.ReactNode
        }): React.ReactElement => (
            <DevUpsellProvider>{children}</DevUpsellProvider>
        )

        const { result } = renderHook(() => useDevUpsell(), { wrapper })

        const subscribeOptions = {
            overrideSku: "test-sku",
            eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
        }

        let promise: Promise<{ status: SubscriptionFlowResult }> | undefined
        act(() => {
            promise = result.current.subscribe(subscribeOptions)
        })
        expect(promise).toBeDefined()
        expect(promise).toBeInstanceOf(Promise)
    })

    it("should handle different subscription options", () => {
        const wrapper = ({
            children,
        }: {
            children: React.ReactNode
        }): React.ReactElement => (
            <DevUpsellProvider>{children}</DevUpsellProvider>
        )

        const { result } = renderHook(() => useDevUpsell(), { wrapper })

        const options1 = {
            overrideSku: "premium-sku",
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
        }

        const options2 = {
            eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
        }

        let promise1: Promise<{ status: SubscriptionFlowResult }> | undefined
        let promise2: Promise<{ status: SubscriptionFlowResult }> | undefined

        act(() => {
            promise1 = result.current.subscribe(options1)
        })

        act(() => {
            promise2 = result.current.subscribe(options2)
        })

        expect(promise1).toBeDefined()
        expect(promise1).toBeInstanceOf(Promise)
        expect(promise2).toBeDefined()
        expect(promise2).toBeInstanceOf(Promise)
        expect(promise1).not.toBe(promise2)
    })
})

describe("DevUpsellProvider", () => {
    it("should provide context to children", () => {
        let contextValue: DevUpsellContextType | undefined

        const TestComponent = (): null => {
            contextValue = useDevUpsell()
            return null
        }

        renderHook(() => <TestComponent />, {
            wrapper: ({
                children,
            }: {
                children: React.ReactNode
            }): React.ReactElement => (
                <DevUpsellProvider>
                    <TestComponent />
                    {children}
                </DevUpsellProvider>
            ),
        })

        expect(contextValue).toBeDefined()
        expect(contextValue).toHaveProperty("subscribe")
        expect(typeof contextValue?.subscribe).toBe("function")
    })
})
