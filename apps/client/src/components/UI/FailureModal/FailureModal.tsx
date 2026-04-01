import { type JSX } from "react"

import {
    type ConfirmationButton,
    ConfirmationModal,
} from "../ConfirmationModal"
import styles from "./FailureModal.module.scss"

interface FailureModalProps {
    isOpen: boolean
    onExit: () => void
    title: string
    instructions: string
    email?: string
    errorMessage?: string
    containerId: string
}

export const FAILURE_MODAL_EXIT_BUTTON_TEXT = "Exit"

export const FailureModal = ({
    isOpen,
    onExit,
    title,
    instructions,
    email,
    errorMessage,
    containerId,
}: FailureModalProps): JSX.Element => {
    const renderInstructions = (): JSX.Element => {
        if (email) {
            return (
                <div className={styles.instructions}>
                    {instructions} <span className={styles.email}>{email}</span>
                    .
                </div>
            )
        }
        return <div className={styles.instructions}>{instructions}</div>
    }

    const customContent = (
        <>
            <div className={styles.title}>{title}</div>
            {renderInstructions()}
            {errorMessage && (
                <div className={styles.errorDetails}>Error: {errorMessage}</div>
            )}
        </>
    )

    const buttons: ConfirmationButton[] = [
        {
            title: FAILURE_MODAL_EXIT_BUTTON_TEXT,
            onClick: onExit,
            focusKey: "exit-button",
            isPrimary: true,
        },
    ]

    return (
        <ConfirmationModal
            isOpen={isOpen}
            message=""
            customContent={customContent}
            buttons={buttons}
            defaultFocusKey="exit-button"
            containerId={containerId}
        />
    )
}
