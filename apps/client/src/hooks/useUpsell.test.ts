import { renderHook } from "@testing-library/react"
import { usePayments } from "@volley/platform-sdk/react"

import { UpsellEventSubCategory } from "../constants/tracking"
import { useDevUpsell } from "./useDevUpsell"
import { useUpsell } from "./useUpsell"
import { useWebCheckoutUpsell } from "./useWebCheckoutUpsell"

jest.mock("@volley/platform-sdk/react", () => ({
    usePayments: jest.fn(),
}))

jest.mock("./useDevUpsell", () => ({
    useDevUpsell: jest.fn(),
}))

jest.mock("./useWebCheckoutUpsell", () => ({
    useWebCheckoutUpsell: jest.fn(),
}))

// Mock devOverrides directly since the logic is now built-in
let mockShouldUseDevUpsell = false
let mockShouldForceWebCheckout = false

jest.mock("../config/devOverrides", () => ({
    get SHOULD_USE_DEV_UPSELL(): boolean {
        return mockShouldUseDevUpsell
    },
    get SHOULD_FORCE_WEB_CHECKOUT(): boolean {
        return mockShouldForceWebCheckout
    },
}))

let mockShouldUseWebCheckout = false
jest.mock("../config/platformDetection", () => ({
    shouldUseWebCheckout: jest.fn(() => mockShouldUseWebCheckout),
}))

describe("useUpsell", () => {
    const mockOriginalPayments = {
        subscribe: jest.fn(),
    }
    const mockDevPayments = {
        subscribe: jest.fn(),
    }
    const mockWebCheckoutPayments = {
        subscribe: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(usePayments as jest.Mock).mockReturnValue(mockOriginalPayments)
        ;(useDevUpsell as jest.Mock).mockReturnValue(mockDevPayments)
        ;(useWebCheckoutUpsell as jest.Mock).mockReturnValue(
            mockWebCheckoutPayments
        )

        mockShouldUseDevUpsell = false
        mockShouldForceWebCheckout = false
        mockShouldUseWebCheckout = false
    })

    it("should return original payments when dev upsell is disabled", () => {
        mockShouldUseDevUpsell = false

        const { result } = renderHook(() => useUpsell())

        expect(result.current.subscribe).toBeDefined()

        const options = {
            eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
            upsellContext: { type: "immediate" } as const,
        }
        void result.current.subscribe(options)

        expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
            eventCategory: options.eventCategory,
        })
        expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
    })

    it("should return original payments when dev upsell is disabled (production environment)", () => {
        mockShouldUseDevUpsell = false

        const { result } = renderHook(() => useUpsell())

        expect(result.current.subscribe).toBeDefined()

        const options = {
            eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
            upsellContext: { type: "immediate" } as const,
        }
        void result.current.subscribe(options)

        expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
            eventCategory: options.eventCategory,
        })
        expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
    })

    it("should return original payments when dev upsell is disabled (staging environment)", () => {
        mockShouldUseDevUpsell = false

        const { result } = renderHook(() => useUpsell())

        expect(result.current.subscribe).toBeDefined()

        const options = {
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: { type: "immediate" } as const,
        }
        void result.current.subscribe(options)

        expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
            eventCategory: options.eventCategory,
        })
        expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
    })

    it("should return dev payments when dev upsell is enabled", () => {
        mockShouldUseDevUpsell = true

        const { result } = renderHook(() => useUpsell())

        expect(result.current.subscribe).toBeDefined()

        const options = {
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
            upsellContext: { type: "immediate" } as const,
        }
        void result.current.subscribe(options)

        expect(mockDevPayments.subscribe).toHaveBeenCalledWith({
            eventCategory: options.eventCategory,
        })
        expect(mockOriginalPayments.subscribe).not.toHaveBeenCalled()
    })

    it("should fallback to original payments when dev upsell is enabled but useDevUpsell throws", () => {
        mockShouldUseDevUpsell = true
        ;(useDevUpsell as jest.Mock).mockImplementation(() => {
            throw new Error(
                "DevUpsell context must be used within its Provider"
            )
        })

        const { result } = renderHook(() => useUpsell())

        expect(result.current.subscribe).toBeDefined()

        const options = {
            eventCategory: "in game pre roll" as const,
            upsellContext: { type: "immediate" } as const,
        }
        void result.current.subscribe(options)

        expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
            eventCategory: options.eventCategory,
        })
        expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
    })

    it("should handle non-Error exceptions from useDevUpsell", () => {
        mockShouldUseDevUpsell = true
        ;(useDevUpsell as jest.Mock).mockImplementation(() => {
            throw new Error("Non-standard error")
        })

        const { result } = renderHook(() => useUpsell())

        expect(result.current.subscribe).toBeDefined()

        const options = {
            eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
            upsellContext: { type: "immediate" } as const,
        }
        void result.current.subscribe(options)

        expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
            eventCategory: options.eventCategory,
        })
        expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
    })

    describe("web checkout logic", () => {
        it("should use web checkout when shouldUseWebCheckout returns true", () => {
            mockShouldUseWebCheckout = true

            const { result } = renderHook(() => useUpsell())

            expect(result.current).toBe(mockWebCheckoutPayments)

            const options = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockWebCheckoutPayments.subscribe).toHaveBeenCalledWith(
                options
            )
            expect(mockOriginalPayments.subscribe).not.toHaveBeenCalled()
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
        })

        it("should use web checkout when SHOULD_FORCE_WEB_CHECKOUT is true", () => {
            mockShouldForceWebCheckout = true
            mockShouldUseWebCheckout = false

            const { result } = renderHook(() => useUpsell())

            expect(result.current).toBe(mockWebCheckoutPayments)

            const options = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockWebCheckoutPayments.subscribe).toHaveBeenCalledWith(
                options
            )
            expect(mockOriginalPayments.subscribe).not.toHaveBeenCalled()
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
        })

        it("should use web checkout when both shouldUseWebCheckout and SHOULD_FORCE_WEB_CHECKOUT are true", () => {
            mockShouldUseWebCheckout = true
            mockShouldForceWebCheckout = true

            const { result } = renderHook(() => useUpsell())

            expect(result.current).toBe(mockWebCheckoutPayments)

            const options = {
                eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockWebCheckoutPayments.subscribe).toHaveBeenCalledWith(
                options
            )
            expect(mockOriginalPayments.subscribe).not.toHaveBeenCalled()
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
        })

        it("should fallback to original payments when web checkout hook throws an error", () => {
            mockShouldUseWebCheckout = true
            ;(useWebCheckoutUpsell as jest.Mock).mockImplementation(() => {
                throw new Error("useWebCheckoutUpsell failed")
            })

            const { result } = renderHook(() => useUpsell())

            expect(result.current.subscribe).toBeDefined()

            const options = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
                eventCategory: options.eventCategory,
            })
            expect(mockWebCheckoutPayments.subscribe).not.toHaveBeenCalled()
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
        })

        it("should fallback to original payments when web checkout hook throws with SHOULD_FORCE_WEB_CHECKOUT", () => {
            mockShouldForceWebCheckout = true
            ;(useWebCheckoutUpsell as jest.Mock).mockImplementation(() => {
                throw new Error("useWebCheckoutUpsell failed")
            })

            const { result } = renderHook(() => useUpsell())

            expect(result.current.subscribe).toBeDefined()

            const options = {
                eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
                eventCategory: options.eventCategory,
            })
            expect(mockWebCheckoutPayments.subscribe).not.toHaveBeenCalled()
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
        })
    })

    describe("priority logic", () => {
        it("should fallback from dev to web checkout when dev upsell throws", () => {
            mockShouldUseDevUpsell = true
            mockShouldUseWebCheckout = true
            ;(useDevUpsell as jest.Mock).mockImplementation(() => {
                throw new Error("useDevUpsell failed")
            })

            const { result } = renderHook(() => useUpsell())

            expect(result.current).toBe(mockWebCheckoutPayments)

            const options = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockWebCheckoutPayments.subscribe).toHaveBeenCalledWith(
                options
            )
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
            expect(mockOriginalPayments.subscribe).not.toHaveBeenCalled()
        })

        it("should fallback from dev to web checkout with SHOULD_FORCE_WEB_CHECKOUT when dev upsell throws", () => {
            mockShouldUseDevUpsell = true
            mockShouldForceWebCheckout = true
            ;(useDevUpsell as jest.Mock).mockImplementation(() => {
                throw new Error("useDevUpsell failed")
            })

            const { result } = renderHook(() => useUpsell())

            expect(result.current).toBe(mockWebCheckoutPayments)

            const options = {
                eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockWebCheckoutPayments.subscribe).toHaveBeenCalledWith(
                options
            )
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
            expect(mockOriginalPayments.subscribe).not.toHaveBeenCalled()
        })

        it("should fallback all the way to original payments when both dev and web checkout throw", () => {
            mockShouldUseDevUpsell = true
            mockShouldUseWebCheckout = true
            ;(useDevUpsell as jest.Mock).mockImplementation(() => {
                throw new Error("useDevUpsell failed")
            })
            ;(useWebCheckoutUpsell as jest.Mock).mockImplementation(() => {
                throw new Error("useWebCheckoutUpsell failed")
            })

            const { result } = renderHook(() => useUpsell())

            expect(result.current.subscribe).toBeDefined()

            const options = {
                eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
                upsellContext: { type: "immediate" } as const,
            }
            void result.current.subscribe(options)

            expect(mockOriginalPayments.subscribe).toHaveBeenCalledWith({
                eventCategory: options.eventCategory,
            })
            expect(mockWebCheckoutPayments.subscribe).not.toHaveBeenCalled()
            expect(mockDevPayments.subscribe).not.toHaveBeenCalled()
        })
    })
})
