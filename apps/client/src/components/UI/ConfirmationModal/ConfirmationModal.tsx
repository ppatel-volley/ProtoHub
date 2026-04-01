import { type JSX, useEffect, useState } from "react"
import Modal from "react-modal"

import { FocusableContainer } from "../../FocusableUI/FocusableContainer"
import { RiveButton } from "../RiveButton"
import styles from "./ConfirmationModal.module.scss"

export interface ConfirmationButton {
    title: string
    onClick: () => void
    focusKey: string
    isPrimary?: boolean
}

export interface ConfirmationModalProps {
    isOpen: boolean
    message: string
    customContent?: React.ReactNode
    buttons: ConfirmationButton[]
    defaultFocusKey?: string
    onRequestClose?: () => void
    containerId?: string
}

export const CONFIRMATION_MODAL_YES_TEXT = "Yes"
export const CONFIRMATION_MODAL_NO_TEXT = "No"
export const CONFIRMATION_MODAL_OK_TEXT = "OK"
export const CONFIRMATION_MODAL_DEFAULT_MESSAGE = "Are you sure?"

export const ConfirmationModal = ({
    isOpen,
    message,
    customContent,
    buttons,
    defaultFocusKey,
    onRequestClose,
    containerId = "confirmation-modal-container",
}: ConfirmationModalProps): JSX.Element => {
    const [contentReady, setContentReady] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setContentReady(false)
        }
    }, [isOpen])

    const handleAfterOpen = (): void => {
        requestAnimationFrame(() => {
            setContentReady(true)
        })
    }

    const handleRequestClose = (): void => {
        setContentReady(false)
        onRequestClose?.()
    }

    return (
        <Modal
            isOpen={isOpen}
            onAfterOpen={handleAfterOpen}
            onRequestClose={handleRequestClose}
            className={styles.modal}
            overlayClassName={styles.overlay}
            shouldCloseOnOverlayClick={false}
            shouldCloseOnEsc={false}
            ariaHideApp={false}
        >
            <FocusableContainer
                className={styles.content}
                focusable
                autoFocus
                saveLastFocusedChild={false}
                defaultFocusKey={defaultFocusKey || buttons[0]?.focusKey}
                containerId={containerId}
            >
                {customContent ? (
                    <div className={styles.message}>{customContent}</div>
                ) : (
                    <p className={styles.message}>{message}</p>
                )}

                <div className={`${styles.buttons} ${styles.fallbackMode}`}>
                    {buttons.map((button) => (
                        <RiveButton
                            key={button.focusKey}
                            title={button.title}
                            onClick={button.onClick}
                            focusKey={button.focusKey}
                            autoFocus={button.isPrimary ? contentReady : false}
                        />
                    ))}
                </div>
            </FocusableContainer>
        </Modal>
    )
}
