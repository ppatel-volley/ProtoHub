import { type JSX } from "react"

import {
    type ConfirmationButton,
    ConfirmationModal,
} from "../UI/ConfirmationModal"

interface ExitConfirmationModalProps {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
}

export const EXIT_CONFIRMATION_MESSAGE = "Are you sure you want to exit?"
export const EXIT_CONFIRMATION_YES_TEXT = "Yes"
export const EXIT_CONFIRMATION_NO_TEXT = "No"

export const ExitConfirmationModal = ({
    isOpen,
    onConfirm,
    onCancel,
}: ExitConfirmationModalProps): JSX.Element => {
    const buttons: ConfirmationButton[] = [
        {
            title: EXIT_CONFIRMATION_YES_TEXT,
            onClick: onConfirm,
            focusKey: "confirm-button",
        },
        {
            title: EXIT_CONFIRMATION_NO_TEXT,
            onClick: onCancel,
            focusKey: "cancel-button",
            isPrimary: true,
        },
    ]

    return (
        <ConfirmationModal
            isOpen={isOpen}
            message={EXIT_CONFIRMATION_MESSAGE}
            buttons={buttons}
            defaultFocusKey="cancel-button"
            onRequestClose={onCancel}
            containerId="exit-confirmation-modal-container"
        />
    )
}
