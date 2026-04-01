import cn from "classnames"
import React from "react"

import styles from "./Input.module.css"

type InputProps = {
    text: string | undefined
    placeholder: string
    maxLength?: number
    error?: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    className?: string
    autocomplete?: string
    inputMode?: "text" | "numeric"
}

export const Input = ({
    text = "",
    placeholder,
    maxLength,
    error,
    onChange,
    onKeyDown,
    className,
    autocomplete,
    inputMode,
}: InputProps): React.ReactElement => {
    return (
        <input
            value={text}
            maxLength={maxLength}
            inputMode={inputMode ?? "text"}
            type="text"
            autoComplete={autocomplete ?? "off"}
            className={cn(styles.input, error && styles.error, className)}
            placeholder={placeholder}
            onChange={onChange}
            onKeyDown={onKeyDown}
        />
    )
}
