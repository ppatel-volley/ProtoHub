import React from "react"

import { BASE_URL } from "../../config/envconfig"
import { GameStatus } from "../../constants/game"
import { FallbackImage } from "../FallbackImage"
import styles from "./GameTile.module.scss"

interface StatusBannerProps {
    status: GameStatus
}

const getImagePath = (status: GameStatus): string => {
    const imageMap: Record<GameStatus, string> = {
        [GameStatus.ComingSoon]: "coming-soon.avif",
        [GameStatus.Beta]: "beta.avif",
        [GameStatus.New]: "new.avif",
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
