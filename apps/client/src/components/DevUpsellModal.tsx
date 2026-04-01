import type { SubscribeOptions } from "@volley/platform-sdk/lib"
import { SubscriptionFlowResult } from "@volley/platform-sdk/lib"
import React from "react"

interface DevUpsellModalProps {
    isOpen: boolean
    subscribeOptions: SubscribeOptions
    onResult: (result: SubscriptionFlowResult) => void
}

export const DEV_UPSELL_TITLE = "🧪 Dev Upsell Simulator"
export const DEV_UPSELL_SUBSCRIPTION_REQUEST_TITLE = "Subscription Request"
export const DEV_UPSELL_SUBSCRIPTION_RESPONSE_TITLE = "Subscription Response"
export const DEV_UPSELL_SUCCESS_BUTTON = "✅ Success"
export const DEV_UPSELL_FAILED_BUTTON = "❌ Failed"
export const DEV_UPSELL_CANCELLED_BUTTON = "🚫 Cancelled"
export const DEV_UPSELL_ALREADY_PURCHASED_BUTTON = "💳 Already Purchased"

export const DevUpsellModal: React.FC<DevUpsellModalProps> = ({
    isOpen,
    subscribeOptions,
    onResult,
}) => {
    if (!isOpen) return null

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    maxWidth: "500px",
                    width: "90%",
                }}
            >
                <h2 style={{ marginTop: 0 }}>{DEV_UPSELL_TITLE}</h2>
                <p>
                    This simulator is only for the web. Its purpose is to
                    simulate the time delay caused by the upsell flow, and to
                    give you an easy way to test functionality downstream of the
                    upsell response.
                </p>

                <div>
                    <h3>{DEV_UPSELL_SUBSCRIPTION_REQUEST_TITLE}</h3>
                    <pre
                        style={{
                            fontSize: "12px",
                            backgroundColor: "#f5f5f5",
                            padding: "10px",
                        }}
                    >
                        {JSON.stringify(subscribeOptions, null, 2)}
                    </pre>
                </div>

                <h3>{DEV_UPSELL_SUBSCRIPTION_RESPONSE_TITLE}</h3>
                <div
                    style={{
                        marginTop: "20px",
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                    }}
                >
                    <button
                        onClick={() =>
                            onResult(SubscriptionFlowResult.Successful)
                        }
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                        }}
                    >
                        {DEV_UPSELL_SUCCESS_BUTTON}
                    </button>
                    <button
                        onClick={() => onResult(SubscriptionFlowResult.Failed)}
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                        }}
                    >
                        {DEV_UPSELL_FAILED_BUTTON}
                    </button>
                    <button
                        onClick={() => onResult(SubscriptionFlowResult.Failed)}
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#ff9800",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                        }}
                    >
                        {DEV_UPSELL_CANCELLED_BUTTON}
                    </button>
                    <button
                        onClick={() =>
                            onResult(SubscriptionFlowResult.AlreadyPurchased)
                        }
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#2196F3",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                        }}
                    >
                        {DEV_UPSELL_ALREADY_PURCHASED_BUTTON}
                    </button>
                </div>
            </div>
        </div>
    )
}
