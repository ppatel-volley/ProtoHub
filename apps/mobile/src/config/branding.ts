export type Brand = "volley" | "weekend"

export const BRANDED_ASSETS = {
    logo: {
        volley: "assets/images/branding/volley-logo-image.avif",
        weekend: "assets/images/weekend-text.webp",
    },
    logoPoster: {
        volley: "assets/images/branding/volley-logo-v-poster.avif",
        weekend: "",
    },
    videoIdent: {
        volley: "assets/videos/volley_video_ident_updated_compressed.mp4",
        weekend: "assets/videos/weekend_video_ident_compressed.mp4",
    },
    focusFrame: {
        volley: "assets/images/ui/volley-focus-frame.avif",
        weekend: "assets/images/ui/weekend-focus-frame.png",
    },
    favicon: {
        volley: "volley-favicon.png",
        weekend: "weekend-favicon-48x48.png",
    },
} as const

export const WEEKEND_TRANSITION_LOGO_PATH = "assets/images/weekend-text.webp"

export type AssetKey = keyof typeof BRANDED_ASSETS

export const BRANDED_COPY = {
    logoAlt: {
        volley: "Volley Logo",
        weekend: "Weekend Logo",
    },
    defaultModalHeading: {
        volley: "Connect Volley account\non your phone",
        weekend: "Connect Weekend account\non your phone",
    },
    defaultModalSubtitle: {
        volley: "One step away from playing Song Quiz\nand more Volley games on your TV!",
        weekend:
            "One step away from playing Song Quiz\nand more Weekend games on your TV!",
    },
    jeopardyModalSubtitle: {
        volley: "One step away from playing Jeopardy!, Song Quiz,\nand more Volley games on your TV",
        weekend:
            "One step away from playing Jeopardy!, Song Quiz,\nand more Weekend games on your TV",
    },
    songQuizModalSubtitle: {
        volley: "One step away from playing Song Quiz\nand more Volley games on your TV",
        weekend:
            "One step away from playing Song Quiz\nand more Weekend games on your TV",
    },
    cocomelonModalSubtitle: {
        volley: "One step away from playing CoComelon\nand more Volley games on your TV",
        weekend:
            "One step away from playing CoComelon\nand more Weekend games on your TV",
    },
    wheelOfFortuneModalSubtitle: {
        volley: "One step away from playing Wheel of Fortune\nand more Volley games on your TV",
        weekend:
            "One step away from playing Wheel of Fortune\nand more Weekend games on your TV",
    },
    witsEndModalSubtitle: {
        volley: "One step away from playing Wit's End\nand more Volley games on your TV",
        weekend:
            "One step away from playing Wit's End\nand more Weekend games on your TV",
    },
    errorInstructions: {
        volley: "Please try closing Volley and reopening it. If the issue persists, contact us at",
        weekend:
            "Please try closing Weekend and reopening it. If the issue persists, contact us at",
    },
} as const

export type CopyKey = keyof typeof BRANDED_COPY

/**
 * Compatible with `useSyncExternalStore`. Brand is always weekend so this is a no-op.
 */
export function subscribeToBrand(_listener: () => void): () => void {
    return () => {}
}

export function isWeekendRebrandActive(): boolean {
    return true
}

/**
 * Returns the current active brand.
 */
export function getActiveBrand(): Brand {
    return isWeekendRebrandActive() ? "weekend" : "volley"
}

/**
 * Returns the branded copy for the given key based on the active experiment.
 */
export function getCopy(key: CopyKey): string {
    const brand = getActiveBrand()
    return BRANDED_COPY[key][brand]
}

/**
 * Returns the branded asset path for the given key based on the active experiment.
 */
export function getAsset(key: AssetKey): string {
    const brand = getActiveBrand()
    return BRANDED_ASSETS[key][brand]
}
