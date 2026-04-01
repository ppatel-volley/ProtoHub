import { useSyncExternalStore } from "react"

import { getActiveBrand, subscribeToBrand } from "../../../config/branding"
import { BASE_URL } from "../../../config/envconfig"
import { useAsset } from "../../../hooks/useAsset"
import { useCopy } from "../../../hooks/useCopy"
import { FallbackImage } from "../../FallbackImage"
import styles from "./BrandLogo.module.scss"

export const BrandLogo: React.FC<{ className?: string }> = ({ className }) => {
    const logo = useAsset("logo")
    const logoAlt = useCopy("logoAlt")
    const brand = useSyncExternalStore(
        subscribeToBrand,
        getActiveBrand,
        getActiveBrand
    )

    return (
        <div
            className={`${styles.logoContainer} ${className ?? ""}`}
            data-brand={brand}
        >
            <FallbackImage src={`${BASE_URL}${logo}`} alt={logoAlt} />
        </div>
    )
}
