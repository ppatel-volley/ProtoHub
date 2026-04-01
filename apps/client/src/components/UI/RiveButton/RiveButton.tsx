import {
    setFocus,
    useFocusable,
} from "@noriginmedia/norigin-spatial-navigation"
import { useRive, useStateMachineInput } from "@rive-app/react-canvas"
import cn from "classnames"
import React, { type JSX, useCallback, useEffect } from "react"

import { BASE_URL } from "../../../config/envconfig"
import { logger } from "../../../utils/logger"
import styles from "./RiveButton.module.scss"

interface CoreRiveInstance {
    setTextRunValue?: (textRunName: string, textValue: string) => void
    getTextRunValue?: (textRunName: string) => string | undefined
}

/**
 * Safely calls setTextRunValue on a rive instance
 * @param riveInstance - The rive instance from useRive hook
 * @param textRunName - Name of the text run in the artboard
 * @param textValue - The text value to set
 */
function setRiveTextSafely(
    riveInstance: unknown,
    textRunName: string,
    textValue: string
): void {
    const coreRive = riveInstance as CoreRiveInstance

    if (coreRive?.setTextRunValue) {
        try {
            coreRive.setTextRunValue(textRunName, textValue)
        } catch (error) {
            logger.warn(`Failed to set text run "${textRunName}"`, {
                textRunName,
                error,
            })
        }
    }
}

interface RiveButtonProps {
    title: string
    onClick: () => void
    focusKey: string
    autoFocus?: boolean
    width?: string | number
    style?: React.CSSProperties
}

export const RiveButton = ({
    title,
    onClick,
    focusKey,
    autoFocus,
    width,
    style,
}: RiveButtonProps): JSX.Element => {
    const { ref, focused, focusSelf } = useFocusable({
        focusKey,
        onEnterPress: onClick,
    })

    const handleMouseEnter = useCallback(() => {
        setFocus(focusKey)
    }, [focusKey])

    const { RiveComponent, rive } = useRive({
        src: `${BASE_URL}assets/animations/ui_components.riv`,
        artboard: "Button",
        stateMachines: ["MainStateMachine"],
        autoplay: true,
    })

    const stateInput = useStateMachineInput(
        rive,
        "MainStateMachine",
        "State",
        0
    )

    useEffect(() => {
        if (autoFocus) {
            requestAnimationFrame(() => {
                focusSelf()
            })
        }
    }, [autoFocus, focusSelf])

    useEffect(() => {
        if (stateInput) {
            stateInput.value = focused ? 1 : 0
        }
    }, [stateInput, focused])

    useEffect(() => {
        if (rive) {
            setRiveTextSafely(rive, "ButtonTitle", title)
        }
    }, [rive, title])

    if (!rive) {
        return (
            <button
                ref={ref}
                onClick={onClick}
                onMouseEnter={handleMouseEnter}
                className={cn(styles.fallbackButton, focused && styles.focused)}
                style={{
                    ...(width && { width }),
                    ...(style?.minWidth && { minWidth: style.minWidth }),
                    ...(style?.padding && { padding: style.padding }),
                    ...style,
                }}
            >
                {title}
            </button>
        )
    }

    return (
        <div
            ref={ref}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            className={styles.buttonContainer}
            style={{
                ...(width && { width }),
                ...(style?.minWidth && { minWidth: style.minWidth }),
                ...(style?.padding && { padding: style.padding }),
                ...style,
            }}
            role="button"
            tabIndex={0}
        >
            <RiveComponent />
        </div>
    )
}
