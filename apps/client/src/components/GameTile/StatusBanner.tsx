import React from "react"

import { BASE_URL } from "../../config/envconfig"
import type { Game } from "../../hooks/useGames"
import { FallbackImage } from "../FallbackImage"
import styles from "./GameTile.module.scss"

type StatusValue = NonNullable<Game["status"]>

interface StatusBannerProps {
    status: StatusValue
}

const getImagePath = (status: StatusValue): string => {
    const imageMap: Record<StatusValue, string> = {
        "coming-soon": "coming-soon.avif",
        "beta": "beta.avif",
        "new": "new.avif",
    }
    return `${BASE_URL}assets/images/ui/tags/${imageMap[status]}`
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
    return (
        <div className={`${styles.statusTag} ${styles[status]}`}>
            <FallbackImage
                src={getImagePath(status)}
                alt={`${status} status`}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                }}
            />
        </div>
    )
}
