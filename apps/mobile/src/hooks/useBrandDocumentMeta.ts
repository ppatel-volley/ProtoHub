import { useEffect } from "react"

import { getAsset } from "../config/branding"
import { BASE_URL } from "../config/envconfig"
import { useBranding } from "./useBranding"

export function useBrandDocumentMeta(): void {
    const { brand } = useBranding()

    useEffect(() => {
        document.title = brand === "weekend" ? "Weekend" : "Volley"
        const oldLink = document.querySelector('link[rel="icon"]')
        if (oldLink && oldLink.parentNode) {
            const newLink = document.createElement("link")
            newLink.rel = "icon"
            newLink.type = "image/png"
            newLink.href = `${BASE_URL}${getAsset("favicon")}`
            oldLink.parentNode.replaceChild(newLink, oldLink)
        }
    }, [brand])
}
