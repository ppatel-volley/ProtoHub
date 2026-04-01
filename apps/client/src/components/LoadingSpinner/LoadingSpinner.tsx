import { BASE_URL } from "../../config/envconfig"
import { FallbackImage } from "../FallbackImage"
import styles from "./LoadingSpinner.module.scss"

export const LoadingSpinner: React.FC = () => {
    return (
        <div className={styles.spinnerContainer}>
            <FallbackImage
                src={`${BASE_URL}assets/images/ui/spinner.avif`}
                alt="Loading Spinner"
                className={styles.spinner}
            />
        </div>
    )
}
