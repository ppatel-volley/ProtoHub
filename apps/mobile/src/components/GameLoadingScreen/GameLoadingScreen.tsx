import { LoadingSpinner } from "../LoadingSpinner"
import styles from "./GameLoadingScreen.module.scss"

export const GameLoadingScreen: React.FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.background} />
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}>
                    <LoadingSpinner />
                </div>
            </div>
        </div>
    )
}
