import { navigateToPermissionSettings } from "@volley/platform-sdk/lib"
import { useHapticFeedback } from "@volley/platform-sdk/react"
import { type JSX } from "react"
import Modal from "react-modal"

import styles from "./MicrophonePermissionModal.module.scss"

interface MicrophonePermissionModalProps {
    isOpen: boolean
    onClose: (state: "prompt" | "denied") => void
}

export const MicrophonePermissionModal = ({
    isOpen,
    onClose,
}: MicrophonePermissionModalProps): JSX.Element => {
    const onOpenSettings = (): void => {
        void navigateToPermissionSettings()
        onClose("prompt")
    }

    const haptics = useHapticFeedback()

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={() => onClose("denied")}
            onAfterOpen={() => {
                void haptics.trigger("heavy")
            }}
            className={styles.modal}
            overlayClassName={styles.overlay}
            shouldCloseOnOverlayClick
            shouldCloseOnEsc
            ariaHideApp={false}
        >
            <div className={styles.content}>
                <h2 className={styles.title}>Microphone Permission Required</h2>
                <p className={styles.message}>
                    Please enable microphone permissions in settings to use mic.
                </p>
                <div className={styles.buttonContainer}>
                    <button
                        className={styles.dismissButton}
                        onClick={() => onClose("denied")}
                    >
                        Dismiss
                    </button>
                    <button
                        className={styles.closeButton}
                        onClick={onOpenSettings}
                    >
                        Open Settings
                    </button>
                </div>
            </div>
        </Modal>
    )
}
