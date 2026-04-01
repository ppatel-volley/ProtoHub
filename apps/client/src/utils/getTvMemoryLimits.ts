// Fire TV memory limits based on device models
export const FIRE_TV_MEMORY_LIMITS = {
    // Fire TV Stick HD (1GB total RAM) → ~512MB for WebView
    STICK_HD: {
        total: 536870912, // 512 MiB in bytes
        warning: 429496730, // 80%
        critical: 483183821, // 90%
    },
    // Fire TV Stick 4K/Max & Cube (2GB total RAM) → ~1GB for WebView
    STICK_4K: {
        total: 1073741824, // 1024 MiB in bytes
        warning: 858993459, // 80%
        critical: 966367642, // 90%
    },
}

interface MemoryLimits {
    device: string
    warning: number
    critical: number
    total: number
}

/**
 * Get appropriate memory limits based on device model and JS heap limit
 */
export const getTvMemoryLimits = (
    deviceModel: string | null,
    jsHeapLimit: number
): MemoryLimits => {
    if (deviceModel) {
        const model = deviceModel.toLowerCase()

        // Fire TV Stick HD models (1GB RAM)
        if (
            model.includes("stick") &&
            (model.includes("hd") || model.includes("basic"))
        ) {
            return {
                device: `Fire TV Stick HD (${deviceModel})`,
                warning: FIRE_TV_MEMORY_LIMITS.STICK_HD.warning,
                critical: FIRE_TV_MEMORY_LIMITS.STICK_HD.critical,
                total: FIRE_TV_MEMORY_LIMITS.STICK_HD.total,
            }
        }

        // Fire TV Stick 4K/Max models (2GB RAM)
        if (
            model.includes("stick") &&
            (model.includes("4k") || model.includes("max"))
        ) {
            return {
                device: `Fire TV Stick 4K/Max (${deviceModel})`,
                warning: FIRE_TV_MEMORY_LIMITS.STICK_4K.warning,
                critical: FIRE_TV_MEMORY_LIMITS.STICK_4K.critical,
                total: FIRE_TV_MEMORY_LIMITS.STICK_4K.total,
            }
        }

        // Fire TV Cube models (2GB RAM)
        if (model.includes("cube")) {
            return {
                device: `Fire TV Cube (${deviceModel})`,
                warning: FIRE_TV_MEMORY_LIMITS.STICK_4K.warning,
                critical: FIRE_TV_MEMORY_LIMITS.STICK_4K.critical,
                total: FIRE_TV_MEMORY_LIMITS.STICK_4K.total,
            }
        }

        // Generic Fire TV (fallback to memory-based detection)
        if (model.includes("fire") || model.includes("amazon")) {
            return {
                device: `Fire TV (${deviceModel})`,
                warning: FIRE_TV_MEMORY_LIMITS.STICK_HD.warning,
                critical: FIRE_TV_MEMORY_LIMITS.STICK_HD.critical,
                total: FIRE_TV_MEMORY_LIMITS.STICK_HD.total,
            }
        }
    }

    // TODO handle samsung and LG
    // Fallback to JS heap-based detection for non-Fire TV devices
    return {
        device: "Unknown",
        warning: Math.round(jsHeapLimit * 0.8),
        critical: Math.round(jsHeapLimit * 0.9),
        total: jsHeapLimit,
    }
}
