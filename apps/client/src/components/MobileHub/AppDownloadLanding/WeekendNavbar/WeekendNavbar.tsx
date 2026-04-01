import React from "react"

import weekendLogo from "./weekend-logo.svg"
import styles from "./WeekendNavbar.module.css"

export const WeekendNavbar: React.FC = () => {
    return (
        <div className={styles.navbar}>
            <img src={weekendLogo} alt="Weekend" className={styles.logo} />
        </div>
    )
}
