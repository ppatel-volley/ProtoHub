import { fireEvent, render, screen } from "@testing-library/react"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"

import { UpsellEventSubCategory } from "../constants/tracking"
import {
    DEV_UPSELL_ALREADY_PURCHASED_BUTTON,
    DEV_UPSELL_CANCELLED_BUTTON,
    DEV_UPSELL_FAILED_BUTTON,
    DEV_UPSELL_SUBSCRIPTION_REQUEST_TITLE,
    DEV_UPSELL_SUCCESS_BUTTON,
    DEV_UPSELL_TITLE,
    DevUpsellModal,
} from "./DevUpsellModal"

jest.mock("@volley/platform-sdk/lib", () => ({
    SubscriptionFlowResult: {
        Successful: "Successful",
        Failed: "Failed",
        AlreadyPurchased: "AlreadyPurchased",
        Cancelled: "Cancelled",
    },
}))

describe("DevUpsellModal", () => {
    const mockOnResult = jest.fn()
    const mockSubscribeOptions = {
        overrideSku: "test-sku",
        eventCategory: UpsellEventSubCategory.HUB_PRE_ROLL,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should not render when isOpen is false", () => {
        render(
            <DevUpsellModal
                isOpen={false}
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        expect(screen.queryByText(DEV_UPSELL_TITLE)).not.toBeInTheDocument()
    })

    it("should render when isOpen is true", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        expect(screen.getByText(DEV_UPSELL_TITLE)).toBeInTheDocument()
        expect(
            screen.getByText(/This simulator is only for the web/)
        ).toBeInTheDocument()
    })

    it("should display subscription options in JSON format", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        expect(
            screen.getByText(DEV_UPSELL_SUBSCRIPTION_REQUEST_TITLE)
        ).toBeInTheDocument()
        expect(
            screen.getByText(/"overrideSku": "test-sku"/)
        ).toBeInTheDocument()
        expect(
            screen.getByText(/"eventCategory": "hub pre roll"/)
        ).toBeInTheDocument()
    })

    it("should call onResult with Successful when Success button is clicked", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        const successButton = screen.getByText(DEV_UPSELL_SUCCESS_BUTTON)
        fireEvent.click(successButton)

        expect(mockOnResult).toHaveBeenCalledWith(
            SubscriptionFlowResult.Successful
        )
        expect(mockOnResult).toHaveBeenCalledTimes(1)
    })

    it("should call onResult with Failed when Failed button is clicked", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        const failedButton = screen.getByText(DEV_UPSELL_FAILED_BUTTON)
        fireEvent.click(failedButton)

        expect(mockOnResult).toHaveBeenCalledWith(SubscriptionFlowResult.Failed)
        expect(mockOnResult).toHaveBeenCalledTimes(1)
    })

    it("should call onResult with Failed when Cancelled button is clicked", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        const cancelledButton = screen.getByText(DEV_UPSELL_CANCELLED_BUTTON)
        fireEvent.click(cancelledButton)

        expect(mockOnResult).toHaveBeenCalledWith(SubscriptionFlowResult.Failed)
        expect(mockOnResult).toHaveBeenCalledTimes(1)
    })

    it("should call onResult with AlreadyPurchased when Already Purchased button is clicked", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        const alreadyPurchasedButton = screen.getByText(
            DEV_UPSELL_ALREADY_PURCHASED_BUTTON
        )
        fireEvent.click(alreadyPurchasedButton)

        expect(mockOnResult).toHaveBeenCalledWith(
            SubscriptionFlowResult.AlreadyPurchased
        )
        expect(mockOnResult).toHaveBeenCalledTimes(1)
    })

    it("should render all action buttons", () => {
        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        expect(screen.getByText(DEV_UPSELL_SUCCESS_BUTTON)).toBeInTheDocument()
        expect(screen.getByText(DEV_UPSELL_FAILED_BUTTON)).toBeInTheDocument()
        expect(
            screen.getByText(DEV_UPSELL_CANCELLED_BUTTON)
        ).toBeInTheDocument()
        expect(
            screen.getByText(DEV_UPSELL_ALREADY_PURCHASED_BUTTON)
        ).toBeInTheDocument()
    })

    it("should handle subscription options without overrideSku", () => {
        const optionsWithoutSku = {
            eventCategory: UpsellEventSubCategory.IMMEDIATE_PRE_ROLL,
        }

        render(
            <DevUpsellModal
                isOpen
                subscribeOptions={optionsWithoutSku}
                onResult={mockOnResult}
            />
        )

        expect(
            screen.getByText(/"eventCategory": "immediate pre roll"/)
        ).toBeInTheDocument()
        expect(screen.queryByText(/"overrideSku"/)).not.toBeInTheDocument()
    })

    it("should have proper modal styling and structure", () => {
        const { container } = render(
            <DevUpsellModal
                isOpen
                subscribeOptions={mockSubscribeOptions}
                onResult={mockOnResult}
            />
        )

        const overlay = container.firstChild as HTMLElement
        expect(overlay).toHaveStyle({
            position: "fixed",
            "background-color": "rgba(0,0,0,0.8)",
            "z-index": "9999",
        })

        const modalContent = overlay.firstChild as HTMLElement
        expect(modalContent).toHaveStyle({
            "background-color": "white",
            padding: "20px",
            "border-radius": "8px",
        })
    })
})
