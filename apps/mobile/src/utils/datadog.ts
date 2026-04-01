/**
 * Configures Datadog RUM (Real User Monitoring), Logs, error filtering, and logger forwarding.
 * Patches the platform logger so info/warn/error are sent to Datadog Logs.
 */
import type { LogsEvent, LogsEventDomainContext } from "@datadog/browser-logs"
import { datadogLogs } from "@datadog/browser-logs"
import type { RumEvent, RumEventDomainContext } from "@datadog/browser-rum"
import { datadogRum } from "@datadog/browser-rum"

import {
    DATADOG_APPLICATION_ID,
    DATADOG_CLIENT_TOKEN,
    ENVIRONMENT,
} from "../config/envconfig"
import { getCachedPlatform } from "../config/platformDetection"
import { coerceToError } from "./errorUtils"
import { logger as platformLogger } from "./logger"

const SERVICE_NAME = "mobile-client"
const ENV = ENVIRONMENT || "local"
const VERSION = __APP_VERSION__

/** Opaque reference returned by `startDurationVital`, passed to `stopDurationVital` to complete the measurement. */
export type DurationVitalReference = {
    __dd_vital_reference: true
}

/** Options for duration vital tracking. `context` is attached as custom attributes in Datadog. */
export type DurationVitalOptions = {
    context?: object
    description?: string
}

// matches to stack traces including the following pattern:
// https://game-clients.volley.tv/X/Y/Z
// https://game-clients-staging.volley.tv/X/Y/Z
// https://game-clients-dev.volley.tv/X/Y/Z
// where X != "hub"
const IGNORE_STACK_REGEX =
    /https?:\/\/(?:game-clients(?:-staging|-dev)?\.volley\.tv)\/(?!hub\/)[^/]+\/.*/

const platform = getCachedPlatform()

/**
 * Checks if the current session is a functional test.
 * Used to suppress error reporting to DD during automated testing on staging.
 */
const isFunctionalTest = (): boolean => {
    if (typeof window === "undefined") return false
    return window.__TEST_PLATFORM_OVERRIDES?.isFunctionalTest === true
}

/**
 * Extracts a stable text message from a possibly JSON-stringified console payload.
 * Removes volatile fields like time by preferring msg/message keys when present.
 */
function sanitizeJsonMessage(raw: unknown): string {
    if (typeof raw !== "string") return String(raw)
    const trimmed = raw.trim()
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return raw
    try {
        const parsed = JSON.parse(trimmed) as {
            msg?: unknown
            message?: unknown
            time?: unknown
        }
        const candidate =
            typeof parsed.msg === "string"
                ? parsed.msg
                : typeof parsed.message === "string"
                  ? parsed.message
                  : raw
        return candidate
    } catch {
        return raw
    }
}

/**
 * Common filtering logic for both RUM and logs beforeSend handlers
 * Filters out errors from non-hub game clients, segment.io fetch failures,
 * and all errors during functional test sessions
 */
const shouldFilterEvent = (
    error: { stack?: string; message?: string } | undefined,
    url?: string
): boolean => {
    if (isFunctionalTest()) {
        console.log(
            "[DD] Suppressing error in functional test mode:",
            error?.message
        )
        return true
    }
    if (!error) return false

    // Filter out errors from non-hub game clients
    if (error.stack && IGNORE_STACK_REGEX.test(error.stack)) {
        return true
    }

    // Filter out Fetch HEAD errors
    if (error.message && error.message.includes("Fetch error HEAD")) {
        platformLogger.warn("Filtering out Fetch error HEAD:", {
            originalErrorMessage: error.message,
            url,
        })
        return true
    }

    // Segment.io errors are non-critical and have no impact on UX
    if (
        error.message?.toLowerCase().includes("segment.io") ||
        url?.includes("segment.io")
    ) {
        return true
    }

    // Abort/platform unavailable errors
    if (error.message) {
        const msg = error.message.toLowerCase()
        if (
            msg.includes("user aborted a request") ||
            msg.includes("aborted without reason") ||
            msg.includes("signal is aborted") ||
            msg.includes("java object is gone")
        ) {
            return true
        }
    }

    return false
}

datadogRum.init({
    applicationId: DATADOG_APPLICATION_ID,
    clientToken: DATADOG_CLIENT_TOKEN,
    site: "datadoghq.com",
    service: SERVICE_NAME,
    env: ENV,
    version: VERSION,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
    allowedTracingUrls: [
        /^https?:\/\/.*\.volley\.tv\//,
        /^https?:\/\/.*\.volley-services\.net\//,
    ],
    beforeSend: (event: RumEvent, _context: RumEventDomainContext) => {
        if (event.type === "error") {
            if (event.error && typeof event.error.message === "string") {
                event.error.message = sanitizeJsonMessage(event.error.message)
            }
            return !shouldFilterEvent(event.error, event.error?.resource?.url)
        }
        return true
    },
})

datadogRum.setGlobalContextProperty("platform", platform)

datadogLogs.init({
    clientToken: DATADOG_CLIENT_TOKEN,
    site: "datadoghq.com",
    service: SERVICE_NAME,
    env: ENV,
    version: VERSION,
    forwardErrorsToLogs: true,
    beforeSend: (event: LogsEvent, _context: LogsEventDomainContext) => {
        if (typeof event.message === "string") {
            event.message = sanitizeJsonMessage(event.message)
        }
        if (event.type === "error") {
            if (event.error && typeof event.error.message === "string") {
                event.error.message = sanitizeJsonMessage(event.error.message)
            }
            return !shouldFilterEvent(event.error, event.http?.url)
        }
        return true
    },
})

datadogLogs.setGlobalContextProperty("platform", platform)

const originalError = platformLogger.error.bind(platformLogger)
const originalWarn = platformLogger.warn.bind(platformLogger)
const originalInfo = platformLogger.info.bind(platformLogger)

type LogArgs = (object | undefined)[]

platformLogger.info = (message: string, ...args: LogArgs): void => {
    originalInfo(message, ...args)
    datadogLogs.logger.info(message, { additionalArgs: args })
}

platformLogger.error = (
    message: string,
    error?: unknown,
    ...args: LogArgs
): void => {
    originalError(message, ...args)
    datadogLogs.logger.error(
        message,
        { additionalArgs: args },
        error !== undefined ? coerceToError(error) : undefined
    )
}

platformLogger.warn = (message: string, ...args: LogArgs): void => {
    originalWarn(message, ...args)
    datadogLogs.logger.warn(message, { additionalArgs: args })
}

type LogContext = Record<string, string | number | boolean | null | undefined>

/**
 * Sets global context properties on Datadog logs. These properties are attached to
 * every subsequent log event. Use for session-level context like user ID, platform, etc.
 */
export const addCustomContext = (context: LogContext): void => {
    datadogLogs.setGlobalContext(context)
}

/**
 * Logs a user action as an info-level event in Datadog. Used for tracking significant
 * user interactions (game launches, upsell decisions, navigation) outside of Segment tracking.
 */
export const logUserAction = (action: string, context?: LogContext): void => {
    datadogLogs.logger.info("User action", {
        action,
        ...(context ?? {}),
    })
}

/**
 * Safe wrapper around Datadog RUM SDK methods. Catches and logs errors that can occur
 * when the RUM SDK fails due to postMessage errors in iframe contexts or platform SDK
 * conflicts. All methods are no-ops on failure rather than throwing.
 */
export const safeDatadogRum = {
    setUser: (newUser: { id: string }): void => {
        try {
            datadogRum.setUser(newUser)
        } catch (error) {
            platformLogger.warn("Failed to set DataDog user:", error as Error)
        }
    },

    startDurationVital: (
        name: string,
        options?: DurationVitalOptions
    ): DurationVitalReference | null => {
        try {
            return datadogRum.startDurationVital(name, options)
        } catch (error) {
            platformLogger.warn(
                `Failed to start DataDog vital ${name}:`,
                error as Error
            )
            return null
        }
    },

    stopDurationVital: (
        vital: string | DurationVitalReference | null,
        options?: DurationVitalOptions
    ): void => {
        try {
            if (vital !== null) {
                datadogRum.stopDurationVital(vital, options)
            }
        } catch (error) {
            platformLogger.warn("Failed to stop DataDog vital:", error as Error)
        }
    },

    addAction: (name: string, context?: object): void => {
        try {
            datadogRum.addAction(name, context)
        } catch (error) {
            platformLogger.warn(
                `Failed to add DataDog action ${name}:`,
                error as Error
            )
        }
    },

    addError: (error: Error, context?: object): void => {
        try {
            datadogRum.addError(error, context)
        } catch (err) {
            platformLogger.warn("Failed to add DataDog error:", err as Error)
        }
    },

    addTiming: (name: string, time?: number): void => {
        try {
            datadogRum.addTiming(name, time)
        } catch (error) {
            platformLogger.warn(
                `Failed to add DataDog timing ${name}:`,
                error as Error
            )
        }
    },
}

export { coerceToError } from "./errorUtils"
export { datadogRum }
