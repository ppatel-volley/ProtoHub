export const getManualChunk = (id: string): string | undefined => {
    if (id.includes("node_modules")) {
        const parts = id.split("node_modules/")
        const lastPart = parts[parts.length - 1]

        if (!lastPart) {
            return "vendor"
        }

        const packageName = lastPart.startsWith("@")
            ? lastPart.split("/").slice(0, 2).join("/")
            : lastPart.split("/")[0]

        if (!packageName) {
            return "vendor"
        }

        if (
            packageName === "react" ||
            packageName === "react-dom" ||
            packageName === "scheduler"
        ) {
            return "react"
        }

        if (packageName === "@volley/platform-sdk") {
            return "volley"
        }

        if (packageName === "@volley/tracking") {
            return "tracking"
        }
        if (packageName.startsWith("@datadog")) {
            return "datadog"
        }
        if (packageName.startsWith("@amplitude")) {
            return "analytics"
        }

        if (
            packageName.startsWith("@rive-app") ||
            packageName.startsWith("rive-")
        ) {
            return "rive"
        }
        if (packageName.includes("lottie")) {
            return "lottie"
        }
        if (packageName.includes("motion") || packageName === "framer-motion") {
            return "motion"
        }

        if (packageName === "howler") {
            return "audio"
        }

        return "vendor"
    }

    if (id.includes("components/App.")) {
        return "app"
    }
    if (id.includes("TvHub/TvHub")) {
        return "tvhub"
    }
    if (id.includes("MobileHub/MobileHub")) {
        return "mobilehub"
    }
    if (id.includes("AppDownloadLanding/")) {
        return "appdownload"
    }

    return undefined
}
