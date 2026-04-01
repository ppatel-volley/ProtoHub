import React from "react"

import { ROOM_CODE_LENGTH } from "../../../../constants"
import { useBranding } from "../../../../hooks/useBranding"
import Button from "../Button/Button"
import { ErrorMessage } from "../ErrorMessage/ErrorMessage"
import { HelperText } from "../HelperText/HelperText"
import { Input } from "../Input/Input"
import { InputLabel } from "../InputLabel/InputLabel"
import styles from "../RoomCodeEntry.module.css"

interface Props {
    roomCode: string | null | undefined
    onRoomCodeChange: (roomCode: string) => void
    onSubmit: () => void
    error: string | null
    isSubmitEnabled: boolean
}

export const JoinRoomForm = ({
    roomCode,
    onRoomCodeChange,
    onSubmit,
    error,
    isSubmitEnabled,
}: Props): React.ReactElement => {
    const { weekendRebrandActive } = useBranding()
    const handleRoomCodeChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ): void => {
        const newRoomCode = event.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .slice(0, ROOM_CODE_LENGTH)
            .toUpperCase()
        onRoomCodeChange(newRoomCode)
    }

    return (
        <div className={styles.formSection}>
            <div className={styles.labelAndInput}>
                <InputLabel text="Room Code" className={styles.label} />
                <Input
                    text={roomCode?.toUpperCase()}
                    maxLength={ROOM_CODE_LENGTH}
                    error={!!error}
                    placeholder="____"
                    onChange={handleRoomCodeChange}
                    inputMode="text"
                />
                <HelperText
                    text={
                        weekendRebrandActive
                            ? "Shown in Weekend Hub on TV"
                            : "Shown in Volley Hub on TV"
                    }
                />
                {error && (
                    <ErrorMessage
                        text={error}
                        className={styles.errorMessage}
                    />
                )}
            </div>
            <Button
                disabled={!isSubmitEnabled}
                onClick={onSubmit}
                className={styles.joinButton}
            />
        </div>
    )
}
