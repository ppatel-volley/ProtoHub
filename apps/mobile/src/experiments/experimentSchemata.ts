import { z } from "zod"

import { GameId, GameStatus, PaywallType } from "../constants"

/**
 * Amplitude Experiment flag keys. Values must match the keys defined in the Amplitude Experiment dashboard.
 * To add a new flag: add an enum member here, then add validation in PAYLOAD_SCHEMAS, BOOLEAN_VALUE_FLAGS,
 * or OPTIONAL_PAYLOAD_FLAGS as needed.
 */
export enum ExperimentFlag {
    ReorderMpTiles = "reorder-mp-tiles",
    SuppressImmediateUpsell = "suppress-immediate-upsell",
    JeopardyPayloadSwap = "jeopardy-payload-swap",
    SongQuizPayloadSwap = "song-quiz-payload-swap",
    CoComelonPayloadSwap = "cocomelon-payload-swap",
    WheelOfFortunePayloadSwap = "wheel-of-fortune-payload-swap",
    WitsEndPayloadSwap = "wits-end-payload-swap",
    JeopardyReloadThreshold = "jeopardy-reload-threshold",
    QrModalConfig = "qr-modal-config",
    WeekendRebrand = "weekend-rebrand",
    WeekendRebrandInformationalModal = "weekend-rebrand-informational-modal",
}

/**
 * Validates experiment payloads that define an ordered list of game IDs (e.g. multiplayer tile order).
 */
export const GameOrderSchema = z.array(z.nativeEnum(GameId))

/**
 * Universal sentinel value for explicitly disabling optional game properties.
 * Use this instead of false/null/undefined for clarity in Amplitude payloads.
 *
 * Examples:
 * - { status: "none" } - Explicitly remove the status badge
 * - { videoUrl: "none" } - Explicitly disable the video
 * - { animationUri: "none" } - Explicitly disable the animation
 * - { paywallType: "none" } - Explicitly disable the paywall
 *
 * For backwards compatibility, `false` is still accepted but deprecated.
 */
export const PAYLOAD_NONE_VALUE = "none" as const

/**
 * Validates experiment payloads that override game tile content (images, video, status, paywall type).
 */
export const GamePayloadSchema = z.object({
    id: z.nativeEnum(GameId).optional(),
    title: z.string().optional(),
    tileImageUrl: z.string().optional(),
    heroImageUrl: z.string().optional(),
    videoUrl: z
        .union([z.string(), z.literal(PAYLOAD_NONE_VALUE), z.literal(false)])
        .optional(),
    animationUri: z
        .union([z.string(), z.literal(PAYLOAD_NONE_VALUE), z.literal(false)])
        .optional(),
    status: z
        .union([
            z.nativeEnum(GameStatus),
            z.literal(PAYLOAD_NONE_VALUE),
            z.literal(false),
        ])
        .optional(),
    paywallType: z.nativeEnum(PaywallType).optional(),
})

export const BooleanVariantSchema = z.union([
    z.literal("true"),
    z.literal("false"),
    z.literal("on"),
    z.literal("off"),
    z.literal(""),
    z.undefined(),
])

export const JeopardyReloadThresholdSchema = z.object({
    launchesBeforeReload: z.number().positive(),
})

export const QrModalConfigContentSchema = z.object({
    videoIntro: z.string().optional(),
    videoLooping: z.string().optional(),
    videoUrl: z.string().optional(),
    loopStart: z.number().optional(),
    loopEnd: z.number().optional(),
    mainHeading: z.string().optional(),
    subtitle: z.string().optional(),
    posterSrc: z.string().optional(),
    backgroundImage: z.string().optional(),
})

export const QrModalConfigSchema = z.record(
    z.union([z.literal("immediate-upsell"), z.nativeEnum(GameId)]),
    QrModalConfigContentSchema.optional()
)

export const HubModalDisplaySchema = z.object({
    startEpochMs: z.number().optional(),
    endEpochMs: z.number().optional(),
    showAgain: z.boolean().optional(),
})

export const WeekendRebrandPayloadSchema = z.object({
    "hub-modal-display": HubModalDisplaySchema.optional(),
})

export type ValidatedVariant<TPayload = unknown> = {
    value?: string
    payload?: TPayload
}

export type ValidatedGameOrderVariant = ValidatedVariant<GameId[]>

/**
 * Maps each payload-bearing experiment flag to its Zod schema. Used by ExperimentManager to parse and
 * validate raw Amplitude variant payloads before returning them to callers.
 */
export const PAYLOAD_SCHEMAS = {
    [ExperimentFlag.ReorderMpTiles]: GameOrderSchema,
    [ExperimentFlag.JeopardyPayloadSwap]: GamePayloadSchema,
    [ExperimentFlag.SongQuizPayloadSwap]: GamePayloadSchema,
    [ExperimentFlag.CoComelonPayloadSwap]: GamePayloadSchema,
    [ExperimentFlag.WheelOfFortunePayloadSwap]: GamePayloadSchema,
    [ExperimentFlag.WitsEndPayloadSwap]: GamePayloadSchema,
    [ExperimentFlag.JeopardyReloadThreshold]: JeopardyReloadThresholdSchema,
    [ExperimentFlag.QrModalConfig]: QrModalConfigSchema,
    [ExperimentFlag.WeekendRebrand]: WeekendRebrandPayloadSchema,
    [ExperimentFlag.WeekendRebrandInformationalModal]:
        WeekendRebrandPayloadSchema,
} as const

/**
 * Flags whose variant value is a boolean string ("true"/"false"/"on"/"off"). Value is parsed via BooleanVariantSchema
 * rather than a payload schema.
 */
export const BOOLEAN_VALUE_FLAGS: ReadonlySet<ExperimentFlag> = new Set([
    ExperimentFlag.SuppressImmediateUpsell,
])

/**
 * Flags that may return a variant with no payload. Variant is accepted as valid even when payload is missing.
 */
export const OPTIONAL_PAYLOAD_FLAGS: ReadonlySet<ExperimentFlag> = new Set([
    ExperimentFlag.WeekendRebrand,
    ExperimentFlag.WeekendRebrandInformationalModal,
])

type PayloadSchemaFlag = keyof typeof PAYLOAD_SCHEMAS

/**
 * Typed output of ExperimentManager.getVariant(). Maps each ExperimentFlag to its validated variant shape
 * (value + optional payload) as defined by PAYLOAD_SCHEMAS or BooleanVariantSchema.
 */
export type ValidatedExperimentVariants = {
    [F in ExperimentFlag]: F extends PayloadSchemaFlag
        ? ValidatedVariant<z.infer<(typeof PAYLOAD_SCHEMAS)[F]>>
        : ValidatedVariant
}
