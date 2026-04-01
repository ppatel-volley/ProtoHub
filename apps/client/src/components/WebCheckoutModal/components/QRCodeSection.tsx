import React from "react"

import { BASE_URL } from "../../../config/envconfig"
import { logger } from "../../../utils/logger"
import { FallbackImage } from "../../FallbackImage"
import { PaymentSuccessIndicator } from "../../PaymentSuccessIndicator/PaymentSuccessIndicator"
import { QrWithPlaceholder } from "../../QrWithPlaceholder/QrWithPlaceholder"
import styles from "../WebCheckoutModal.module.scss"
import { PaymentState } from "../webCheckoutModalConstants"

interface QRCodeSectionProps {
    paymentState: PaymentState
    isDeviceAuthLoading: boolean
    userCode: string | undefined
    verificationUri: string | undefined
    qrWrapperClasses: string | undefined
    onQrRendered?: () => void
    onSuccessComplete: () => void
}

export const QRCodeSection: React.FC<QRCodeSectionProps> = ({
    paymentState,
    isDeviceAuthLoading,
    userCode,
    verificationUri,
    qrWrapperClasses,
    onQrRendered,
    onSuccessComplete,
}) => {
    const isPaymentSuccess = paymentState === PaymentState.PAYMENT_SUCCESS

    let activationUrl = ""
    let qrUrl = ""

    if (verificationUri) {
        try {
            activationUrl = new URL(verificationUri).hostname
            qrUrl = `${verificationUri}/?pairing=${userCode}`
        } catch (error) {
            logger.error("Invalid verification URI", error, {
                verificationUri,
            })
            // If verificationUri is malformed, use it as-is for display
            activationUrl = verificationUri
        }
    }

    return (
        <div className={styles.qrSectionContainer}>
            <div className={styles.qrSection}>
                <div
                    className={`${styles.rim} ${
                        isPaymentSuccess ? styles.rimSuccess : ""
                    }`}
                >
                    <div className={styles.qrCodeBox}>
                        <div className={qrWrapperClasses}>
                            {isDeviceAuthLoading ? (
                                <div className={styles.refreshingCode}>
                                    <div className={styles.refreshingSpinner} />
                                </div>
                            ) : userCode ? (
                                <QrWithPlaceholder
                                    url={qrUrl}
                                    onQrRendered={onQrRendered}
                                />
                            ) : (
                                <div className={styles.refreshingCode}>
                                    <div className={styles.refreshingSpinner} />
                                </div>
                            )}
                        </div>

                        {isPaymentSuccess && (
                            <PaymentSuccessIndicator
                                isVisible
                                onAnimationComplete={onSuccessComplete}
                            />
                        )}
                    </div>
                </div>
                <div>
                    <div className={styles.scanIndicatorAnimationContainer}>
                        <FallbackImage
                            src={`${BASE_URL}assets/images/ui/scan-indicator.avif`}
                            alt="Scan Indicator"
                            className={styles.scanIndicator}
                        />
                    </div>
                    <div className={styles.activationText}>
                        Or go to{" "}
                        <span className={styles.highlight}>
                            {activationUrl}
                        </span>{" "}
                        <br />
                        <br />
                        and enter this code{" "}
                        <span className={styles.highlight}>
                            {isDeviceAuthLoading
                                ? "------"
                                : userCode || "------"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
