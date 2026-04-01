import { useAppLifecycle } from "@volley/platform-sdk/react"
import { useCallback, useEffect, useState } from "react"

import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"

/** Fatal initialization failure with type, trigger, and optional original error for logging. */
export interface InitializationError {
    type:
        | "DEVICE_AUTH_ERROR"
        | "PLATFORM_ERROR"
        | "TEST_ERROR"
        | "ANONYMOUS_ID_ERROR"
    message: string
    trigger:
        | "device_auth_error"
        | "platform_error"
        | "dev_override"
        | "experiment_identity_error"
    context: string
    originalError?: unknown
}

interface UseFailedInitializationModalReturn {
    showFailedInitModal: boolean
    errorMessage: string
    handleExit: () => void
}

/** Shows modal when initialization fails, logs to Datadog, and provides exit handler that closes the app. */
export const useFailedInitializationModal = (
    initializationError?: InitializationError | null
): UseFailedInitializationModalReturn => {
    const { exitApp } = useAppLifecycle()
    const [showFailedInitModal, setShowFailedInitModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>("")

    useEffect(() => {
        if (initializationError) {
            logger.error(
                `Initialization failed (${initializationError.trigger}):`,
                initializationError.originalError,
                {
                    context: initializationError.context,
                    errorType: initializationError.type,
                }
            )

            setErrorMessage(initializationError.type)
            setShowFailedInitModal(true)

            safeDatadogRum.addAction("failed_initialization_modal_displayed", {
                trigger: initializationError.trigger,
                errorMessage: initializationError.message,
                errorType: initializationError.type,
            })
        } else {
            setShowFailedInitModal(false)
            setErrorMessage("")
        }
    }, [initializationError])

    const handleExit = useCallback(() => {
        logger.info("User requested exit after failed initialization")

        safeDatadogRum.addAction("failed_initialization_exit_requested")

        setShowFailedInitModal(false)
        setErrorMessage("")
        void exitApp()
    }, [exitApp])

    return {
        showFailedInitModal,
        errorMessage,
        handleExit,
    }
}
