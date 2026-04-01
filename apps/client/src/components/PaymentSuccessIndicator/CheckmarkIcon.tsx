import React from "react"

import { BASE_URL } from "../../config/envconfig"

interface CheckmarkIconProps {
    size?: number
}

export const CheckmarkIcon: React.FC<CheckmarkIconProps> = () => {
    return (
        <img
            src={`${BASE_URL}assets/images/Check.svg`}
            alt="Payment successful checkmark"
            width="100%"
            height="100%"
            style={{ display: "block" }}
        />
    )
}
