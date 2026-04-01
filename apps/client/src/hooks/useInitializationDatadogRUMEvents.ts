import { useEffect, useRef, useState } from "react"

import { isMobile } from "../config/platformDetection"
import { type DurationVitalReference, safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"

interface InitializationStages {
    videoComplete: boolean
    experimentsReady: boolean
    requiredImagesLoaded: boolean
    platformReady: boolean
    isInitialized: boolean
    tileImagesLoaded: boolean
    firstHeroImageLoaded: boolean
    remainingHeroImagesLoaded: boolean
    focusIndicatorLoaded: boolean
    webCheckoutRequiredImagesLoaded: boolean
    statusBannersLoaded: boolean
    tileAnimationsLoaded: boolean
    optionalImagesLoaded: boolean
    qrCodeRendered: boolean
}

interface InitializationContext {
    isWebCheckoutPlatform: boolean
    isSubscribed: boolean | null
}

type InitializationState = InitializationStages & InitializationContext

interface StageConfig {
    name: string
    actionName: string
    logMessage: string
    getContextData?: (state: InitializationState) => Record<string, unknown>
}

interface VitalConfig {
    name: string
    description: string
    startCondition: (state: InitializationState) => boolean
    endCondition: (state: InitializationState) => boolean
    contextFields: (keyof InitializationState)[]
}

interface CompletedStage {
    name: string
    timestamp: number
    contextData?: Record<string, unknown>
}

interface ActiveVital {
    config: VitalConfig
    vitalRef: DurationVitalReference
    startedAt: number
}

const SESSION_KEY = "app_init_tracking_started"
const VITALS_SESSION_KEY_PREFIX = "app_init_vital_"
const STAGE_SESSION_KEY_PREFIX = "app_init_stage_"

/**
 * Helper function to build context from specified state keys
 */
const buildContext = (
    state: InitializationState,
    contextFields: (keyof InitializationState)[]
): Record<string, unknown> => {
    const context: Record<string, unknown> = {}
    contextFields.forEach((fieldKey) => {
        context[fieldKey] = state[fieldKey]
    })
    return context
}

/**
 * Configuration for duration vitals to track.
 * Each vital defines start/end conditions and context data.
 */
const VITAL_CONFIGS: VitalConfig[] = [
    {
        name: "app_initialization",
        description: "Time from app start to fully initialized",
        startCondition: () => true,
        endCondition: (state) => state.isInitialized,
        contextFields: [
            "videoComplete",
            "experimentsReady",
            "requiredImagesLoaded",
            "platformReady",
        ],
    },
    {
        name: "core_ux_availability",
        description:
            "Time from app start to core UX being available (QR code for web checkout or main carousel for others)",
        startCondition: () => true,
        endCondition: (state): boolean => {
            const webCheckoutUpsellPath =
                state.isWebCheckoutPlatform &&
                state.isSubscribed === false &&
                state.qrCodeRendered

            const hubHomePath =
                state.requiredImagesLoaded &&
                state.statusBannersLoaded &&
                state.isInitialized

            if (state.isWebCheckoutPlatform && state.isSubscribed === false) {
                return webCheckoutUpsellPath
            }

            return hubHomePath
        },
        contextFields: [
            "qrCodeRendered",
            "isWebCheckoutPlatform",
            "isSubscribed",
            "requiredImagesLoaded",
            "statusBannersLoaded",
            "isInitialized",
            "videoComplete",
            "experimentsReady",
            "platformReady",
        ],
    },
    {
        name: "asset_loading",
        description: "Time from app start to all assets loaded",
        startCondition: () => true,
        endCondition: (state) =>
            state.isInitialized && state.optionalImagesLoaded,
        contextFields: [
            "isInitialized",
            "requiredImagesLoaded",
            "optionalImagesLoaded",
            "firstHeroImageLoaded",
            "remainingHeroImagesLoaded",
            "tileImagesLoaded",
            "focusIndicatorLoaded",
            "statusBannersLoaded",
            "tileAnimationsLoaded",
            "webCheckoutRequiredImagesLoaded",
        ],
    },
]

/**
 * Configuration for all initialization stages.
 * Each stage defines its tracking behavior and Datadog event names.
 */
const STAGE_CONFIGS: Record<keyof InitializationStages, StageConfig> = {
    videoComplete: {
        name: "video_complete",
        actionName: "app_initialization_video_complete",
        logMessage: "App initialization: video complete",
    },
    experimentsReady: {
        name: "experiments_ready",
        actionName: "app_initialization_experiments_ready",
        logMessage: "App initialization: experiments ready",
    },
    requiredImagesLoaded: {
        name: "images_loaded",
        actionName: "app_initialization_images_loaded",
        logMessage: "App initialization: images loaded",
    },
    platformReady: {
        name: "platform_ready",
        actionName: "app_initialization_platform_ready",
        logMessage: "App initialization: platform ready",
    },
    isInitialized: {
        name: "fully_complete",
        actionName: "app_initialization_fully_complete",
        logMessage: "App initialization: fully complete",
    },
    tileImagesLoaded: {
        name: "tile_images_loaded",
        actionName: "asset_loading_tile_images_loaded",
        logMessage: "Asset loading: tile images loaded",
    },
    firstHeroImageLoaded: {
        name: "asset_loading_first_hero_image",
        actionName: "app_initialization_asset_loading_first_hero_image",
        logMessage: "Asset loading: first hero image",
    },
    remainingHeroImagesLoaded: {
        name: "asset_loading_remaining_hero_images",
        actionName: "app_initialization_asset_loading_remaining_hero_images",
        logMessage: "Asset loading: remaining hero images",
    },
    focusIndicatorLoaded: {
        name: "asset_loading_focus_indicator",
        actionName: "app_initialization_asset_loading_focus_indicator",
        logMessage: "Asset loading: focus indicator",
    },
    webCheckoutRequiredImagesLoaded: {
        name: "asset_loading_web_checkout_required",
        actionName: "app_initialization_asset_loading_web_checkout_required",
        logMessage: "Asset loading: web checkout required images",
    },
    statusBannersLoaded: {
        name: "asset_loading_status_banners",
        actionName: "app_initialization_asset_loading_status_banners",
        logMessage: "Asset loading: status banners",
    },
    tileAnimationsLoaded: {
        name: "asset_loading_tile_animations",
        actionName: "app_initialization_asset_loading_tile_animations",
        logMessage: "Asset loading: tile animations",
    },
    optionalImagesLoaded: {
        name: "asset_loading_all_optional",
        actionName: "app_initialization_asset_loading_all_optional",
        logMessage: "Asset loading: all optional assets",
    },
    qrCodeRendered: {
        name: "qr_code_rendered",
        actionName: "app_initialization_qr_code_rendered",
        logMessage: "App initialization: QR code rendered for web checkout",
    },
}

/**
 * Manages initialization stage tracking independently of React lifecycle.
 * Handles Datadog duration vitals and stage event reporting.
 * Exported for testing purposes.
 */
export class InitializationStageTracker {
    private activeVitals: ActiveVital[] = []

    private allCompletedStages: CompletedStage[] = []

    private readonly completedStages: Set<string> = new Set()

    private isTrackingStarted = false

    /**
     * Initialize tracking system.
     * Only starts tracking once per session on TV platform.
     */
    public startTracking(): void {
        if (
            isMobile() ||
            this.isTrackingStarted ||
            sessionStorage.getItem(SESSION_KEY)
        ) {
            return
        }

        sessionStorage.setItem(SESSION_KEY, "true")
        this.isTrackingStarted = true

        logger.info("App initialization tracking started (session-scoped)")
    }

    /**
     * Evaluate vital start/end conditions and manage active vitals.
     * Should be called whenever state changes.
     */
    public evaluateVitals(state: InitializationState): void {
        if (isMobile() || !this.isTrackingStarted) {
            return
        }

        // Check if any vitals should start
        VITAL_CONFIGS.forEach((config) => {
            const vitalSessionKey = `${VITALS_SESSION_KEY_PREFIX}${config.name}`
            const isAlreadyTrackedInSession =
                sessionStorage.getItem(vitalSessionKey)
            const isAlreadyActive = this.activeVitals.some(
                (active) => active.config.name === config.name
            )

            if (
                !isAlreadyTrackedInSession &&
                !isAlreadyActive &&
                config.startCondition(state)
            ) {
                sessionStorage.setItem(vitalSessionKey, "started")

                const context = buildContext(state, config.contextFields)

                safeDatadogRum.addAction(`${config.name}_started`, context)
                safeDatadogRum.addTiming(`${config.name}_started`)

                const vitalRef = safeDatadogRum.startDurationVital(
                    config.name,
                    {
                        description: config.description,
                    }
                )

                if (vitalRef) {
                    this.activeVitals.push({
                        config,
                        vitalRef,
                        startedAt: Date.now(),
                    })
                }

                logger.info(`Started vital: ${config.name}`)
            }
        })

        // Check if any active vitals should end
        this.activeVitals = this.activeVitals.filter((activeVital) => {
            if (activeVital.config.endCondition(state)) {
                const context = buildContext(
                    state,
                    activeVital.config.contextFields
                )

                safeDatadogRum.addAction(
                    `${activeVital.config.name}_completed`,
                    context
                )
                safeDatadogRum.addTiming(`${activeVital.config.name}_completed`)

                safeDatadogRum.stopDurationVital(activeVital.vitalRef, {
                    description: `${activeVital.config.description} - completed`,
                    context,
                })

                logger.info(`Completed vital: ${activeVital.config.name}`)
                return false
            }
            return true
        })
    }

    /**
     * Record completion of a specific stage.
     * @param stageName - Name of the completed stage
     * @param contextData - Additional context data for the stage
     */
    public trackStage(
        stageName: string,
        contextData?: Record<string, unknown>
    ): void {
        const stageSessionKey = `${STAGE_SESSION_KEY_PREFIX}${stageName}`

        if (
            isMobile() ||
            this.completedStages.has(stageName) ||
            sessionStorage.getItem(stageSessionKey)
        ) {
            return
        }

        sessionStorage.setItem(stageSessionKey, "completed")
        this.completedStages.add(stageName)
        const timestamp = Date.now()

        const completedStage: CompletedStage = {
            name: stageName,
            timestamp,
            contextData,
        }
        this.allCompletedStages.push(completedStage)

        const stageConfig = Object.values(STAGE_CONFIGS).find(
            (config) => config.name === stageName
        )
        if (stageConfig) {
            safeDatadogRum.addAction(stageConfig.actionName, {
                stage: stageName,
                ...contextData,
            })
            safeDatadogRum.addTiming(stageConfig.actionName)
            logger.info(stageConfig.logMessage)
        }
    }

    /**
     * Get currently active vitals for debugging.
     * @returns Array of active vital configurations
     */
    public getActiveVitals(): VitalConfig[] {
        return this.activeVitals.map((active) => active.config)
    }

    /**
     * Get all completed stages for debugging and testing.
     * @returns Array of completed stages with timestamps
     */
    public getCompletedStages(): CompletedStage[] {
        return [...this.allCompletedStages]
    }

    /**
     * Reset the tracker state. Used primarily for testing.
     */
    public reset(): void {
        this.activeVitals = []
        this.completedStages.clear()
        this.allCompletedStages = []
        this.isTrackingStarted = false

        sessionStorage.removeItem(SESSION_KEY)

        VITAL_CONFIGS.forEach((config) => {
            sessionStorage.removeItem(
                `${VITALS_SESSION_KEY_PREFIX}${config.name}`
            )
        })

        Object.values(STAGE_CONFIGS).forEach((config) => {
            sessionStorage.removeItem(
                `${STAGE_SESSION_KEY_PREFIX}${config.name}`
            )
        })
    }
}

/**
 * Custom hook to track app initialization with Datadog RUM events.
 *
 * This hook provides a comprehensive interface for tracking initialization progress through
 * configurable stages, including both individual stage completion events and duration vitals.
 * It uses React state management internally while delegating Datadog interactions to the
 * InitializationStageTracker class.
 *
 * Features:
 * - Individual stage completion tracking with Datadog actions
 * - Duration vital measurement from app start to completion
 * - Asset loading telemetry for performance analysis
 * - Session-scoped tracking with sessionStorage guards to prevent duplicate events
 *
 * Only tracks on TV platform (not mobile). Uses comprehensive session-scoped guards to ensure
 * each RUM event, vital, and stage is tracked exactly once per session, even if the component
 * remounts or multiple instances are created.
 *
 * @param state - Object containing boolean flags for each initialization stage and context
 *
 * ## Adding a New Stage
 *
 * To add a new initialization stage:
 *
 * 1. Add the stage property to the `InitializationStages` interface
 * 2. Add stage configuration to `STAGE_CONFIGS` with:
 *    - `name`: Internal stage identifier
 *    - `actionName`: Datadog action name (prefix with "app_initialization_")
 *    - `logMessage`: Log message for completion
 *    - `getContextData`: Optional function to provide additional context
 * 3. Pass the new stage boolean in the stages object when calling the hook
 * 4. Add the stage to the useEffect dependency array
 *
 * ## Adding a New Duration Vital
 *
 * To track a new duration vital (start-to-end measurement):
 *
 * 1. Add a new `VitalConfig` to the `VITAL_CONFIGS` array with:
 *    - `name`: Unique vital name for Datadog
 *    - `description`: Human-readable description
 *    - `startCondition`: Function that returns true when vital should start
 *    - `endCondition`: Function that returns true when vital should end
 *    - `getContext`: Optional function to provide context when vital completes
 *
 * Example:
 * ```typescript
 * // Add to VITAL_CONFIGS array
 * {
 *   name: "video_to_ready",
 *   description: "Time from video complete to fully ready",
 *   startCondition: (stages) => stages.videoComplete,
 *   endCondition: (stages) => stages.isInitialized,
 *   getContext: (stages) => ({
 *     experimentsReady: stages.experimentsReady,
 *     platformReady: stages.platformReady
 *   })
 * }
 * ```
 */
export const useInitializationDatadogRUMEvents = (
    state: InitializationState
): void => {
    const mountedRef = useRef(false)
    const [tracker] = useState(() => new InitializationStageTracker())
    const [completedStageNames] = useState(() => new Set<string>())

    useEffect(() => {
        tracker.startTracking()
        mountedRef.current = true

        return (): void => {
            mountedRef.current = false
        }
    }, [tracker])

    useEffect(() => {
        if (!mountedRef.current) return

        Object.entries(STAGE_CONFIGS).forEach(([stageKey, config]) => {
            const typedStageKey = stageKey as keyof typeof STAGE_CONFIGS
            const isStageComplete = state[typedStageKey]

            if (isStageComplete && !completedStageNames.has(typedStageKey)) {
                completedStageNames.add(typedStageKey)

                const contextData = config.getContextData?.(state)
                tracker.trackStage(config.name, contextData)
            }
        })

        tracker.evaluateVitals(state)
    }, [tracker, completedStageNames, state])
}
