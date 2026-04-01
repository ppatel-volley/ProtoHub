import React, { useEffect, useState } from "react"

import {
    getImageWithFallbackSync,
    isFormatDetectionReady,
    waitForFormatDetection,
} from "../../utils/imageFormatFallback"

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string
    alt: string
}

/**
 * Image component that automatically falls back from AVIF to WebP for older browsers
 * Chromium 68 (Samsung TV) doesn't support AVIF but supports WebP
 */
export const FallbackImage: React.FC<FallbackImageProps> = ({
    src,
    alt,
    ...props
}) => {
    const [isFormatReady, setIsFormatReady] = useState(isFormatDetectionReady())

    useEffect(() => {
        if (!isFormatReady) {
            void waitForFormatDetection().then(() => {
                setIsFormatReady(true)
            })
        }
    }, [isFormatReady])

    if (!isFormatReady) {
        const { alt: _, ...divProps } = { alt, ...props }
        return (
            <div
                {...divProps}
                style={{ ...props.style, visibility: "hidden" }}
            />
        )
    }

    const fallbackSrc = getImageWithFallbackSync(src)

    return <img {...props} src={fallbackSrc} alt={alt} />
}
