import styles from "./CssSpinner.module.scss"

interface CssSpinnerProps {
    width?: string
    height?: string
}

export const CssSpinner: React.FC<CssSpinnerProps> = ({
    width = "25%",
    height = "45%",
}) => {
    return (
        <div
            style={{
                width,
                height,
                minWidth: width,
                minHeight: height,
            }}
            className={styles.spinnerContainer}
            data-testid="spinner-container"
        >
            <svg className={styles.spinner} viewBox="0 0 100 100">
                <circle
                    className={styles.spinnerArc}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#FFEC37"
                    strokeWidth="12"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    )
}
