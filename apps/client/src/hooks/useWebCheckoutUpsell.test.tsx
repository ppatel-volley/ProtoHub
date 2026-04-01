import { act, renderHook } from "@testing-library/react"
import { render, screen } from "@testing-library/react"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import React, { type JSX } from "react"

import { PAYMENT_SUCCESS_SESSION_KEY } from "../constants"
import { UpsellEventSubCategory } from "../constants/tracking"
import {
    useWebCheckoutUpsell,
    WebCheckoutUpsellProvider,
} from "./useWebCheckoutUpsell"

jest.mock("@volley/platform-sdk/lib", () => ({
    SubscriptionFlowResult: {
        Successful: "Successful",
        Failed: "Failed",
        Cancelled: "Cancelled",
    },
    Platform: {
        Web: "WEB",
        Mobile: "MOBILE",
        FireTV: "FIRE_TV",
        LGTV: "LGTV",
        SamsungTV: "SAMSUNG_TV",
    },
}))

const mockUseAccount = jest.fn().mockReturnValue({
    account: { isSubscribed: false },
})

jest.mock("@volley/platform-sdk/react", () => ({
    useAccount: (): { account: { isSubscribed: boolean } | null } =>
        mockUseAccount(),
}))

jest.mock("../components/WebCheckoutModal/WebCheckoutModal", () => ({
    WebCheckoutModal: ({
        isOpen,
        subscribeOptions,
        onResult,
        onClose,
        onModalHide,
    }: {
        isOpen: boolean
        subscribeOptions: any
        onResult: (result: any) => void
        onClose: () => void
        onModalHide?: () => void
    }): JSX.Element | null => {
        if (!isOpen) return null
        return (
            <div data-testid="web-checkout-modal">
                <div data-testid="subscribe-options">
                    {JSON.stringify(subscribeOptions)}
                </div>
                <button
                    data-testid="success-button"
                    onClick={() => {
                        onResult(SubscriptionFlowResult.Successful)
                        onModalHide?.()
                    }}
                >
                    Success
                </button>
                <button data-testid="close-button" onClick={onClose}>
                    Close
                </button>
            </div>
        )
    },
}))

describe("useWebCheckoutUpsell", () => {
    const defaultProviderProps = {
        authStatus: null,
        deviceAuth: null,
        isDeviceAuthLoading: false,
        platformInitializationError: null,
        setConnectionId: jest.fn(),
        retry: jest.fn(),
    }

    beforeEach(() => {
        sessionStorage.clear()
        mockUseAccount.mockReturnValue({ account: { isSubscribed: false } })
    })

    describe("useWebCheckoutUpsell hook", () => {
        it("should throw error when used outside provider", () => {
            expect(() => {
                renderHook(() => useWebCheckoutUpsell())
            }).toThrow(
                "WebCheckoutUpsell context must be used within its Provider"
            )
        })

        it("should return context value when used within provider", () => {
            const wrapper = ({
                children,
            }: {
                children: React.ReactNode
            }): JSX.Element => (
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    {children}
                </WebCheckoutUpsellProvider>
            )

            const { result } = renderHook(() => useWebCheckoutUpsell(), {
                wrapper,
            })

            expect(result.current).toHaveProperty("subscribe")
            expect(typeof result.current.subscribe).toBe("function")
        })
    })

    describe("WebCheckoutUpsellProvider", () => {
        it("should render children without modal initially", () => {
            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <div data-testid="child">Test Child</div>
                </WebCheckoutUpsellProvider>
            )

            expect(screen.getByTestId("child")).toBeInTheDocument()
            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()
        })

        it("should provide subscribe function that opens modal", () => {
            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    void subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        overrideSku: "test-sku",
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            const subscribeButton = screen.getByTestId("subscribe-btn")

            act(() => {
                subscribeButton.click()
            })

            expect(screen.getByTestId("web-checkout-modal")).toBeInTheDocument()
            expect(screen.getByTestId("subscribe-options")).toHaveTextContent(
                JSON.stringify({
                    eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                    overrideSku: "test-sku",
                    upsellContext: {
                        type: "immediate",
                    },
                })
            )
        })

        it("should resolve promise with successful result when modal succeeds", async () => {
            let subscribePromise: Promise<any> | null = null

            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    subscribePromise = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn").click()
            })

            act(() => {
                screen.getByTestId("success-button").click()
            })

            const result = await subscribePromise!
            expect(result).toEqual({
                status: "Successful",
            })

            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()
        })

        it("should resolve promise with failed result when modal is closed", async () => {
            let subscribePromise: Promise<any> | null = null

            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    subscribePromise = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn").click()
            })

            act(() => {
                screen.getByTestId("close-button").click()
            })

            const result = await subscribePromise!
            expect(result).toEqual({
                status: "Failed",
            })

            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()
        })

        it("should pass empty options object when no options provided", () => {
            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    void subscribe({
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn").click()
            })

            expect(screen.getByTestId("subscribe-options")).toHaveTextContent(
                JSON.stringify({
                    upsellContext: {
                        type: "immediate",
                    },
                })
            )
        })

        it("should resolve pending promise when hasSuccessfulPayment becomes true via sessionStorage", async () => {
            jest.useFakeTimers()
            let subscribePromise: Promise<any> | null = null

            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    subscribePromise = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn").click()
            })

            expect(screen.getByTestId("web-checkout-modal")).toBeInTheDocument()

            act(() => {
                sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true")
                jest.advanceTimersByTime(500)
            })

            const result = await subscribePromise!
            expect(result).toEqual({
                status: "Successful",
            })

            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()

            jest.useRealTimers()
        })

        it("should immediately resolve if hasSuccessfulPayment is already cached", async () => {
            sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true")

            let subscribePromise: Promise<any> | null = null

            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    subscribePromise = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn").click()
            })

            const result = await subscribePromise!
            expect(result).toEqual({
                status: "Successful",
            })

            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()
        })

        it("should reject concurrent subscription calls while one is in progress", async () => {
            let subscribePromise1: Promise<any> | null = null
            let subscribePromise2: Promise<any> | null = null

            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleFirstSubscribe = (): void => {
                    subscribePromise1 = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        upsellContext: { type: "immediate" },
                    })
                }

                const handleSecondSubscribe = (): void => {
                    subscribePromise2 = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <>
                        <button
                            data-testid="subscribe-btn-1"
                            onClick={handleFirstSubscribe}
                        >
                            Subscribe 1
                        </button>
                        <button
                            data-testid="subscribe-btn-2"
                            onClick={handleSecondSubscribe}
                        >
                            Subscribe 2
                        </button>
                    </>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn-1").click()
            })

            expect(screen.getByTestId("web-checkout-modal")).toBeInTheDocument()

            act(() => {
                screen.getByTestId("subscribe-btn-2").click()
            })

            const result2 = await subscribePromise2!
            expect(result2).toEqual({
                status: "Failed",
            })

            expect(screen.getByTestId("web-checkout-modal")).toBeInTheDocument()

            act(() => {
                screen.getByTestId("success-button").click()
            })

            const result1 = await subscribePromise1!
            expect(result1).toEqual({
                status: "Successful",
            })

            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()
        })

        it("should immediately resolve with Successful and not open modal for already subscribed user", async () => {
            mockUseAccount.mockReturnValue({ account: { isSubscribed: true } })

            let subscribePromise: Promise<{ status: string }> | null = null

            const TestComponent = (): JSX.Element => {
                const { subscribe } = useWebCheckoutUpsell()

                const handleSubscribe = (): void => {
                    subscribePromise = subscribe({
                        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                        overrideSku: "test-sku",
                        upsellContext: { type: "immediate" },
                    })
                }

                return (
                    <button
                        data-testid="subscribe-btn"
                        onClick={handleSubscribe}
                    >
                        Subscribe
                    </button>
                )
            }

            render(
                <WebCheckoutUpsellProvider {...defaultProviderProps}>
                    <TestComponent />
                </WebCheckoutUpsellProvider>
            )

            act(() => {
                screen.getByTestId("subscribe-btn").click()
            })

            expect(
                screen.queryByTestId("web-checkout-modal")
            ).not.toBeInTheDocument()

            const result = await subscribePromise!
            expect(result).toEqual({
                status: "Successful",
            })
        })
    })
})
