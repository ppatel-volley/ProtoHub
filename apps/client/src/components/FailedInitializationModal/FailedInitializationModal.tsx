import { useSupport } from "@volley/platform-sdk/react"
import { type JSX } from "react"

import { useBranding } from "../../hooks/useBranding"
import { useCopy } from "../../hooks/useCopy"
import { FailureModal } from "../UI/FailureModal"

interface FailedInitializationModalProps {
    isOpen: boolean
    onExit: () => void
    errorMessage: string
}

export const FAILED_INITIALIZATION_TITLE = "Hmm, something went wrong."

export const FailedInitializationModal = ({
    isOpen,
    onExit,
    errorMessage,
}: FailedInitializationModalProps): JSX.Element => {
    const { weekendRebrandActive } = useBranding()
    const supportEmail = useSupport().getSupportEmail(weekendRebrandActive)
    const errorInstructions = useCopy("errorInstructions")

    return (
        <FailureModal
            isOpen={isOpen}
            onExit={onExit}
            title={FAILED_INITIALIZATION_TITLE}
            instructions={errorInstructions}
            email={supportEmail}
            errorMessage={errorMessage}
            containerId="failed-initialization-modal-container"
        />
    )
}
