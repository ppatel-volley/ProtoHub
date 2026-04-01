import { useHapticFeedback, useMicrophone } from "@volley/platform-sdk/react"
import { type ReactElement, useEffect, useState } from "react"
import type { StateMachineInput } from "rive-react"
import { useRive, useStateMachineInput } from "rive-react"

import backgroundAnimation from "../shared/assets/faceoff-shapes.json"
import { Background } from "../shared/Background/Background"
import styles from "./DemoController.module.scss"
import { MicrophonePermissionModal } from "./MicrophonePermissionModal"

function getAssetPath(subPath: string): string {
    return `https://volley-assets-public.s3.amazonaws.com/tv/web-remote/staging/${subPath}`
}

export default function DemoController(): ReactElement {
    const [micPermissionStatus, setMicPermissionStatus] = useState<
        "granted" | "denied" | "prompt"
    >("prompt")
    const [isModalOpen, setIsModalOpen] = useState(false)

    const MAIN_STATE_MACHINE = "Main"

    const mic = useMicrophone()
    const haptics = useHapticFeedback()

    const { rive, RiveComponent } = useRive({
        src: `${getAssetPath("wof.riv")}`,
        artboard: "buzzer-blue",
        stateMachines: [MAIN_STATE_MACHINE],
        autoplay: true,
    })

    const pressingStateMachineInput = useStateMachineInput(
        rive,
        MAIN_STATE_MACHINE,
        "Pressing"
    ) as StateMachineInput

    const onPressBuzzer = (): void => {
        if (micPermissionStatus !== "granted") {
            setIsModalOpen(true)
            return
        }

        void haptics.trigger("medium")

        void mic
            .startRecording(() => {})
            .then(() => {
                setMicPermissionStatus("granted")
            })
            .catch((error) => {
                const errorObj = error as { name?: string; message?: string }

                if (
                    errorObj.name === "NotAllowedError" ||
                    errorObj.message === "Permission denied"
                ) {
                    setMicPermissionStatus("denied")
                }
            })
    }

    const onUnpressBuzzer = (): void => {
        if (micPermissionStatus !== "granted") {
            return
        }

        void mic.stopRecording()
        void haptics.trigger("medium")
        pressingStateMachineInput.value = false
    }

    const handleCloseModal = (state: "prompt" | "denied"): void => {
        setMicPermissionStatus(state)
        setIsModalOpen(false)
    }

    useEffect(() => {
        void mic
            .checkPermissions()
            .then((value) => {
                if (value === "prompt") {
                    void mic.requestPermissions().then((value) => {
                        setMicPermissionStatus(value)
                    })
                    return
                }

                if (value === "denied") {
                    setMicPermissionStatus(value)
                    setIsModalOpen(true)
                    return
                }
            })
            .catch(() => {
                setMicPermissionStatus("denied")
                setIsModalOpen(true)
            })
    }, [mic])

    useEffect(() => {
        if (micPermissionStatus === "denied") {
            void haptics.trigger("heavy")
        }
    }, [micPermissionStatus, haptics])

    return (
        <Background animationData={backgroundAnimation}>
            <div className={styles.controllerContainer}>
                <div className={styles.header}>
                    <img src={getAssetPath("volley-logo.svg")} alt="Volley" />
                </div>
                <div className={styles.buzzerContainer}>
                    <RiveComponent
                        onMouseDown={onPressBuzzer}
                        onTouchStart={onPressBuzzer}
                        onMouseUp={onUnpressBuzzer}
                        onTouchEnd={onUnpressBuzzer}
                        className={styles.buzzer}
                    />
                </div>
                <MicrophonePermissionModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                />
            </div>
        </Background>
    )
}
