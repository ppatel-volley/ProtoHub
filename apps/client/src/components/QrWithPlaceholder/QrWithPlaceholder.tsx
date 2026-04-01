import React, { useEffect, useRef, useState } from "react"

import { logger } from "../../utils/logger"
import styles from "./QrWithPlaceholder.module.scss"
import { QR_CODE_API_BASE } from "./urlShortener"

async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = (): void => resolve(img)
        img.onerror = (): void => reject(new Error("Failed to load image"))
        img.src = url
    })
}

export const QrWithPlaceholder = ({
    url,
    onQrRendered,
}: {
    url: string
    onQrRendered?: () => void
}): React.JSX.Element => {
    const [img, setImg] = useState<null | HTMLImageElement>(null)
    const qrImageUrl = `${QR_CODE_API_BASE}api/v1/qr?url=${encodeURIComponent(url)}`
    const onQrRenderedRef = useRef(onQrRendered)
    const lastNotifiedImgSrcRef = useRef<string | null>(null)

    useEffect(() => {
        onQrRenderedRef.current = onQrRendered
    }, [onQrRendered])

    useEffect(() => {
        const loadImageWithRetry = async (
            url: string,
            retries: number = 3,
            delay: number = 1000
        ): Promise<void> => {
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const img = await loadImage(url)
                    setImg(img)
                    return
                } catch (error) {
                    if (attempt === retries) {
                        logger.error(
                            "QR Load failed after maximum retries",
                            error
                        )
                        window.location.reload()
                        return
                    }

                    const waitTime = delay + attempt * 1000
                    logger.warn(
                        `${qrImageUrl} Load failed, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`
                    )
                    await new Promise((resolve) =>
                        setTimeout(resolve, waitTime)
                    )
                }
            }
        }

        void loadImageWithRetry(qrImageUrl)
    }, [qrImageUrl, url])

    useEffect(() => {
        if (!img || !onQrRenderedRef.current) return

        const isNewImage = img.src !== lastNotifiedImgSrcRef.current
        if (isNewImage) {
            lastNotifiedImgSrcRef.current = img.src
            onQrRenderedRef.current()
        }
    }, [img])

    return (
        <div className={styles.root}>
            <div className={`${styles.qr} ${styles.fakeQr}`} />
            {img !== null && (
                <div
                    className={styles.qr}
                    style={{
                        backgroundImage: `url(${img.src})`,
                    }}
                />
            )}
        </div>
    )
}
