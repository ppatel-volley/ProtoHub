import { type JSX, useEffect, useState } from "react"
import Modal from "react-modal"

import { WEEKEND_TRANSITION_LOGO_PATH } from "../../config/branding"
import { BASE_URL } from "../../config/envconfig"
import { FocusableContainer } from "../FocusableUI/FocusableContainer"
import { RiveButton } from "../UI/RiveButton"
import styles from "./WeekendRebrandModal.module.scss"

interface WeekendRebrandModalProps {
    isOpen: boolean
    onAcknowledge: () => void
}

export const WEEKEND_REBRAND_MODAL_HEADING = "Volley is becoming"
export const WEEKEND_REBRAND_MODAL_BODY =
    "You'll start seeing Weekend across the app and our website over the next couple of weeks. Everything you love stays the same—just a new name and look."
export const WEEKEND_REBRAND_MODAL_BUTTON_TEXT = "Got it"

export const WeekendRebrandModal = ({
    isOpen,
    onAcknowledge,
}: WeekendRebrandModalProps): JSX.Element => {
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

    return (
        <Modal
            isOpen={isOpen}
            onAfterOpen={handleAfterOpen}
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
                defaultFocusKey="weekend-rebrand-acknowledge"
                containerId="weekend-rebrand-modal-container"
            >
                <div className={styles.headingContainer}>
                    <span className={styles.heading}>
                        {WEEKEND_REBRAND_MODAL_HEADING}
                    </span>
                    <img
                        src={`${BASE_URL}${WEEKEND_TRANSITION_LOGO_PATH}`}
                        alt="Weekend"
                        className={styles.weekendLogo}
                    />
                </div>

                <p className={styles.body}>{WEEKEND_REBRAND_MODAL_BODY}</p>

                <div className={styles.buttonContainer}>
                    <RiveButton
                        title={WEEKEND_REBRAND_MODAL_BUTTON_TEXT}
                        onClick={onAcknowledge}
                        focusKey="weekend-rebrand-acknowledge"
                        autoFocus={contentReady}
                    />
                </div>
            </FocusableContainer>
        </Modal>
    )
}
