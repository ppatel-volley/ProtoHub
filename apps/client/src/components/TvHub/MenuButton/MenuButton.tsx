import { useFocusable } from "@noriginmedia/norigin-spatial-navigation"
import { combineStyles } from "@volley/vgf/util"
import { type JSX, useEffect } from "react"

import styles from "./MenuButton.module.scss"

type MenuButtonProps = {
    text: string
    onClick: () => void
    autoFocus?: boolean
}

export const MenuButton = ({
    text,
    onClick,
    autoFocus,
}: MenuButtonProps): JSX.Element => {
    const { ref, focused, focusSelf } = useFocusable({
        onEnterPress: onClick,
        forceFocus: true,
    })

    useEffect(() => {
        if (autoFocus) {
            focusSelf()
        }
    }, [autoFocus, focusSelf])

    return (
        <button
            ref={ref}
            className={combineStyles(styles.button, focused && styles.focused)}
            onClick={onClick}
        >
            {text}
        </button>
    )
}
