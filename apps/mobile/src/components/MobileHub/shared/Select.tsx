import React, { type SelectHTMLAttributes } from "react"

import styles from "./Select.module.css"

interface SelectOption {
    value: string
    label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options: SelectOption[]
    className?: string
}

export const Select = ({
    options,
    className,
    ...selectProps
}: SelectProps): React.ReactElement => {
    return (
        <div className={styles.selectWrapper}>
            <select
                {...selectProps}
                className={`${styles.select} ${className || ""}`}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}
