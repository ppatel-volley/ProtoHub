import type {
    ExperimentClient,
    ExperimentUser,
    Variant,
} from "@amplitude/experiment-js-client"
import { Experiment } from "@amplitude/experiment-js-client"
import { Platform } from "@volley/platform-sdk/lib"
import type { UserPropertiesSchema } from "@volley/tracking"
import type { z } from "zod"

import { EXPERIMENT_VARIANT_OVERRIDES } from "../config/devOverrides"
import { AMPLITUDE_EXPERIMENT_KEY } from "../config/envconfig"
import { getCachedPlatform } from "../config/platformDetection"
import { logger } from "../utils/logger"
import {
    BOOLEAN_VALUE_FLAGS,
    BooleanVariantSchema,
    ExperimentFlag,
    OPTIONAL_PAYLOAD_FLAGS,
    PAYLOAD_SCHEMAS,
    type ValidatedExperimentVariants,
} from "./experimentSchemata"

/** Subset of Volley tracking user properties forwarded to Amplitude for experiment targeting. */
export type ExperimentUserProperties = Partial<
    z.infer<typeof UserPropertiesSchema>
>

/**
 * Identity used to assign a user to experiment cohorts.
 * At least one of `anonymousId` (device-level) or `accountId` (user-level) must be present.
 */
export type ExperimentIdentity =
    | {
          anonymousId: string
          accountId?: string
      }
    | {
          anonymousId?: string
          accountId: string
      }

/**
 * Constructs an {@link ExperimentIdentity} from the available IDs.
 * Returns `null` when neither ID is available (e.g. before platform initialization),
 * signaling that experiment initialization should be deferred.
 */
export function createExperimentIdentity(
    anonymousId: string | undefined,
    accountId: string | undefined
): ExperimentIdentity | null {
    if (anonymousId) {
        return { anonymousId, accountId }
    }
    if (accountId) {
        return { accountId, anonymousId }
    }
    return null
}

function getFormattedPlatform():
    | "web"
    | "lg"
    | "samsung"
    | "mobile"
    | "firetv" {
    switch (getCachedPlatform()) {
        case Platform.Web:
            return "web"
        case Platform.LGTV:
            return "lg"
        case Platform.SamsungTV:
            return "samsung"
        case Platform.Mobile:
            return "mobile"
        case Platform.FireTV:
            return "firetv"
    }
}

/**
 * Singleton manager for Amplitude Experiment SDK integration.
 *
 * Lifecycle:
 * 1. `getInstance()` creates the singleton and initializes the Amplitude client
 * 2. `initialize()` is called once platform identity is available — fetches variant assignments
 * 3. `getVariant()` retrieves and validates individual flag values using Zod schemas
 *
 * Variants are validated at read time against schemas defined in `experimentSchemata.ts`.
 * URL parameter overrides (via `devOverrides.ts`) bypass Amplitude entirely for local testing.
 *
 * @see experimentSchemata.ts for flag definitions and payload schemas
 * @see ../config/devOverrides.ts for URL parameter override mechanism
 */
class ExperimentManager {
    private experiment: ExperimentClient | null

    private static instance: ExperimentManager | undefined

    private isInitialized: boolean

    private onInitializedCallbacks: Set<() => void>

    /**
     * Fetches experiment variant assignments from Amplitude for the given identity.
     * No-ops if already initialized or if the Amplitude client failed to construct.
     * Fires all registered `onInitialized` callbacks after a successful fetch.
     *
     * @param identity - Device and/or account identity for cohort assignment
     * @param userProperties - Additional targeting properties (subscription status, platform, device info)
     */
    public async initialize(
        identity: ExperimentIdentity,
        userProperties: ExperimentUserProperties = {}
    ): Promise<void> {
        if (this.isInitialized || !this.experiment) return

        logger.info("Amplitude Experiments - initializing", {
            anonymousId: identity.anonymousId,
            accountId: identity.accountId,
        })

        const processedProperties: Record<
            string,
            string | number | boolean | (string | number | boolean)[]
        > = {}

        for (const [key, value] of Object.entries(userProperties)) {
            if (value === undefined) continue

            if (key === "deviceInfo" && typeof value === "object") {
                processedProperties[key] = JSON.stringify(value)
            } else if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
            ) {
                processedProperties[key] = value
            }
        }

        processedProperties.platform = getFormattedPlatform()

        const user: ExperimentUser = {
            device_id: identity.anonymousId,
            user_id: identity.accountId,
            user_properties: processedProperties,
        }

        logger.info("Amplitude Experiments - fetching variants", {
            userProperties: processedProperties,
        })

        try {
            await this.experiment.fetch(user)
            this.isInitialized = true

            this.logCohortAssignments()

            this.onInitializedCallbacks.forEach((callback) => {
                try {
                    callback()
                } catch (error) {
                    logger.error(
                        "Error in callback while initializing experiment manager, continuing:",
                        error
                    )
                }
            })
        } catch (error) {
            logger.error("Failed to initialize experiment manager", error)
        }
    }

    /**
     * Retrieves and validates a variant for the given experiment flag.
     *
     * Resolution order:
     * 1. URL parameter override (from `EXPERIMENT_VARIANT_OVERRIDES`) — for local dev testing
     * 2. Amplitude SDK variant — the live cohort assignment
     *
     * Validation is performed via Zod schemas defined in `experimentSchemata.ts`:
     * - Boolean flags are validated against `BooleanVariantSchema`
     * - Payload flags are validated against their flag-specific schema
     * - Optional-payload flags may return without a payload
     *
     * @throws Error if called before `initialize()` completes
     * @returns The validated variant, or `undefined` if the flag is not assigned
     */
    public getVariant<T extends ExperimentFlag>(
        flag: T
    ): ValidatedExperimentVariants[T] | undefined {
        if (!this.isInitialized) {
            throw new Error(`Experiment checked before initialization: ${flag}`)
        }

        if (!this.experiment) {
            return undefined
        }

        try {
            const overrideValue = EXPERIMENT_VARIANT_OVERRIDES[flag]
            if (overrideValue) {
                logger.info(
                    `Experiment flag ${flag} overridden via URL param: ${overrideValue}`
                )
                let payload: unknown
                try {
                    payload = JSON.parse(overrideValue)
                } catch {
                    payload = overrideValue
                }
                return this.validateVariant(flag, {
                    value: overrideValue,
                    payload,
                }) as ValidatedExperimentVariants[T]
            }

            const rawVariant = this.experiment.variant(flag)

            if (!rawVariant || !rawVariant.value) {
                logger.warn(
                    `Experiment flag ${flag} not found in Amplitude configuration`
                )
                return undefined
            }

            return this.validateVariant(
                flag,
                rawVariant
            ) as ValidatedExperimentVariants[T]
        } catch (error) {
            logger.error(`Failed to validate variant for flag ${flag}`, error)
            return undefined
        }
    }

    /**
     * Adds a callback to be called when the experiment manager is initialized.
     * If the experiment manager is already initialized, the callback is called immediately.
     * @param callback - The callback to be called when the experiment manager is initialized.
     * @returns A function to remove the callback.
     */
    public onInitialized(callback: () => void): () => void {
        if (!this.isInitialized) {
            this.onInitializedCallbacks.add(callback)
        } else {
            callback()
        }
        return () => {
            this.onInitializedCallbacks.delete(callback)
        }
    }

    /** Whether `initialize()` has completed successfully. */
    public getIsInitialized(): boolean {
        return this.isInitialized
    }

    /** Returns all experiment variants as a record keyed by flag name. Safe to call before initialization (returns empty record). */
    public getAllVariants(): Record<
        ExperimentFlag,
        ValidatedExperimentVariants[ExperimentFlag] | undefined
    > {
        if (!this.isInitialized) {
            return {} as Record<
                ExperimentFlag,
                ValidatedExperimentVariants[ExperimentFlag] | undefined
            >
        }

        const variants: Record<
            ExperimentFlag,
            ValidatedExperimentVariants[ExperimentFlag] | undefined
        > = {} as Record<
            ExperimentFlag,
            ValidatedExperimentVariants[ExperimentFlag] | undefined
        >

        Object.values(ExperimentFlag).forEach((flag) => {
            try {
                variants[flag] = this.getVariant(flag)
            } catch {
                variants[flag] = undefined
            }
        })

        return variants
    }

    private logCohortAssignments(): void {
        if (!this.experiment) return

        const assignments: Record<
            string,
            { value?: string; hasPayload: boolean }
        > = {}

        Object.values(ExperimentFlag).forEach((flag) => {
            try {
                const rawVariant = this.experiment?.variant(flag)
                if (rawVariant && rawVariant.value) {
                    assignments[flag] = {
                        value: rawVariant.value,
                        hasPayload: rawVariant.payload !== undefined,
                    }
                } else {
                    assignments[flag] = { value: undefined, hasPayload: false }
                }
            } catch {
                assignments[flag] = { value: undefined, hasPayload: false }
            }
        })

        logger.info("Amplitude Experiments - cohort assignments", {
            assignments,
        })
    }

    private validateVariant(
        flag: ExperimentFlag,
        variant: Variant
    ): ValidatedExperimentVariants[ExperimentFlag] {
        if (BOOLEAN_VALUE_FLAGS.has(flag)) {
            return {
                value: BooleanVariantSchema.parse(variant.value),
                payload: variant.payload,
            }
        }

        const schema = PAYLOAD_SCHEMAS[flag as keyof typeof PAYLOAD_SCHEMAS]
        if (!schema) {
            return { value: variant.value, payload: variant.payload }
        }

        if (!variant.payload && OPTIONAL_PAYLOAD_FLAGS.has(flag)) {
            return { value: variant.value }
        }

        return { value: variant.value, payload: schema.parse(variant.payload) }
    }

    private constructor() {
        if (!AMPLITUDE_EXPERIMENT_KEY) {
            throw new Error("Amplitude experiment key is not set")
        }
        this.experiment = Experiment.initialize(AMPLITUDE_EXPERIMENT_KEY)
        this.isInitialized = false
        this.onInitializedCallbacks = new Set()
    }

    public static getInstance(): ExperimentManager {
        if (!ExperimentManager.instance) {
            ExperimentManager.instance = new ExperimentManager()
        }
        return ExperimentManager.instance
    }

    public static reset(): void {
        ExperimentManager.instance = undefined
    }
}

/**
 * Returns the singleton instance of the ExperimentManager.
 * @returns ExperimentManager
 */
export const getExperimentManager = (): ExperimentManager =>
    ExperimentManager.getInstance()

/**
 * Resets the singleton instance. Only used for testing.
 * @returns void
 */
export const resetExperimentManager = (): void => ExperimentManager.reset()

export type { ExperimentManager }
