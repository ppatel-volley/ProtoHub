import { type JSX } from "react"

import { getCopy, isWeekendRebrandActive } from "../../../config/branding"
import { FailureModal } from "../../UI/FailureModal"

interface InvalidPlatformModalProps {
    isOpen: boolean
    onExit: () => void
    errorMessage: string
}

export const FAILED_INITIALIZATION_TITLE = "Hmm, something went wrong."

export const InvalidPlatformModal = ({
    isOpen,
    onExit,
    errorMessage,
}: InvalidPlatformModalProps): JSX.Element => {
    // Renders outside PlatformProvider in main.tsx, so cannot use useSupport() or useCopy() hooks
    // Instead we check the preauth flag directly
    const supportEmail = isWeekendRebrandActive()
        ? "support@weekend.com"
        : "support@volley.tv"
    const errorInstructions = getCopy("errorInstructions")

    return (
        <FailureModal
            isOpen={isOpen}
            onExit={onExit}
            title={FAILED_INITIALIZATION_TITLE}
            instructions={errorInstructions}
            email={supportEmail}
            errorMessage={errorMessage}
            containerId="invalid-platform-modal-container"
        />
    )
}
